# Spec 09: Audit Trail

## Purpose

Persistent, clinician-reviewable record of every Vigil decision -- what was flagged, why, what was changed, and the full agent reasoning. The audit trail is the accountability backbone of the system: every AI therapy response that passes through Vigil produces exactly one immutable `AuditRecord`.

### Use Cases

| Consumer                | What they need                                                    |
| ----------------------- | ----------------------------------------------------------------- |
| **Compliance**          | Prove every response was reviewed; no gaps in the record          |
| **Clinical review**     | Inspect flagged sessions, read agent reasoning, verify rewrites   |
| **Product improvement** | Analyze false positive/negative rates, tune thresholds            |
| **Research**            | Aggregate statistics on flag types, intervention rates, latencies |
| **Demo UI**             | Real-time activity feed and session timeline view                 |

## Dependencies

- **00-overview.md**: `AuditRecord`, `AgentReports`, `RewriteResult`, `ChangeRecord`, `VigilDecisionType`, `EscalationLevel`, `DecisionResult`, `ContextPayload`

## Interface

**Input:** `DecisionResult` + `RewriteResult | null` + original `ContextPayload` + `triageScore: number | null` + `latencyMs: number`

**Output:** Stored `AuditRecord` with database-generated UUID and timestamp

---

## SQL Migration (001_audit_trail.sql)

This is the complete, production-ready migration. It runs cleanly on a fresh Supabase instance.

```sql
-- Vigil Audit Trail
-- Migration: 001_audit_trail.sql
--
-- Creates the append-only audit trail table for Vigil decisions.
-- Every AI therapy response reviewed by Vigil produces exactly one row.
--
-- Design principles:
--   - Append-only: no UPDATE or DELETE policies
--   - All scores constrained to [0, 1]
--   - JSONB for agent_reports and rewrite_result (flexible querying)
--   - Session + message_index is unique (one record per message per session)

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS vigil_audit_trail (
  -- Identity
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  session_id        TEXT          NOT NULL,
  message_index     INTEGER       NOT NULL,

  -- Messages
  user_message      TEXT          NOT NULL,
  original_response TEXT          NOT NULL,
  final_response    TEXT          NOT NULL,

  -- Decision
  decision          TEXT          NOT NULL CHECK (decision IN ('PASS', 'REWRITE', 'BLOCK_AND_REPLACE', 'ESCALATE', 'ASK_HUMAN')),
  final_score       FLOAT         NOT NULL CHECK (final_score >= 0 AND final_score <= 1),
  confidence        FLOAT         NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  peak_score        FLOAT         NOT NULL CHECK (peak_score >= 0 AND peak_score <= 1),
  breadth_bonus     FLOAT         NOT NULL CHECK (breadth_bonus >= 0 AND breadth_bonus <= 1),
  flag_count        INTEGER       NOT NULL DEFAULT 0,

  -- Triage (NULL when triage was skipped, e.g. skip_triage=true or forced Opus review)
  triage_score      FLOAT         CHECK (triage_score IS NULL OR (triage_score >= 0 AND triage_score <= 1)),

  -- Agent reports: full JSON from all four agents
  -- Schema matches AgentReports from 00-overview.md
  agent_reports     JSONB         NOT NULL,

  -- Rewrite details: NULL when decision is PASS (no rewrite needed)
  -- Schema matches RewriteResult from 00-overview.md
  rewrite_result    JSONB,

  -- Individual changes extracted from RewriteResult for easier querying
  -- Schema matches ChangeRecord[] from 00-overview.md
  changes_made      JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- Review lifecycle
  review_status     TEXT          NOT NULL DEFAULT 'auto_passed'
                    CHECK (review_status IN (
                      'auto_passed',
                      'auto_rewritten',
                      'pending_clinician_review',
                      'clinician_reviewed'
                    )),

  -- Performance tracking
  latency_ms        INTEGER       NOT NULL,

  -- Uniqueness: one audit record per message per session
  CONSTRAINT uq_session_message UNIQUE (session_id, message_index)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Primary access patterns
CREATE INDEX idx_audit_session          ON vigil_audit_trail(session_id);
CREATE INDEX idx_audit_created          ON vigil_audit_trail(created_at DESC);
CREATE INDEX idx_audit_decision         ON vigil_audit_trail(decision);
CREATE INDEX idx_audit_review_status    ON vigil_audit_trail(review_status);
CREATE INDEX idx_audit_score            ON vigil_audit_trail(final_score DESC);

-- Composite: session timeline ordered by message
CREATE INDEX idx_audit_session_message  ON vigil_audit_trail(session_id, message_index);

-- GIN index for JSONB agent_reports deep queries
-- Enables queries like: agent_reports->'clinical_safety'->>'flags' @> '["MISSED_RISK_SIGNAL"]'
CREATE INDEX idx_audit_agent_reports    ON vigil_audit_trail USING GIN (agent_reports);

-- GIN index for changes_made queries
CREATE INDEX idx_audit_changes          ON vigil_audit_trail USING GIN (changes_made);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE vigil_audit_trail ENABLE ROW LEVEL SECURITY;

-- Service role: INSERT only (Edge Functions write audit records)
-- The service_role bypasses RLS by default in Supabase, but we define
-- the policy explicitly for documentation and defense-in-depth.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vigil_audit_trail'
    AND policyname = 'Service role can insert audit records'
  ) THEN
    CREATE POLICY "Service role can insert audit records"
      ON vigil_audit_trail
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated users: SELECT only, scoped to their own sessions.
-- For the hackathon demo, session_id is passed as a claim or matched
-- against the user's known sessions. Simplified: allow reading all
-- records for authenticated users (the demo has no multi-tenancy).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vigil_audit_trail'
    AND policyname = 'Authenticated users can read audit records'
  ) THEN
    CREATE POLICY "Authenticated users can read audit records"
      ON vigil_audit_trail
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Anon users: SELECT only (demo UI uses anon key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vigil_audit_trail'
    AND policyname = 'Anon users can read audit records for demo'
  ) THEN
    CREATE POLICY "Anon users can read audit records for demo"
      ON vigil_audit_trail
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- APPEND-ONLY ENFORCEMENT:
-- No UPDATE or DELETE policies are created. Any attempt to UPDATE or DELETE
-- will be denied by RLS. This is intentional -- the audit trail is immutable.
--
-- If a clinician reviews a record, the review_status is updated via a
-- dedicated RPC function that runs as service_role (not via direct UPDATE).

-- ============================================================
-- RPC: Clinician Review Update (the only "write" besides INSERT)
-- ============================================================

CREATE OR REPLACE FUNCTION update_audit_review_status(
  record_id UUID,
  new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- runs as table owner, bypasses RLS
AS $$
BEGIN
  IF new_status NOT IN ('pending_clinician_review', 'clinician_reviewed') THEN
    RAISE EXCEPTION 'Invalid review status: %', new_status;
  END IF;

  UPDATE vigil_audit_trail
  SET review_status = new_status
  WHERE id = record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit record not found: %', record_id;
  END IF;
END;
$$;
```

### Schema-to-Type Mapping

The table columns map 1:1 to the `AuditRecord` interface in `00-overview.md`:

| Column              | TypeScript Field    | Type                     | Notes                          |
| ------------------- | ------------------- | ------------------------ | ------------------------------ |
| `id`                | `id`                | `string` (UUID)          | Database-generated             |
| `created_at`        | `created_at`        | `string` (ISO-8601)      | Database-generated             |
| `session_id`        | `session_id`        | `string`                 | From `ContextPayload`          |
| `message_index`     | `message_index`     | `number`                 | From `SessionMetadata`         |
| `user_message`      | `user_message`      | `string`                 | From `ContextPayload`          |
| `original_response` | `original_response` | `string`                 | From `ContextPayload`          |
| `final_response`    | `final_response`    | `string`                 | Rewritten or original          |
| `decision`          | `decision`          | `VigilDecisionType`      | From `DecisionResult`          |
| `final_score`       | `final_score`       | `number` [0, 1]          | From `DecisionResult`          |
| `confidence`        | `confidence`        | `number` [0, 1]          | From `DecisionResult`          |
| `peak_score`        | `peak_score`        | `number` [0, 1]          | From `DecisionResult`          |
| `breadth_bonus`     | `breadth_bonus`     | `number` [0, 1]          | From `DecisionResult`          |
| `flag_count`        | `flag_count`        | `number`                 | From `DecisionResult`          |
| `triage_score`      | `triage_score`      | `number \| null`         | `null` if triage skipped       |
| `agent_reports`     | `agent_reports`     | `AgentReports` (JSONB)   | Full agent output              |
| `rewrite_result`    | `rewrite_result`    | `RewriteResult \| null`  | `null` if decision is PASS     |
| `changes_made`      | `changes_made`      | `ChangeRecord[]` (JSONB) | Extracted from `RewriteResult` |
| `review_status`     | `review_status`     | `ReviewStatus` (enum)    | Lifecycle state                |
| `latency_ms`        | `latency_ms`        | `number`                 | Total pipeline time in ms      |

---

## TypeScript Implementation

File: `supabase/functions/_shared/audit-logger.ts`

```typescript
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type {
  AuditRecord,
  DecisionResult,
  RewriteResult,
  ContextPayload,
  VigilDecisionType,
} from "./types.ts";

// ============================================================
// Client
// ============================================================

/**
 * Creates a Supabase client with service_role key for audit writes.
 * Service role bypasses RLS, which is required for INSERT.
 */
function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ============================================================
// Insert
// ============================================================

interface InsertAuditParams {
  context: ContextPayload;
  decision: DecisionResult;
  rewriteResult: RewriteResult | null;
  triageScore: number | null;
  latencyMs: number;
}

/**
 * Writes a single audit record to vigil_audit_trail.
 *
 * Called at the end of every Vigil pipeline run, regardless of decision.
 * The record captures the complete decision context: what the user said,
 * what the AI responded, what every agent found, and what (if anything)
 * was changed.
 *
 * @param params.context     - Original context payload (user message, AI response, session metadata)
 * @param params.decision    - DecisionResult from the decision engine
 * @param params.rewriteResult - RewriteResult if a rewrite occurred, null for PASS
 * @param params.triageScore - Haiku triage score, null if triage was skipped
 * @param params.latencyMs   - Total pipeline latency in milliseconds
 *
 * @returns The inserted AuditRecord with database-generated id and created_at
 * @throws Error if the insert fails (database constraint violation, network error)
 */
export async function insertAuditRecord(
  params: InsertAuditParams,
): Promise<AuditRecord> {
  const { context, decision, rewriteResult, triageScore, latencyMs } = params;

  const supabase = getServiceClient();

  // Determine final_response: rewritten text if available, otherwise original
  const finalResponse =
    rewriteResult?.rewritten_response ?? context.ai_response;

  // Determine review_status based on decision type
  const reviewStatus = deriveReviewStatus(decision.decision);

  const record = {
    session_id: context.session_metadata.session_id,
    message_index: context.session_metadata.message_count,
    user_message: context.user_message,
    original_response: context.ai_response,
    final_response: finalResponse,
    decision: decision.decision,
    final_score: decision.final_score,
    confidence: decision.confidence,
    peak_score: decision.peak_score,
    breadth_bonus: decision.breadth_bonus,
    flag_count: decision.flag_count,
    triage_score: triageScore,
    agent_reports: decision.agent_reports,
    rewrite_result: rewriteResult,
    changes_made: rewriteResult?.changes_made ?? [],
    review_status: reviewStatus,
    latency_ms: latencyMs,
  };

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("[audit-logger] Failed to insert audit record:", error);
    throw new Error(`Audit trail insert failed: ${error.message}`);
  }

  return data as AuditRecord;
}

/**
 * Maps a decision type to the initial review_status.
 *
 * - PASS               -> auto_passed (no human review needed)
 * - REWRITE            -> auto_rewritten (logged, reviewable later)
 * - BLOCK_AND_REPLACE  -> auto_rewritten (logged, reviewable later)
 * - ESCALATE           -> pending_clinician_review (needs human eyes)
 * - ASK_HUMAN          -> pending_clinician_review (needs human eyes)
 */
function deriveReviewStatus(
  decision: VigilDecisionType,
): AuditRecord["review_status"] {
  switch (decision) {
    case "PASS":
      return "auto_passed";
    case "REWRITE":
    case "BLOCK_AND_REPLACE":
      return "auto_rewritten";
    case "ESCALATE":
    case "ASK_HUMAN":
      return "pending_clinician_review";
  }
}

// ============================================================
// Queries
// ============================================================

/**
 * Returns all audit records for a session, ordered by message_index ascending.
 * Used by the demo UI session timeline view.
 *
 * @param sessionId - The session identifier
 * @returns Array of AuditRecords in conversation order
 */
export async function getSessionAuditRecords(
  sessionId: string,
): Promise<AuditRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .select("*")
    .eq("session_id", sessionId)
    .order("message_index", { ascending: true });

  if (error) {
    console.error("[audit-logger] Failed to fetch session records:", error);
    throw new Error(`Audit trail query failed: ${error.message}`);
  }

  return (data ?? []) as AuditRecord[];
}

/**
 * Returns records where decision != 'PASS', ordered by most recent first.
 * Used by the demo UI activity feed to show interventions.
 *
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of AuditRecords that were flagged/rewritten/blocked/escalated
 */
export async function getFlaggedRecords(
  limit: number = 50,
): Promise<AuditRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .select("*")
    .neq("decision", "PASS")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[audit-logger] Failed to fetch flagged records:", error);
    throw new Error(`Audit trail query failed: ${error.message}`);
  }

  return (data ?? []) as AuditRecord[];
}

/**
 * Returns a single audit record by its UUID.
 * Used when the API response includes an audit_id and the client
 * wants to fetch the full record details.
 *
 * @param id - The UUID of the audit record
 * @returns The AuditRecord, or null if not found
 */
export async function getAuditRecord(id: string): Promise<AuditRecord | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // "JSON object requested, multiple (or no) rows returned"
      return null;
    }
    console.error("[audit-logger] Failed to fetch audit record:", error);
    throw new Error(`Audit trail query failed: ${error.message}`);
  }

  return data as AuditRecord;
}

/**
 * Returns records filtered by decision type, ordered by most recent first.
 *
 * @param decision - The decision type to filter by
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of matching AuditRecords
 */
export async function getRecordsByDecision(
  decision: VigilDecisionType,
  limit: number = 50,
): Promise<AuditRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .select("*")
    .eq("decision", decision)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[audit-logger] Failed to fetch records by decision:", error);
    throw new Error(`Audit trail query failed: ${error.message}`);
  }

  return (data ?? []) as AuditRecord[];
}

/**
 * Returns records where final_score >= the given threshold,
 * ordered by score descending.
 *
 * @param threshold - Minimum final_score (0.0 - 1.0)
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of AuditRecords at or above the score threshold
 */
export async function getRecordsAboveThreshold(
  threshold: number,
  limit: number = 50,
): Promise<AuditRecord[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .select("*")
    .gte("final_score", threshold)
    .order("final_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      "[audit-logger] Failed to fetch records by threshold:",
      error,
    );
    throw new Error(`Audit trail query failed: ${error.message}`);
  }

  return (data ?? []) as AuditRecord[];
}

/**
 * Returns aggregate statistics across all audit records.
 * Used by the demo UI dashboard for summary metrics.
 *
 * @returns Object with total counts, rates, and averages
 */
export async function getAuditStats(): Promise<AuditStats> {
  const supabase = getServiceClient();

  // Single query using Postgres count aggregation
  const { count: total } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true });

  const { count: passCount } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true })
    .eq("decision", "PASS");

  const { count: rewriteCount } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true })
    .eq("decision", "REWRITE");

  const { count: blockCount } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true })
    .eq("decision", "BLOCK_AND_REPLACE");

  const { count: escalateCount } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true })
    .eq("decision", "ESCALATE");

  const { count: askHumanCount } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true })
    .eq("decision", "ASK_HUMAN");

  const { count: pendingReview } = await supabase
    .from("vigil_audit_trail")
    .select("*", { count: "exact", head: true })
    .eq("review_status", "pending_clinician_review");

  const totalN = total ?? 0;

  return {
    total_records: totalN,
    pass_count: passCount ?? 0,
    rewrite_count: rewriteCount ?? 0,
    block_count: blockCount ?? 0,
    escalate_count: escalateCount ?? 0,
    ask_human_count: askHumanCount ?? 0,
    pending_clinician_review: pendingReview ?? 0,
    pass_rate: totalN > 0 ? (passCount ?? 0) / totalN : 0,
    intervention_rate: totalN > 0 ? 1 - (passCount ?? 0) / totalN : 0,
  };
}

interface AuditStats {
  total_records: number;
  pass_count: number;
  rewrite_count: number;
  block_count: number;
  escalate_count: number;
  ask_human_count: number;
  pending_clinician_review: number;
  pass_rate: number; // 0.0 - 1.0
  intervention_rate: number; // 0.0 - 1.0
}
```

---

## Query Patterns

These are the queries the demo UI and API layer will use. Each maps to a function above or a direct Supabase query.

### 1. Session Timeline

All records for a single session, in conversation order. Powers the session detail view where a clinician reads through an entire conversation with Vigil annotations.

```sql
SELECT *
FROM vigil_audit_trail
WHERE session_id = $1
ORDER BY message_index ASC;
```

**Supabase SDK:**

```typescript
const { data } = await supabase
  .from("vigil_audit_trail")
  .select("*")
  .eq("session_id", sessionId)
  .order("message_index", { ascending: true });
```

**Index used:** `idx_audit_session_message`

### 2. Activity Feed (Recent Flagged Records)

Most recent N records where Vigil intervened (decision != PASS). Powers the live activity feed showing interventions as they happen.

```sql
SELECT *
FROM vigil_audit_trail
WHERE decision != 'PASS'
ORDER BY created_at DESC
LIMIT $1;
```

**Supabase SDK:**

```typescript
const { data } = await supabase
  .from("vigil_audit_trail")
  .select("*")
  .neq("decision", "PASS")
  .order("created_at", { ascending: false })
  .limit(50);
```

**Index used:** `idx_audit_decision` + `idx_audit_created`

### 3. Filter by Decision Type

Records matching a specific decision type. Used when the clinician wants to see only rewrites, or only escalations.

```sql
SELECT *
FROM vigil_audit_trail
WHERE decision = $1
ORDER BY created_at DESC
LIMIT $2;
```

**Supabase SDK:**

```typescript
const { data } = await supabase
  .from("vigil_audit_trail")
  .select("*")
  .eq("decision", "REWRITE")
  .order("created_at", { ascending: false })
  .limit(50);
```

**Index used:** `idx_audit_decision`

### 4. High-Score Records (Above Threshold)

Records where the final risk score exceeds a given threshold. Used for identifying the most concerning interactions.

```sql
SELECT *
FROM vigil_audit_trail
WHERE final_score >= $1
ORDER BY final_score DESC
LIMIT $2;
```

**Supabase SDK:**

```typescript
const { data } = await supabase
  .from("vigil_audit_trail")
  .select("*")
  .gte("final_score", 0.7)
  .order("final_score", { ascending: false })
  .limit(50);
```

**Index used:** `idx_audit_score`

### 5. Aggregate Statistics

Dashboard summary: total records, pass rate, rewrite rate, block rate, pending reviews. Uses `count: "exact"` with `head: true` for efficient counting without transferring row data.

```sql
-- Total
SELECT COUNT(*) FROM vigil_audit_trail;

-- By decision
SELECT decision, COUNT(*)
FROM vigil_audit_trail
GROUP BY decision;

-- Pending review
SELECT COUNT(*)
FROM vigil_audit_trail
WHERE review_status = 'pending_clinician_review';
```

**Supabase SDK:** See `getAuditStats()` function above.

**Index used:** `idx_audit_decision`, `idx_audit_review_status`

### 6. Agent-Specific Flag Search (JSONB)

Find records where a specific agent flagged a specific issue. This leverages the GIN index on `agent_reports`.

```sql
-- Records where clinical safety agent flagged MISSED_RISK_SIGNAL
SELECT *
FROM vigil_audit_trail
WHERE agent_reports->'clinical_safety'->'flags' @> '"MISSED_RISK_SIGNAL"'
ORDER BY created_at DESC
LIMIT 50;

-- Records where escalation agent recommended LEVEL_3 or higher
SELECT *
FROM vigil_audit_trail
WHERE agent_reports->'escalation'->>'escalation_level' IN ('LEVEL_3', 'LEVEL_4')
ORDER BY created_at DESC;
```

**Supabase SDK:**

```typescript
// Using .contains() for JSONB @> operator
const { data } = await supabase
  .from("vigil_audit_trail")
  .select("*")
  .contains("agent_reports", {
    clinical_safety: { flags: ["MISSED_RISK_SIGNAL"] },
  })
  .order("created_at", { ascending: false })
  .limit(50);
```

**Index used:** `idx_audit_agent_reports` (GIN)

### 7. Pending Clinician Review Queue

Records that need human attention, ordered by severity (highest score first).

```sql
SELECT *
FROM vigil_audit_trail
WHERE review_status = 'pending_clinician_review'
ORDER BY final_score DESC;
```

**Supabase SDK:**

```typescript
const { data } = await supabase
  .from("vigil_audit_trail")
  .select("*")
  .eq("review_status", "pending_clinician_review")
  .order("final_score", { ascending: false });
```

**Index used:** `idx_audit_review_status` + `idx_audit_score`

---

## Review Status Lifecycle

```
PASS decision
  --> auto_passed (terminal for PASS)

REWRITE / BLOCK_AND_REPLACE decision
  --> auto_rewritten
      --> (optional) clinician_reviewed  (via update_audit_review_status RPC)

ESCALATE / ASK_HUMAN decision
  --> pending_clinician_review
      --> clinician_reviewed  (via update_audit_review_status RPC)
```

The `update_audit_review_status` RPC function is the only mechanism for modifying an existing audit record. It runs as `SECURITY DEFINER` (service role), bypassing RLS, and only allows transitions to `pending_clinician_review` or `clinician_reviewed`.

---

## Error Handling

The audit trail is a critical system component. If it fails, the pipeline should still return a response to the user (safety first), but must log the failure prominently.

```typescript
// In the pipeline orchestrator (01-pipeline-core):
try {
  const auditRecord = await insertAuditRecord({
    context,
    decision: decisionResult,
    rewriteResult,
    triageScore,
    latencyMs,
  });
  return { ...response, audit_id: auditRecord.id };
} catch (auditError) {
  // Audit failure must not block the safety response
  console.error("[CRITICAL] Audit trail write failed:", auditError);
  // Return response without audit_id -- the decision still applies
  return { ...response, audit_id: "AUDIT_WRITE_FAILED" };
}
```

---

## Acceptance Criteria

1. **Migration runs cleanly** on a fresh Supabase instance with `supabase db push`
2. **Schema matches `AuditRecord`** type in `00-overview.md` -- every field present, same types, same nullability
3. **UNIQUE constraint** on `(session_id, message_index)` prevents duplicate records per message
4. **RLS enforced:**
   - `service_role` can INSERT
   - `authenticated` and `anon` can SELECT (demo simplification)
   - No UPDATE or DELETE policies exist -- append-only is enforced at the RLS layer
5. **Score constraints:** All `FLOAT` score columns have `CHECK (>= 0 AND <= 1)` constraints
6. **JSONB indexes:** GIN index on `agent_reports` supports deep queries into agent flags
7. **`insertAuditRecord`:**
   - Derives `final_response` from `rewriteResult` or falls back to `original_response`
   - Sets `rewrite_result` to `null` for PASS decisions
   - Sets `changes_made` to `[]` for PASS decisions
   - Derives `review_status` from decision type
   - Returns the full `AuditRecord` with database-generated `id` and `created_at`
8. **`getSessionAuditRecords`** returns records ordered by `message_index` ascending
9. **`getFlaggedRecords`** excludes PASS decisions and orders by `created_at` descending
10. **`getAuditRecord`** returns `null` (not an error) when the record does not exist
11. **`update_audit_review_status` RPC** is the only write path for existing records; rejects invalid status values
