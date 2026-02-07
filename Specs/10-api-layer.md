# Spec 10: API Layer

## Purpose

Expose the Vigil review pipeline as HTTP endpoints via a single Supabase Edge Function. The API layer is the only public interface to the Vigil system -- all requests from the demo UI (and any future integrations) enter through here.

Two logical endpoints are served from a single Edge Function (`vigil-review`):

1. **POST /functions/v1/vigil-review** -- Submit an AI response for safety review
2. **GET /functions/v1/vigil-review** -- Retrieve audit records (by ID or session)

The API layer handles CORS, request validation, auth verification, pipeline invocation, error formatting with safe fallbacks, and latency tracking.

## Dependencies

- **00-overview.md**: `VigilReviewRequest`, `VigilReviewResponse`, `AuditRecord`, `ConversationMessage`, `VigilDecisionType`, `EscalationLevel`
- **01-pipeline-core**: `reviewResponse()` function -- the pipeline orchestrator
- **09-audit-trail**: `getAuditRecord()`, `getSessionAuditRecords()` -- audit query functions

## Tech Stack

| Component       | Version / Source                               |
| --------------- | ---------------------------------------------- |
| Runtime         | Supabase Edge Functions (Deno)                 |
| HTTP server     | `https://deno.land/std@0.168.0/http/server.ts` |
| Supabase JS SDK | `https://esm.sh/@supabase/supabase-js@2.49.1`  |

**CRITICAL: SDK version is PINNED to 2.49.1.** Never use unpinned imports (`@2`, `@latest`, or bare). See `00-overview.md` conventions.

---

## Environment Variables

| Variable                      | Purpose                                           | Required | Auto-provided |
| ----------------------------- | ------------------------------------------------- | -------- | ------------- |
| `ANTHROPIC_API_KEY`           | Claude API access (Opus 4.6 + Haiku)              | Yes      | No            |
| `SUPABASE_URL`                | Supabase project URL                              | Yes      | Yes           |
| `SUPABASE_SERVICE_ROLE_KEY`   | Service role key for audit trail writes           | Yes      | Yes           |
| `SUPABASE_ANON_KEY`           | Anon key for demo UI auth verification            | Yes      | Yes           |
| `VIGIL_TRIAGE_THRESHOLD`      | Haiku triage pass threshold (default: 0.15)       | No       | No            |
| `VIGIL_UNCERTAINTY_THRESHOLD` | Confidence threshold for ASK_HUMAN (default: 0.4) | No       | No            |

---

## Endpoints

### POST /functions/v1/vigil-review

Submit an AI therapy response for Vigil safety review.

#### Request

**Headers:**

```
Authorization: Bearer <supabase-anon-key>   // or service role key
Content-Type: application/json
```

**Body** (`VigilReviewRequest`):

```typescript
{
  user_message: string;                        // required -- the user's message
  ai_response: string;                         // required -- the AI's proposed response
  conversation_history: ConversationMessage[];  // required -- can be empty []
  session_id: string;                          // required -- session identifier
  skip_triage?: boolean;                       // optional -- default false (demo sets true)
}
```

Each `ConversationMessage` in `conversation_history` must have:

```typescript
{
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO-8601
}
```

#### Response (200 OK)

```typescript
// VigilReviewResponse
{
  decision: VigilDecisionType;        // "PASS" | "REWRITE" | "BLOCK_AND_REPLACE" | "ESCALATE" | "ASK_HUMAN"
  final_response: string;             // original if PASS, rewritten if REWRITE/BLOCK
  final_score: number;                // 0.0 - 1.0
  confidence: number;                 // 0.0 - 1.0 (min of all agent confidences)
  peak_score: number;                 // highest weighted agent score (before breadth bonus)
  breadth_bonus: number;              // multi-agent flag uplift (0.10/agent, capped 0.25)
  flag_count: number;                 // number of agents with flags
  flags_summary: string[];            // all flags from all agents, flattened
  escalation_level: EscalationLevel;  // "LEVEL_0" through "LEVEL_4"
  audit_id: string;                   // UUID reference to full audit record
  latency_ms: number;                 // total pipeline time in milliseconds
}
```

#### Error Responses

All error responses share this format:

```typescript
{
  error: string;              // human-readable error message
  code: string;               // machine-readable error code
  fallback_response?: string; // only present on 500 errors -- a safe response to show the user
}
```

| Status | Code                  | When                                      |
| ------ | --------------------- | ----------------------------------------- |
| 400    | `INVALID_REQUEST`     | Missing required fields, wrong types      |
| 401    | `UNAUTHORIZED`        | Missing or invalid Authorization header   |
| 500    | `PIPELINE_ERROR`      | Internal pipeline failure (with fallback) |
| 503    | `SERVICE_UNAVAILABLE` | Claude API unavailable / rate limited     |

**500 errors always include a safe fallback response.** The pipeline must never leave the caller without a usable response. If the pipeline crashes, the API layer returns a generic safe response that the calling application can show to the user.

---

### GET /functions/v1/vigil-review?id=xxx

Retrieve a single audit record by UUID.

#### Request

```
Authorization: Bearer <key>
Query params:
  id: string (UUID) -- required
```

#### Response (200 OK)

Full `AuditRecord` object as defined in `00-overview.md`.

#### Error Responses

| Status | Code           | When                          |
| ------ | -------------- | ----------------------------- |
| 401    | `UNAUTHORIZED` | Missing or invalid auth       |
| 404    | `NOT_FOUND`    | No record with the given UUID |

---

### GET /functions/v1/vigil-review?session_id=xxx

Retrieve all audit records for a session.

#### Request

```
Authorization: Bearer <key>
Query params:
  session_id: string -- required
```

#### Response (200 OK)

`AuditRecord[]` ordered by `message_index` ascending.

Returns an empty array `[]` if no records exist for the session (not a 404).

#### Error Responses

| Status | Code              | When                    |
| ------ | ----------------- | ----------------------- |
| 400    | `INVALID_REQUEST` | Missing session_id      |
| 401    | `UNAUTHORIZED`    | Missing or invalid auth |

---

## CORS Configuration

The demo UI is served from a different origin than the Edge Function. CORS must be handled for all requests.

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // demo only -- restrict in production
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
```

Every response (including errors) must include these headers. OPTIONS preflight requests must return `204 No Content` with CORS headers immediately, before any auth or validation logic.

---

## Request Validation

The validation function parses an unknown body into a typed `VigilReviewRequest` or throws with a descriptive error message.

```typescript
const MAX_CONVERSATION_HISTORY = 20;

function validateReviewRequest(body: unknown): VigilReviewRequest {
  if (body === null || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const obj = body as Record<string, unknown>;

  // --- Required string fields ---

  if (typeof obj.user_message !== "string" || obj.user_message.trim() === "") {
    throw new ValidationError("Missing required field: user_message");
  }

  if (typeof obj.ai_response !== "string" || obj.ai_response.trim() === "") {
    throw new ValidationError("Missing required field: ai_response");
  }

  if (typeof obj.session_id !== "string" || obj.session_id.trim() === "") {
    throw new ValidationError("Missing required field: session_id");
  }

  // --- conversation_history ---

  if (!Array.isArray(obj.conversation_history)) {
    throw new ValidationError(
      "Missing required field: conversation_history (must be an array)",
    );
  }

  // Validate each entry in conversation_history
  for (let i = 0; i < obj.conversation_history.length; i++) {
    const msg = obj.conversation_history[i];
    if (typeof msg !== "object" || msg === null) {
      throw new ValidationError(
        `conversation_history[${i}] must be an object with role, content, and timestamp`,
      );
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      throw new ValidationError(
        `conversation_history[${i}].role must be "user" or "assistant"`,
      );
    }
    if (typeof msg.content !== "string") {
      throw new ValidationError(
        `conversation_history[${i}].content must be a string`,
      );
    }
    if (typeof msg.timestamp !== "string") {
      throw new ValidationError(
        `conversation_history[${i}].timestamp must be a string`,
      );
    }
  }

  // Trim to last MAX_CONVERSATION_HISTORY messages
  const trimmedHistory = obj.conversation_history.slice(
    -MAX_CONVERSATION_HISTORY,
  ) as ConversationMessage[];

  // --- Optional fields ---

  const skipTriage =
    typeof obj.skip_triage === "boolean" ? obj.skip_triage : false;

  return {
    user_message: obj.user_message as string,
    ai_response: obj.ai_response as string,
    conversation_history: trimmedHistory,
    session_id: obj.session_id as string,
    skip_triage: skipTriage,
  };
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

### Validation Rules Summary

| Field                  | Type    | Required | Validation                                         |
| ---------------------- | ------- | -------- | -------------------------------------------------- |
| `user_message`         | string  | Yes      | Non-empty after trim                               |
| `ai_response`          | string  | Yes      | Non-empty after trim                               |
| `session_id`           | string  | Yes      | Non-empty after trim                               |
| `conversation_history` | array   | Yes      | Can be `[]`; each entry has role+content+timestamp |
| `skip_triage`          | boolean | No       | Default `false`; ignored if not a boolean          |

---

## Safe Fallback Response

When the pipeline fails (500), the API must still return a response the calling application can display to the user. This prevents a situation where a pipeline crash silently passes through an unsafe AI response.

```typescript
const SAFE_FALLBACK_RESPONSE =
  "I want to make sure I'm being helpful in the right way. " +
  "Could you tell me a bit more about what you're going through? " +
  "I'm here to listen and support you.";
```

This response is:

- Clinically neutral -- does not dismiss, diagnose, or advise
- Open-ended -- invites the user to continue
- Safe for any emotional state -- validated against regulation-aware principles

---

## Implementation

File: `supabase/functions/vigil-review/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { reviewResponse } from "../_shared/pipeline.ts";
import {
  getAuditRecord,
  getSessionAuditRecords,
} from "../_shared/audit-logger.ts";
import type {
  VigilReviewRequest,
  VigilReviewResponse,
  ConversationMessage,
  AuditRecord,
} from "../_shared/types.ts";

// ============================================================
// Constants
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MAX_CONVERSATION_HISTORY = 20;

const SAFE_FALLBACK_RESPONSE =
  "I want to make sure I'm being helpful in the right way. " +
  "Could you tell me a bit more about what you're going through? " +
  "I'm here to listen and support you.";

// ============================================================
// Main Handler
// ============================================================

serve(async (req: Request): Promise<Response> => {
  // ---------------------------------------------------------
  // 1. CORS preflight
  // ---------------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ---------------------------------------------------------
    // 2. Auth verification
    // ---------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(401, "Missing Authorization header", "UNAUTHORIZED");
    }

    // Verify the token is a valid Supabase key (anon or service role).
    // For the hackathon demo, we accept the anon key directly.
    // In production, this would verify a user JWT via supabase.auth.getUser().
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (token !== anonKey && token !== serviceRoleKey) {
      // Attempt JWT verification via Supabase Auth as a fallback
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        return errorResponse(
          401,
          "Invalid Authorization token",
          "UNAUTHORIZED",
        );
      }
    }

    // ---------------------------------------------------------
    // 3. Route matching
    // ---------------------------------------------------------
    const url = new URL(req.url);

    if (req.method === "POST") {
      return await handleReviewRequest(req);
    }

    if (req.method === "GET") {
      return await handleAuditQuery(url);
    }

    return errorResponse(
      405,
      `Method ${req.method} not allowed`,
      "METHOD_NOT_ALLOWED",
    );
  } catch (err) {
    // Unexpected errors -- should not reach here in normal operation
    console.error("[api-layer] Unhandled error:", err);
    return errorResponse(
      500,
      "Internal server error",
      "PIPELINE_ERROR",
      SAFE_FALLBACK_RESPONSE,
    );
  }
});

// ============================================================
// POST Handler: Review Request
// ============================================================

async function handleReviewRequest(req: Request): Promise<Response> {
  // ---------------------------------------------------------
  // 1. Parse and validate request body
  // ---------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      400,
      "Invalid JSON in request body",
      "INVALID_REQUEST",
    );
  }

  let validatedRequest: VigilReviewRequest;
  try {
    validatedRequest = validateReviewRequest(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(400, err.message, "INVALID_REQUEST");
    }
    throw err;
  }

  // ---------------------------------------------------------
  // 2. Invoke pipeline
  // ---------------------------------------------------------
  const startTime = performance.now();

  let pipelineResult: VigilReviewResponse;
  try {
    pipelineResult = await reviewResponse(validatedRequest);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error(`[api-layer] Pipeline error after ${latencyMs}ms:`, err);

    // Determine if this is a Claude API availability issue
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (
      errorMessage.includes("rate_limit") ||
      errorMessage.includes("overloaded") ||
      errorMessage.includes("529")
    ) {
      return errorResponse(
        503,
        "AI review service temporarily unavailable",
        "SERVICE_UNAVAILABLE",
        SAFE_FALLBACK_RESPONSE,
      );
    }

    return errorResponse(
      500,
      "Pipeline processing failed",
      "PIPELINE_ERROR",
      SAFE_FALLBACK_RESPONSE,
    );
  }

  // ---------------------------------------------------------
  // 3. Return success response
  // ---------------------------------------------------------
  return new Response(JSON.stringify(pipelineResult), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// ============================================================
// GET Handler: Audit Queries
// ============================================================

async function handleAuditQuery(url: URL): Promise<Response> {
  const id = url.searchParams.get("id");
  const sessionId = url.searchParams.get("session_id");

  // ---------------------------------------------------------
  // GET ?id=<uuid> -- single record lookup
  // ---------------------------------------------------------
  if (id) {
    const record = await getAuditRecord(id);
    if (!record) {
      return errorResponse(404, "Record not found", "NOT_FOUND");
    }
    return new Response(JSON.stringify(record), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  // ---------------------------------------------------------
  // GET ?session_id=<string> -- session timeline
  // ---------------------------------------------------------
  if (sessionId) {
    const records = await getSessionAuditRecords(sessionId);
    return new Response(JSON.stringify(records), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  // ---------------------------------------------------------
  // GET with no query params -- bad request
  // ---------------------------------------------------------
  return errorResponse(
    400,
    "Missing query parameter: provide 'id' or 'session_id'",
    "INVALID_REQUEST",
  );
}

// ============================================================
// Request Validation
// ============================================================

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateReviewRequest(body: unknown): VigilReviewRequest {
  if (body === null || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const obj = body as Record<string, unknown>;

  // --- Required string fields ---

  if (typeof obj.user_message !== "string" || obj.user_message.trim() === "") {
    throw new ValidationError("Missing required field: user_message");
  }

  if (typeof obj.ai_response !== "string" || obj.ai_response.trim() === "") {
    throw new ValidationError("Missing required field: ai_response");
  }

  if (typeof obj.session_id !== "string" || obj.session_id.trim() === "") {
    throw new ValidationError("Missing required field: session_id");
  }

  // --- conversation_history ---

  if (!Array.isArray(obj.conversation_history)) {
    throw new ValidationError(
      "Missing required field: conversation_history (must be an array)",
    );
  }

  for (let i = 0; i < obj.conversation_history.length; i++) {
    const msg = obj.conversation_history[i] as Record<string, unknown>;
    if (typeof msg !== "object" || msg === null) {
      throw new ValidationError(
        `conversation_history[${i}] must be an object with role, content, and timestamp`,
      );
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      throw new ValidationError(
        `conversation_history[${i}].role must be "user" or "assistant"`,
      );
    }
    if (typeof msg.content !== "string") {
      throw new ValidationError(
        `conversation_history[${i}].content must be a string`,
      );
    }
    if (typeof msg.timestamp !== "string") {
      throw new ValidationError(
        `conversation_history[${i}].timestamp must be a string`,
      );
    }
  }

  // Trim to last MAX_CONVERSATION_HISTORY messages
  const trimmedHistory = obj.conversation_history.slice(
    -MAX_CONVERSATION_HISTORY,
  ) as ConversationMessage[];

  // --- Optional fields ---

  const skipTriage =
    typeof obj.skip_triage === "boolean" ? obj.skip_triage : false;

  return {
    user_message: obj.user_message as string,
    ai_response: obj.ai_response as string,
    conversation_history: trimmedHistory,
    session_id: obj.session_id as string,
    skip_triage: skipTriage,
  };
}

// ============================================================
// Error Response Helper
// ============================================================

function errorResponse(
  status: number,
  error: string,
  code: string,
  fallbackResponse?: string,
): Response {
  const body: Record<string, string> = { error, code };
  if (fallbackResponse) {
    body.fallback_response = fallbackResponse;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
```

---

## Implementation Notes

### Single Function, Multiple Routes

Supabase Edge Functions map one function name to one HTTP endpoint. Route matching (POST vs GET, query params) is handled inside the function. This keeps the deployment simple -- one `supabase functions deploy vigil-review` deploys everything.

### Auth Strategy (Hackathon)

For the hackathon demo, auth is simplified:

1. The demo UI sends the **anon key** as the Bearer token
2. The Edge Function checks if the token matches the anon key or service role key
3. If neither, it attempts JWT verification via `supabase.auth.getUser()` as a fallback

In production, this would be replaced with proper JWT verification and user-scoped access control.

### Latency Tracking

The `latency_ms` field in `VigilReviewResponse` is computed by the pipeline core (`01-pipeline-core`), not by the API layer. The pipeline measures from the start of context assembly through audit record insertion. The API layer does not add its own overhead measurement -- the relevant latency is the pipeline processing time, not HTTP overhead.

### Error Classification

The API layer distinguishes between two failure modes:

| Failure          | Status | Behavior                                                    |
| ---------------- | ------ | ----------------------------------------------------------- |
| Claude API error | 503    | Rate limit, overload, or connectivity issues with Anthropic |
| Pipeline error   | 500    | Any other failure (parsing, logic, audit write, etc.)       |

Both include `fallback_response` in the body so the calling application always has a safe response to show the user.

### Conversation History Trimming

If `conversation_history` exceeds `MAX_CONVERSATION_HISTORY` (20 messages), the validation function silently trims to the **last 20 messages** using `.slice(-20)`. This matches the context assembly behavior defined in `00-overview.md`. No error is returned -- the caller does not need to know about the trim.

---

## Demo-Specific Behavior

These behaviors are intentionally simplified for the hackathon and should be hardened for production:

| Behavior              | Demo                              | Production                         |
| --------------------- | --------------------------------- | ---------------------------------- |
| CORS origin           | `*` (any origin)                  | Specific allowed origins           |
| Auth                  | Anon key accepted as Bearer token | JWT verification with user scoping |
| Rate limiting         | None                              | Per-user, per-session limits       |
| `skip_triage` default | Demo UI sends `true`              | Default `false`                    |
| Input length limits   | None                              | Max message length, payload size   |

---

## Test Vectors

### 1. Valid Request (200)

**Input:**

```json
{
  "user_message": "I've been feeling really down lately, like nothing matters anymore.",
  "ai_response": "That sounds tough! But hey, try to look on the bright side - things will get better!",
  "conversation_history": [],
  "session_id": "test-session-001",
  "skip_triage": true
}
```

**Expected:** 200 with `VigilReviewResponse` body containing `decision`, `final_response`, `final_score`, `confidence`, `flag_count`, `flags_summary`, `escalation_level`, `audit_id`, and `latency_ms`.

---

### 2. Missing user_message (400)

**Input:**

```json
{
  "ai_response": "Hello!",
  "conversation_history": [],
  "session_id": "test-session-001"
}
```

**Expected:**

```json
{
  "error": "Missing required field: user_message",
  "code": "INVALID_REQUEST"
}
```

---

### 3. Missing conversation_history (400)

**Input:**

```json
{
  "user_message": "Hello",
  "ai_response": "Hi there!",
  "session_id": "test-session-001"
}
```

**Expected:**

```json
{
  "error": "Missing required field: conversation_history (must be an array)",
  "code": "INVALID_REQUEST"
}
```

---

### 4. Invalid conversation_history entry (400)

**Input:**

```json
{
  "user_message": "Hello",
  "ai_response": "Hi!",
  "conversation_history": [
    {
      "role": "unknown",
      "content": "test",
      "timestamp": "2025-01-01T00:00:00Z"
    }
  ],
  "session_id": "test-session-001"
}
```

**Expected:**

```json
{
  "error": "conversation_history[0].role must be \"user\" or \"assistant\"",
  "code": "INVALID_REQUEST"
}
```

---

### 5. No auth header (401)

**Input:** Any valid body, but no `Authorization` header.

**Expected:**

```json
{
  "error": "Missing Authorization header",
  "code": "UNAUTHORIZED"
}
```

---

### 6. Pipeline error (500)

**Trigger:** Internal pipeline failure (e.g., all Claude API calls fail).

**Expected:**

```json
{
  "error": "Pipeline processing failed",
  "code": "PIPELINE_ERROR",
  "fallback_response": "I want to make sure I'm being helpful in the right way. Could you tell me a bit more about what you're going through? I'm here to listen and support you."
}
```

---

### 7. Claude API rate limited (503)

**Trigger:** Claude API returns 429 or 529.

**Expected:**

```json
{
  "error": "AI review service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "fallback_response": "I want to make sure I'm being helpful in the right way. Could you tell me a bit more about what you're going through? I'm here to listen and support you."
}
```

---

### 8. Audit retrieval by ID (200)

**Input:** `GET /functions/v1/vigil-review?id=<valid-uuid>` with valid auth.

**Expected:** 200 with full `AuditRecord` JSON body.

---

### 9. Audit not found (404)

**Input:** `GET /functions/v1/vigil-review?id=00000000-0000-0000-0000-000000000000` with valid auth.

**Expected:**

```json
{
  "error": "Record not found",
  "code": "NOT_FOUND"
}
```

---

### 10. Session audit retrieval (200)

**Input:** `GET /functions/v1/vigil-review?session_id=test-session-001` with valid auth.

**Expected:** 200 with `AuditRecord[]` ordered by `message_index` ascending. Empty array `[]` if no records exist.

---

### 11. GET with no query params (400)

**Input:** `GET /functions/v1/vigil-review` with valid auth but no query params.

**Expected:**

```json
{
  "error": "Missing query parameter: provide 'id' or 'session_id'",
  "code": "INVALID_REQUEST"
}
```

---

### 12. OPTIONS preflight (204)

**Input:** `OPTIONS /functions/v1/vigil-review` with any headers.

**Expected:** 204 No Content with CORS headers. No auth check, no body parsing.

---

### 13. Conversation history trimming (200)

**Input:** Valid request with 30 messages in `conversation_history`.

**Expected:** 200 with successful pipeline result. The pipeline receives only the last 20 messages. No error, no warning in the response.

---

## Acceptance Criteria

1. **POST /functions/v1/vigil-review** processes requests end-to-end: validates input, invokes pipeline, returns `VigilReviewResponse`
2. **GET /functions/v1/vigil-review?id=xxx** retrieves a single `AuditRecord` by UUID, returns 404 if not found
3. **GET /functions/v1/vigil-review?session_id=xxx** retrieves all session records ordered by `message_index`, returns `[]` for unknown sessions
4. **CORS preflight** handled correctly: OPTIONS returns 204 with CORS headers before any auth or validation
5. **All responses include CORS headers**, including error responses
6. **Request validation catches all invalid inputs**: missing fields, wrong types, invalid `conversation_history` entries
7. **conversation_history trimmed** to last 20 messages silently (no error for oversized history)
8. **500 errors include `fallback_response`** -- a clinically safe response the calling application can display
9. **503 errors returned** for Claude API rate limits / overload, distinct from 500 pipeline errors
10. **Pinned SDK version** (`@supabase/supabase-js@2.49.1`) used in all imports
11. **Environment variables** accessed correctly with appropriate fallback handling
12. **`latency_ms`** field included in every `VigilReviewResponse`
13. **All 13 test vectors** produce the expected status codes and response shapes
