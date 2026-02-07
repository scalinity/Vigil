// Vigil Review API Endpoint — Spec 10
// POST: Submit AI response for safety review
// GET: Retrieve audit records

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { reviewResponse } from "../_shared/pipeline.ts";
import {
  getAuditRecord,
  getSessionAuditRecords,
} from "../_shared/audit-logger.ts";
import type { VigilReviewRequest } from "../_shared/types.ts";

// CORS: Use environment allowlist in production, wildcard for hackathon demo.
const ALLOWED_ORIGINS = Deno.env.get("VIGIL_ALLOWED_ORIGINS")?.split(",") ?? [];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  // If allowlist is configured, enforce it; otherwise fall back to wildcard for demo
  const allowedOrigin =
    ALLOWED_ORIGINS.length > 0
      ? ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]
      : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

const SAFE_FALLBACK =
  "I want to make sure I respond to you thoughtfully. Could you tell me more about what's on your mind?";

// Demo mode: when true, GET endpoints don't require auth (for hackathon demo only)
const DEMO_MODE = Deno.env.get("VIGIL_DEMO_MODE") === "true";

function jsonResponse(
  data: unknown,
  headers: Record<string, string>,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function errorResponse(
  error: string,
  code: string,
  status: number,
  headers: Record<string, string>,
  fallbackResponse?: string,
): Response {
  const body: Record<string, string> = { error, code };
  if (fallbackResponse) {
    body.fallback_response = fallbackResponse;
  }
  return jsonResponse(body, headers, status);
}

function validateReviewRequest(
  body: unknown,
):
  | { valid: true; request: VigilReviewRequest }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (
    typeof b.user_message !== "string" ||
    b.user_message.trim().length === 0
  ) {
    return {
      valid: false,
      error: "user_message is required and must be a non-empty string",
    };
  }

  if (typeof b.ai_response !== "string" || b.ai_response.trim().length === 0) {
    return {
      valid: false,
      error: "ai_response is required and must be a non-empty string",
    };
  }

  if (!Array.isArray(b.conversation_history)) {
    return {
      valid: false,
      error: "conversation_history is required and must be an array",
    };
  }

  if ((b.conversation_history as unknown[]).length > 100) {
    return {
      valid: false,
      error: "conversation_history exceeds 100 message limit",
    };
  }

  if (typeof b.session_id !== "string" || b.session_id.trim().length === 0) {
    return {
      valid: false,
      error: "session_id is required and must be a non-empty string",
    };
  }

  // session_id max length to prevent storage abuse
  if ((b.session_id as string).length > 255) {
    return {
      valid: false,
      error: "session_id exceeds 255 character limit",
    };
  }

  // Input size limits to prevent resource exhaustion
  if ((b.user_message as string).length > 10_000) {
    return {
      valid: false,
      error: "user_message exceeds 10,000 character limit",
    };
  }
  if ((b.ai_response as string).length > 20_000) {
    return {
      valid: false,
      error: "ai_response exceeds 20,000 character limit",
    };
  }

  // Validate each conversation history message
  for (const msg of b.conversation_history as Array<Record<string, unknown>>) {
    if (
      typeof msg.role !== "string" ||
      !["user", "assistant"].includes(msg.role)
    ) {
      return {
        valid: false,
        error:
          "conversation_history items must have role 'user' or 'assistant'",
      };
    }
    if (typeof msg.content !== "string") {
      return {
        valid: false,
        error: "conversation_history items must have string content",
      };
    }
    if (msg.content.length > 10_000) {
      return {
        valid: false,
        error: "conversation_history message exceeds 10,000 character limit",
      };
    }
    // Timestamp is required per ConversationMessage interface
    if (typeof msg.timestamp !== "string") {
      return {
        valid: false,
        error: "conversation_history items must have a timestamp string",
      };
    }
    if (isNaN(Date.parse(msg.timestamp as string))) {
      return {
        valid: false,
        error:
          "conversation_history timestamp must be a valid ISO-8601 date string",
      };
    }
  }

  return {
    valid: true,
    request: {
      user_message: b.user_message as string,
      ai_response: b.ai_response as string,
      conversation_history:
        b.conversation_history as VigilReviewRequest["conversation_history"],
      session_id: b.session_id as string,
      skip_triage: b.skip_triage === true,
    },
  };
}

/**
 * Validates the Authorization header for GET requests.
 * In DEMO_MODE, authorization is not required.
 * In production, requires a valid Supabase auth token or service role key.
 */
function validateGetAuth(req: Request): {
  authorized: boolean;
  error?: string;
} {
  if (DEMO_MODE) {
    return { authorized: true };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { authorized: false, error: "Authorization header required" };
  }

  // Accept service role key via apikey header (used by internal services)
  const apikey = req.headers.get("apikey");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (apikey && serviceRoleKey && apikey === serviceRoleKey) {
    return { authorized: true };
  }

  // Accept Bearer token (for authenticated users)
  if (authHeader.startsWith("Bearer ")) {
    // In a full implementation, validate the JWT here.
    // For now, require the header to be present as a minimum gate.
    return { authorized: true };
  }

  return { authorized: false, error: "Invalid authorization" };
}

serve(async (req: Request) => {
  const cors = corsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = new URL(req.url);

    // ============================================================
    // GET: Retrieve audit records
    // ============================================================
    if (req.method === "GET") {
      // Auth check — audit records contain sensitive therapy conversations
      const auth = validateGetAuth(req);
      if (!auth.authorized) {
        return errorResponse(
          auth.error ?? "Unauthorized",
          "UNAUTHORIZED",
          401,
          cors,
        );
      }

      const id = url.searchParams.get("id");
      const sessionId = url.searchParams.get("session_id");

      if (id) {
        const record = await getAuditRecord(id);
        if (!record) {
          return errorResponse(
            "Audit record not found",
            "NOT_FOUND",
            404,
            cors,
          );
        }
        return jsonResponse(record, cors);
      }

      if (sessionId) {
        if (sessionId.length > 255) {
          return errorResponse(
            "session_id exceeds 255 character limit",
            "INVALID_REQUEST",
            400,
            cors,
          );
        }
        const records = await getSessionAuditRecords(sessionId);
        return jsonResponse(records, cors);
      }

      return errorResponse(
        "Query parameter 'id' or 'session_id' is required",
        "INVALID_REQUEST",
        400,
        cors,
      );
    }

    // ============================================================
    // POST: Submit for review
    // ============================================================
    if (req.method === "POST") {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return errorResponse(
          "Invalid JSON in request body",
          "INVALID_REQUEST",
          400,
          cors,
        );
      }

      const validation = validateReviewRequest(body);
      if (!validation.valid) {
        return errorResponse(validation.error, "INVALID_REQUEST", 400, cors);
      }

      try {
        const result = await reviewResponse(validation.request);
        return jsonResponse(result, cors);
      } catch (pipelineError) {
        // Log error type only — do NOT log user content
        console.error(
          "[api] Pipeline error:",
          pipelineError instanceof Error
            ? pipelineError.message
            : "Unknown error",
        );
        return errorResponse(
          "Internal pipeline error",
          "PIPELINE_ERROR",
          500,
          cors,
          SAFE_FALLBACK,
        );
      }
    }

    return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405, cors);
  } catch (error) {
    console.error(
      "[api] Unhandled error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return errorResponse(
      "Internal server error",
      "PIPELINE_ERROR",
      500,
      corsHeaders(req),
      SAFE_FALLBACK,
    );
  }
});
