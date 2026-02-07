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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SAFE_FALLBACK =
  "I want to make sure I respond to you thoughtfully. Could you tell me more about what's on your mind?";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(
  error: string,
  code: string,
  status: number,
  fallbackResponse?: string,
): Response {
  const body: Record<string, string> = { error, code };
  if (fallbackResponse) {
    body.fallback_response = fallbackResponse;
  }
  return jsonResponse(body, status);
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

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);

    // ============================================================
    // GET: Retrieve audit records
    // ============================================================
    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      const sessionId = url.searchParams.get("session_id");

      if (id) {
        const record = await getAuditRecord(id);
        if (!record) {
          return errorResponse("Audit record not found", "NOT_FOUND", 404);
        }
        return jsonResponse(record);
      }

      if (sessionId) {
        const records = await getSessionAuditRecords(sessionId);
        return jsonResponse(records);
      }

      return errorResponse(
        "Query parameter 'id' or 'session_id' is required",
        "INVALID_REQUEST",
        400,
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
        );
      }

      const validation = validateReviewRequest(body);
      if (!validation.valid) {
        return errorResponse(validation.error, "INVALID_REQUEST", 400);
      }

      try {
        const result = await reviewResponse(validation.request);
        return jsonResponse(result);
      } catch (pipelineError) {
        console.error("[api] Pipeline error:", pipelineError);
        return errorResponse(
          "Internal pipeline error",
          "PIPELINE_ERROR",
          500,
          SAFE_FALLBACK,
        );
      }
    }

    return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  } catch (error) {
    console.error("[api] Unhandled error:", error);
    return errorResponse(
      "Internal server error",
      "PIPELINE_ERROR",
      500,
      SAFE_FALLBACK,
    );
  }
});
