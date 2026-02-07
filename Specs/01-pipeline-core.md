# Spec 01: Pipeline Core

## Purpose

Orchestrate the complete Vigil review pipeline. The Pipeline Core receives a `(user_message, ai_response, conversation_history)` payload, runs it through all components in the correct order, handles errors gracefully at every stage, and returns the final reviewed response with a full audit record.

This is the central coordination module -- every other component is a dependency that the Pipeline Core calls. It owns the execution flow, error boundaries, timing, and response assembly.

## Dependencies

- **00-overview.md**: `VigilReviewRequest`, `VigilReviewResponse`, `ContextPayload`, `SessionMetadata`, `ConversationMessage`, `AgentReports`, `DecisionResult`, `RewriteResult`, `TriageResult`, `AuditRecord`, `VigilDecisionType`, `EscalationLevel`, `ChangeRecord`
- **02-clinical-safety-agent.md**: `ClinicalSafetyReport` schema, agent system prompt, corpus loading
- **03-boundary-agent.md**: `BoundaryReport` schema, agent system prompt, corpus loading
- **04-regulation-agent.md**: `RegulationReport` schema, agent system prompt, corpus loading
- **05-escalation-agent.md**: `EscalationReport` schema, agent system prompt, corpus loading
- **06-decision-engine.md**: `computeDecision()` algorithm (pure, synchronous)
- **07-rewrite-agent.md**: Rewrite Agent system prompt, conflict resolution hierarchy
- **08-haiku-triage.md**: Haiku triage prompt, `TriageResult` schema
- **09-audit-trail.md**: `insertAuditRecord()`, `AuditRecord` table schema

## File Location

`supabase/functions/_shared/pipeline.ts`

---

## Interface

### Input

`VigilReviewRequest` (from `00-overview.md`):

```typescript
interface VigilReviewRequest {
  user_message: string;
  ai_response: string;
  conversation_history: ConversationMessage[];
  session_id: string;
  skip_triage?: boolean; // force full Opus review (for demo)
}
```

### Output

`VigilReviewResponse` (from `00-overview.md`):

```typescript
interface VigilReviewResponse {
  decision: VigilDecisionType;
  final_response: string; // original if PASS, rewritten if REWRITE/BLOCK
  final_score: number;
  confidence: number;
  peak_score: number; // highest weighted agent score (before breadth bonus)
  breadth_bonus: number; // multi-agent flag uplift applied
  flag_count: number;
  flags_summary: string[]; // all flags from all agents, flattened
  escalation_level: EscalationLevel;
  audit_id: string; // reference to full audit record
  latency_ms: number;
  // Full details available via GET /functions/v1/vigil-review?id={audit_id}
}
```

---

## Pipeline Flow Diagram

```
VigilReviewRequest
        |
        v
 [1. Context Assembly]
        |
        v
 [2. Triage (optional)] ----score < 0.15----> [Early PASS] --> [6. Audit] --> Response
        |
   score >= 0.15
   (or skip_triage)
        |
        v
 [3. Parallel Agent Review]
   +------+------+------+------+
   |      |      |      |      |
   v      v      v      v      |
 Clinical Boundary Regulation Escalation
 Safety                       |
   |      |      |      |      |
   +------+------+------+------+
        |
        v
 [4. Decision Engine]
        |
   +----+----+----+
   |         |    |
 PASS    REWRITE  BLOCK/ESCALATE/ASK_HUMAN
   |         |    |
   |         v    v
   |    [5. Rewrite Agent]
   |         |
   +----+----+
        |
        v
 [6. Audit Logging]
        |
        v
 [7. Response Assembly]
        |
        v
 VigilReviewResponse
```

---

## Step 1: Context Assembly

Transforms the raw `VigilReviewRequest` into a structured `ContextPayload` consumed by all downstream components. This is a synchronous, pure function.

```typescript
import type {
  VigilReviewRequest,
  ContextPayload,
  SessionMetadata,
  ConversationMessage,
} from "./types.ts";
import { MAX_CONVERSATION_HISTORY } from "./types.ts";

/**
 * Assembles the context payload from a review request.
 *
 * Responsibilities:
 * - Trim conversation_history to the last MAX_CONVERSATION_HISTORY (20) messages
 * - Build SessionMetadata from the request and conversation history
 * - Return a structured ContextPayload ready for agent consumption
 *
 * This function is synchronous and pure -- no network calls, no side effects.
 */
function assembleContext(request: VigilReviewRequest): ContextPayload {
  // Trim conversation history to last 20 messages
  const trimmedHistory = request.conversation_history.slice(
    -MAX_CONVERSATION_HISTORY,
  );

  // Build session metadata
  // message_count includes the current exchange (history + current pair)
  const messageCount = trimmedHistory.length + 2; // +2 for current user_message + ai_response

  // Determine prior intervention count and escalation level from history context
  // In a production system, these would come from the session store.
  // For the hackathon, these are initialized to 0/LEVEL_0 and updated
  // by the API layer from the audit trail for the current session.
  const sessionMetadata: SessionMetadata = {
    session_id: request.session_id,
    session_start:
      trimmedHistory.length > 0
        ? trimmedHistory[0].timestamp
        : new Date().toISOString(),
    message_count: messageCount,
    prior_interventions: 0, // populated by API layer from audit trail
    prior_escalation_level: "LEVEL_0", // populated by API layer from audit trail
  };

  return {
    user_message: request.user_message,
    ai_response: request.ai_response,
    conversation_history: trimmedHistory,
    session_metadata: sessionMetadata,
  };
}
```

### Session Metadata Population

The `prior_interventions` and `prior_escalation_level` fields require querying the audit trail for the current session. This is handled by the API layer (spec 10) before calling the pipeline:

```typescript
// In the API layer (spec 10), before calling reviewResponse():
const priorRecords = await getSessionAuditRecords(request.session_id);
const priorInterventions = priorRecords.filter(
  (r) => r.decision !== "PASS",
).length;
const priorEscalationLevel = priorRecords.reduce((max, r) => {
  const levels = ["LEVEL_0", "LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"];
  return levels.indexOf(r.agent_reports.escalation.escalation_level) >
    levels.indexOf(max)
    ? r.agent_reports.escalation.escalation_level
    : max;
}, "LEVEL_0" as EscalationLevel);
```

---

## Step 2: Triage (Optional)

The Haiku triage is a fast pre-screen that clears ~60-70% of message pairs without invoking the full Opus pipeline. It is skipped when `skip_triage` is true (default for the hackathon demo).

```typescript
import type { ContextPayload, TriageResult } from "./types.ts";
import { TRIAGE_THRESHOLD } from "./types.ts";
import { runHaikuTriage } from "./agents/triage.ts";

/**
 * Runs the Haiku triage check if triage is enabled.
 *
 * @param context - The assembled context payload
 * @param skipTriage - If true, skip triage and proceed to full review
 * @returns TriageResult if triage ran; null if skipped or if triage errors out
 *
 * Decision logic:
 * - If skipTriage is true: return null (proceed to full review)
 * - If triage_score < TRIAGE_THRESHOLD (0.15): early PASS (no Opus needed)
 * - If triage_score >= TRIAGE_THRESHOLD: return result (proceed to full review)
 *
 * Error handling:
 * - If Haiku times out or returns malformed output: return null (proceed to
 *   full review). Triage failure should never block the pipeline -- it's an
 *   optimization, not a safety gate.
 */
async function triageCheck(
  context: ContextPayload,
  skipTriage: boolean,
): Promise<TriageResult | null> {
  if (skipTriage) return null;

  try {
    const triageResult = await withTimeout(
      runHaikuTriage(context),
      TRIAGE_TIMEOUT_MS, // 5000ms
    );

    // Validate the result
    if (
      typeof triageResult.triage_score !== "number" ||
      triageResult.triage_score < 0 ||
      triageResult.triage_score > 1
    ) {
      console.error("[pipeline] Malformed triage result:", triageResult);
      return null; // proceed to full review on malformed output
    }

    return triageResult;
  } catch (error) {
    console.error(
      "[pipeline] Triage failed, proceeding to full review:",
      error,
    );
    return null; // triage failure -> full review (safe default)
  }
}
```

### Triage Early Exit

When triage produces a score below the threshold, the pipeline short-circuits to a PASS response without invoking any Opus agents. This is handled in the main orchestrator (see `reviewResponse()` below).

---

## Step 3: Parallel Agent Review

Runs all four review agents concurrently using `Promise.allSettled`. Individual agent failures do not crash the pipeline -- they produce default reports that trigger the ASK_HUMAN path through low confidence.

```typescript
import type {
  ContextPayload,
  AgentReports,
  ClinicalSafetyReport,
  BoundaryReport,
  RegulationReport,
  EscalationReport,
} from "./types.ts";
import { runClinicalSafetyAgent } from "./agents/clinical-safety.ts";
import { runBoundaryAgent } from "./agents/boundary.ts";
import { runRegulationAgent } from "./agents/regulation.ts";
import { runEscalationAgent } from "./agents/escalation.ts";

// ============================================================
// Default Reports (used when an agent fails)
// ============================================================

/**
 * Default reports for failed agents.
 *
 * Design: score=0.0 (does not inflate the final score) but confidence=0.0
 * (guarantees confidence < UNCERTAINTY_THRESHOLD, triggering ASK_HUMAN).
 * This ensures that agent failures are never silently passed -- they always
 * route to human review.
 *
 * Reference: Section 3.7 of Vigil.md, Edge Case 9 of spec 06.
 */
const DEFAULT_CLINICAL_SAFETY_REPORT: ClinicalSafetyReport = {
  risk_score: 0.0,
  confidence: 0.0,
  flags: [],
  evidence: "Agent failed -- default report substituted.",
  recommendation: "ASK_HUMAN",
  suggested_elements: [],
};

const DEFAULT_BOUNDARY_REPORT: BoundaryReport = {
  violation_score: 0.0,
  confidence: 0.0,
  flags: [],
  evidence: "Agent failed -- default report substituted.",
  recommendation: "ASK_HUMAN",
  suggested_elements: [],
};

const DEFAULT_REGULATION_REPORT: RegulationReport = {
  dysregulation_risk: 0.0,
  confidence: 0.0,
  inferred_state: "uncertain",
  state_confidence: 0.0,
  flags: [],
  evidence: "Agent failed -- default report substituted.",
  recommendation: "ASK_HUMAN",
  suggested_elements: [],
};

const DEFAULT_ESCALATION_REPORT: EscalationReport = {
  escalation_level: "LEVEL_0",
  confidence: 0.0,
  risk_type: "other",
  imminence: "uncertain",
  evidence: "Agent failed -- default report substituted.",
  protocol: "Agent failed. Route to human review.",
  human_handoff_recommended: false,
};

// ============================================================
// Parallel Agent Execution
// ============================================================

/**
 * Runs all 4 review agents in parallel using Promise.allSettled.
 *
 * Key design decisions:
 * - Promise.allSettled (NOT Promise.all) -- individual agent failures do not
 *   crash the pipeline. A fulfilled promise returns the agent's report. A
 *   rejected promise (timeout, malformed JSON, API error) returns a default
 *   report with confidence=0.0.
 *
 * - Each agent has a 30-second timeout. If an agent exceeds this, it is
 *   treated as a failure.
 *
 * - Failed agents are logged with full error details for debugging.
 *
 * - The failure count is tracked. If 2+ agents fail, the pipeline will
 *   override to BLOCK_AND_REPLACE in the main orchestrator (not here --
 *   this function only assembles reports).
 *
 * @param context - The assembled context payload
 * @returns AgentReports with all 4 reports (real or default) and failure count
 */
interface AgentReviewResult {
  reports: AgentReports;
  failureCount: number;
  failedAgents: string[];
}

async function runAgentReview(
  context: ContextPayload,
): Promise<AgentReviewResult> {
  const [clinicalResult, boundaryResult, regulationResult, escalationResult] =
    await Promise.allSettled([
      withTimeout(
        runClinicalSafetyAgent(context),
        AGENT_TIMEOUT_MS, // 30000ms
      ),
      withTimeout(runBoundaryAgent(context), AGENT_TIMEOUT_MS),
      withTimeout(runRegulationAgent(context), AGENT_TIMEOUT_MS),
      withTimeout(runEscalationAgent(context), AGENT_TIMEOUT_MS),
    ]);

  const failedAgents: string[] = [];

  // Extract results, substituting defaults for failures
  const clinical =
    clinicalResult.status === "fulfilled"
      ? clinicalResult.value
      : (() => {
          failedAgents.push("clinical_safety");
          console.error(
            "[pipeline] Clinical Safety Agent failed:",
            clinicalResult.reason,
          );
          return DEFAULT_CLINICAL_SAFETY_REPORT;
        })();

  const boundary =
    boundaryResult.status === "fulfilled"
      ? boundaryResult.value
      : (() => {
          failedAgents.push("boundary");
          console.error(
            "[pipeline] Boundary Agent failed:",
            boundaryResult.reason,
          );
          return DEFAULT_BOUNDARY_REPORT;
        })();

  const regulation =
    regulationResult.status === "fulfilled"
      ? regulationResult.value
      : (() => {
          failedAgents.push("regulation_aware");
          console.error(
            "[pipeline] Regulation Agent failed:",
            regulationResult.reason,
          );
          return DEFAULT_REGULATION_REPORT;
        })();

  const escalation =
    escalationResult.status === "fulfilled"
      ? escalationResult.value
      : (() => {
          failedAgents.push("escalation");
          console.error(
            "[pipeline] Escalation Agent failed:",
            escalationResult.reason,
          );
          return DEFAULT_ESCALATION_REPORT;
        })();

  return {
    reports: {
      clinical_safety: clinical,
      boundary: boundary,
      regulation_aware: regulation,
      escalation: escalation,
    },
    failureCount: failedAgents.length,
    failedAgents,
  };
}
```

---

## Step 4: Decision Engine

Pure, synchronous function. See spec 06 for the complete algorithm. The Pipeline Core calls it directly.

```typescript
import { computeDecision } from "./decision-engine.ts";
import type { AgentReports, DecisionResult } from "./types.ts";

// Called in the main orchestrator:
// const decisionResult: DecisionResult = computeDecision(reports);
//
// computeDecision is:
// - Pure (no side effects, no network calls)
// - Synchronous (returns immediately)
// - Deterministic (same input -> same output)
// - Sub-millisecond (arithmetic on 4 numbers)
//
// See spec 06 for the complete implementation.
```

---

## Step 5: Rewrite (Conditional)

The Rewrite Agent is invoked only when the Decision Engine returns REWRITE or BLOCK_AND_REPLACE. PASS and ASK_HUMAN deliver the original response. ESCALATE delivers a crisis protocol response.

```typescript
import type {
  DecisionResult,
  ContextPayload,
  RewriteResult,
  EscalationLevel,
} from "./types.ts";
import { runRewriteAgent } from "./agents/rewrite.ts";

/**
 * Conditionally invokes the Rewrite Agent based on the decision.
 *
 * Decision routing:
 * - PASS: No rewrite. Return null. Original response delivered as-is.
 * - ASK_HUMAN: No rewrite. Return null. Original response delivered, record
 *   marked for clinician review.
 * - REWRITE: Invoke Rewrite Agent in REWRITE mode (surgical edits preferred,
 *   preserve what's safe from the original).
 * - BLOCK_AND_REPLACE: Invoke Rewrite Agent in BLOCK_AND_REPLACE mode (full
 *   replacement, nothing salvaged from original).
 * - ESCALATE: Invoke Rewrite Agent in BLOCK_AND_REPLACE mode with escalation
 *   context (crisis protocol + resources must be included).
 *
 * Error handling:
 * - If the Rewrite Agent fails (timeout, malformed output, API error),
 *   fall back to a safe template response selected by escalation level.
 * - Rewrite failures are logged but never block the pipeline.
 *
 * @param decision - The DecisionResult from the Decision Engine
 * @param context - The original ContextPayload
 * @param originalResponse - The AI's original response text
 * @returns RewriteResult if a rewrite was performed, null if PASS/ASK_HUMAN
 */
async function rewriteIfNeeded(
  decision: DecisionResult,
  context: ContextPayload,
  originalResponse: string,
): Promise<RewriteResult | null> {
  // PASS and ASK_HUMAN: deliver original, no rewrite
  if (decision.decision === "PASS") return null;
  if (decision.decision === "ASK_HUMAN") return null;

  // REWRITE, BLOCK_AND_REPLACE, ESCALATE: invoke Rewrite Agent
  try {
    const rewriteResult = await withTimeout(
      runRewriteAgent({
        decision_type: decision.decision,
        original_response: originalResponse,
        user_message: context.user_message,
        // Last 10 messages for tone/context (not full 20 -- rewrite needs
        // less history than review agents)
        conversation_history: context.conversation_history.slice(-10),
        agent_reports: decision.agent_reports,
      }),
      REWRITE_TIMEOUT_MS, // 30000ms
    );

    // Validate the rewrite result
    if (
      !rewriteResult.rewritten_response ||
      typeof rewriteResult.rewritten_response !== "string" ||
      rewriteResult.rewritten_response.trim().length === 0
    ) {
      console.error(
        "[pipeline] Rewrite returned empty response, using safe template",
      );
      return buildSafeTemplateRewrite(decision);
    }

    return rewriteResult;
  } catch (error) {
    console.error(
      "[pipeline] Rewrite Agent failed, using safe template:",
      error,
    );
    return buildSafeTemplateRewrite(decision);
  }
}

/**
 * Builds a RewriteResult using a pre-written safe template.
 *
 * Safe templates are pre-written responses that are clinically appropriate
 * for the escalation level. They are NOT generated by an LLM -- they are
 * static, reviewed, and guaranteed safe.
 *
 * Template selection is based on the escalation level from the Escalation
 * Agent's report. A random template is selected from the pool to avoid
 * repetition across consecutive fallbacks.
 */
function buildSafeTemplateRewrite(decision: DecisionResult): RewriteResult {
  const escalationLevel = decision.agent_reports.escalation.escalation_level;
  const templates = SAFE_TEMPLATES[escalationLevel];
  const template = templates[Math.floor(Math.random() * templates.length)];

  return {
    rewritten_response: template,
    changes_made: [
      {
        type: "MODIFIED",
        content: template,
        reason:
          "Rewrite Agent failed -- safe template substituted based on escalation level.",
      },
    ],
    conflict_resolutions: [],
  };
}
```

---

## Step 6: Audit Logging

Every pipeline execution -- regardless of decision -- produces an audit record. Audit failures must never block the response to the user.

```typescript
import { insertAuditRecord } from "./audit-logger.ts";
import type {
  ContextPayload,
  DecisionResult,
  RewriteResult,
  TriageResult,
} from "./types.ts";

/**
 * Writes the audit record for this pipeline execution.
 *
 * Called unconditionally at the end of every pipeline run. The audit record
 * captures the complete decision context: input, all agent reports, the
 * decision, any rewrite, triage result, and pipeline latency.
 *
 * Error handling:
 * - If the audit insert fails (database error, network error, constraint
 *   violation), the error is logged but the pipeline still returns a
 *   response. Safety responses must never be blocked by audit failures.
 * - On failure, the audit_id is set to "AUDIT_WRITE_FAILED" in the
 *   response so the caller knows the record is missing.
 *
 * @returns The audit record UUID, or "AUDIT_WRITE_FAILED" on error
 */
async function logAudit(
  context: ContextPayload,
  decision: DecisionResult,
  rewrite: RewriteResult | null,
  triageResult: TriageResult | null,
  latencyMs: number,
): Promise<string> {
  try {
    const auditRecord = await insertAuditRecord({
      context,
      decision,
      rewriteResult: rewrite,
      triageScore: triageResult?.triage_score ?? null,
      latencyMs,
    });
    return auditRecord.id;
  } catch (error) {
    console.error("[CRITICAL] Audit trail write failed:", error);
    return "AUDIT_WRITE_FAILED";
  }
}
```

---

## Step 7: Response Assembly

Pure, synchronous function that constructs the final `VigilReviewResponse` from all pipeline outputs.

```typescript
import type {
  DecisionResult,
  RewriteResult,
  VigilReviewResponse,
  EscalationLevel,
} from "./types.ts";

/**
 * Assembles the final VigilReviewResponse from all pipeline outputs.
 *
 * Determines the final_response:
 * - If rewrite exists: use rewrite.rewritten_response
 * - If no rewrite (PASS or ASK_HUMAN): use the original AI response
 *
 * Flattens all flags from all agents into a single flags_summary array.
 * Extracts the escalation_level from the Escalation Agent's report.
 */
function assembleResponse(
  decision: DecisionResult,
  rewrite: RewriteResult | null,
  originalResponse: string,
  auditId: string,
  latencyMs: number,
): VigilReviewResponse {
  // Determine final response text
  const finalResponse = rewrite?.rewritten_response ?? originalResponse;

  // Flatten all flags from all agents into a single summary array
  const flagsSummary: string[] = [
    ...decision.agent_reports.clinical_safety.flags,
    ...decision.agent_reports.boundary.flags,
    ...decision.agent_reports.regulation_aware.flags,
    // Escalation agent uses escalation_level instead of flags array.
    // Include it as a flag if non-zero.
    ...(decision.agent_reports.escalation.escalation_level !== "LEVEL_0"
      ? [`ESCALATION_${decision.agent_reports.escalation.escalation_level}`]
      : []),
  ];

  // Extract escalation level
  const escalationLevel: EscalationLevel =
    decision.agent_reports.escalation.escalation_level;

  return {
    decision: decision.decision,
    final_response: finalResponse,
    final_score: decision.final_score,
    confidence: decision.confidence,
    flag_count: decision.flag_count,
    flags_summary: flagsSummary,
    escalation_level: escalationLevel,
    audit_id: auditId,
    latency_ms: latencyMs,
  };
}
```

---

## Main Orchestrator Function

The top-level function that ties all steps together. This is the single entry point for the pipeline.

```typescript
import type { VigilReviewRequest, VigilReviewResponse } from "./types.ts";

/**
 * The main Vigil review pipeline orchestrator.
 *
 * Executes the complete review flow:
 *   1. Context Assembly (sync)
 *   2. Triage -- optional fast pre-screen (async, Haiku)
 *      - If triage passes: early exit with PASS response
 *   3. Parallel Agent Review (async, 4x Opus in parallel)
 *   4. Decision Engine (sync, pure)
 *   5. Rewrite -- conditional (async, Opus)
 *   6. Audit Logging (async, database)
 *   7. Response Assembly (sync)
 *
 * The entire function is wrapped in a try/catch for catastrophic failure
 * protection. If the pipeline itself crashes, a generic safe response is
 * returned.
 *
 * @param request - The VigilReviewRequest from the API layer
 * @returns VigilReviewResponse with the final decision and response
 */
export async function reviewResponse(
  request: VigilReviewRequest,
): Promise<VigilReviewResponse> {
  const startTime = Date.now();

  try {
    // -------------------------------------------------------
    // Step 1: Context Assembly
    // -------------------------------------------------------
    const context = assembleContext(request);

    // -------------------------------------------------------
    // Step 2: Triage (optional)
    // -------------------------------------------------------
    const triageResult = await triageCheck(
      context,
      request.skip_triage ?? false,
    );

    // Triage early exit: if triage ran and score is below threshold, PASS
    if (triageResult && !triageResult.should_escalate_to_opus) {
      const latencyMs = Date.now() - startTime;

      // Build a minimal PASS decision for audit logging
      const earlyPassDecision: DecisionResult = {
        decision: "PASS",
        final_score: triageResult.triage_score,
        peak_score: triageResult.triage_score,
        breadth_bonus: 0,
        flag_count: 0,
        confidence: 1.0, // triage confidence is implicit in the threshold
        agent_reports: {
          clinical_safety: DEFAULT_CLINICAL_SAFETY_REPORT_PASS,
          boundary: DEFAULT_BOUNDARY_REPORT_PASS,
          regulation_aware: DEFAULT_REGULATION_REPORT_PASS,
          escalation: DEFAULT_ESCALATION_REPORT_PASS,
        },
      };

      // Log the triage-only audit record
      const auditId = await logAudit(
        context,
        earlyPassDecision,
        null,
        triageResult,
        latencyMs,
      );

      return {
        decision: "PASS",
        final_response: request.ai_response,
        final_score: triageResult.triage_score,
        confidence: 1.0,
        flag_count: 0,
        flags_summary: triageResult.flags,
        escalation_level: "LEVEL_0",
        audit_id: auditId,
        latency_ms: latencyMs,
      };
    }

    // -------------------------------------------------------
    // Step 3: Parallel Agent Review
    // -------------------------------------------------------
    const { reports, failureCount, failedAgents } =
      await runAgentReview(context);

    // 2+ agent failures: override to BLOCK_AND_REPLACE with safe template
    if (failureCount >= 2) {
      console.error(
        `[pipeline] ${failureCount} agents failed (${failedAgents.join(", ")}). ` +
          "Defaulting to BLOCK_AND_REPLACE with safe template.",
      );

      const latencyMs = Date.now() - startTime;
      const safeTemplate =
        SAFE_TEMPLATES["LEVEL_0"][
          Math.floor(Math.random() * SAFE_TEMPLATES["LEVEL_0"].length)
        ];

      const failureDecision: DecisionResult = {
        decision: "BLOCK_AND_REPLACE",
        final_score: 0.0,
        peak_score: 0.0,
        breadth_bonus: 0.0,
        flag_count: 0,
        confidence: 0.0,
        agent_reports: reports,
      };

      const failureRewrite: RewriteResult = {
        rewritten_response: safeTemplate,
        changes_made: [
          {
            type: "MODIFIED",
            content: safeTemplate,
            reason:
              `${failureCount} agents failed (${failedAgents.join(", ")}). ` +
              "Safe template substituted.",
          },
        ],
        conflict_resolutions: [],
      };

      const auditId = await logAudit(
        context,
        failureDecision,
        failureRewrite,
        triageResult,
        latencyMs,
      );

      return assembleResponse(
        failureDecision,
        failureRewrite,
        request.ai_response,
        auditId,
        latencyMs,
      );
    }

    // -------------------------------------------------------
    // Step 4: Decision Engine
    // -------------------------------------------------------
    const decisionResult = computeDecision(reports);

    // -------------------------------------------------------
    // Step 5: Rewrite (conditional)
    // -------------------------------------------------------
    const rewriteResult = await rewriteIfNeeded(
      decisionResult,
      context,
      request.ai_response,
    );

    // -------------------------------------------------------
    // Step 6: Audit Logging
    // -------------------------------------------------------
    const latencyMs = Date.now() - startTime;
    const auditId = await logAudit(
      context,
      decisionResult,
      rewriteResult,
      triageResult,
      latencyMs,
    );

    // -------------------------------------------------------
    // Step 7: Response Assembly
    // -------------------------------------------------------
    return assembleResponse(
      decisionResult,
      rewriteResult,
      request.ai_response,
      auditId,
      latencyMs,
    );
  } catch (error) {
    // -------------------------------------------------------
    // Catastrophic Failure Fallback
    // -------------------------------------------------------
    console.error("[CRITICAL] Pipeline crashed:", error);

    const latencyMs = Date.now() - startTime;
    const safeTemplate =
      SAFE_TEMPLATES["LEVEL_0"][
        Math.floor(Math.random() * SAFE_TEMPLATES["LEVEL_0"].length)
      ];

    // Attempt to log the crash (best-effort)
    let auditId = "PIPELINE_CRASH";
    try {
      const crashContext = assembleContext(request);
      auditId = await logAudit(
        crashContext,
        {
          decision: "BLOCK_AND_REPLACE",
          final_score: 0.0,
          peak_score: 0.0,
          breadth_bonus: 0.0,
          flag_count: 0,
          confidence: 0.0,
          agent_reports: {
            clinical_safety: DEFAULT_CLINICAL_SAFETY_REPORT,
            boundary: DEFAULT_BOUNDARY_REPORT,
            regulation_aware: DEFAULT_REGULATION_REPORT,
            escalation: DEFAULT_ESCALATION_REPORT,
          },
        },
        {
          rewritten_response: safeTemplate,
          changes_made: [
            {
              type: "MODIFIED",
              content: safeTemplate,
              reason: `Pipeline crashed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          conflict_resolutions: [],
        },
        null,
        latencyMs,
      );
    } catch {
      // Even audit logging failed -- nothing more we can do
      console.error("[CRITICAL] Crash audit logging also failed");
    }

    return {
      decision: "BLOCK_AND_REPLACE",
      final_response: safeTemplate,
      final_score: 0.0,
      confidence: 0.0,
      flag_count: 0,
      flags_summary: [],
      escalation_level: "LEVEL_0",
      audit_id: auditId,
      latency_ms: latencyMs,
    };
  }
}
```

---

## Triage Early-Pass Default Reports

When triage clears a message without full review, we still need placeholder agent reports for the audit record. These are distinct from the failure defaults -- they represent "not reviewed" rather than "review failed."

```typescript
/**
 * Placeholder reports for triage early-pass.
 *
 * These differ from failure defaults:
 * - confidence = 1.0 (triage decided with confidence, not agent failure)
 * - evidence explains why full review was skipped
 *
 * These exist solely for the audit trail -- no scoring decisions are made
 * from these reports.
 */
const DEFAULT_CLINICAL_SAFETY_REPORT_PASS: ClinicalSafetyReport = {
  risk_score: 0.0,
  confidence: 1.0,
  flags: [],
  evidence: "Triage cleared -- full review not performed.",
  recommendation: "PASS",
  suggested_elements: [],
};

const DEFAULT_BOUNDARY_REPORT_PASS: BoundaryReport = {
  violation_score: 0.0,
  confidence: 1.0,
  flags: [],
  evidence: "Triage cleared -- full review not performed.",
  recommendation: "PASS",
  suggested_elements: [],
};

const DEFAULT_REGULATION_REPORT_PASS: RegulationReport = {
  dysregulation_risk: 0.0,
  confidence: 1.0,
  inferred_state: "uncertain",
  state_confidence: 0.0,
  flags: [],
  evidence: "Triage cleared -- full review not performed.",
  recommendation: "PASS",
  suggested_elements: [],
};

const DEFAULT_ESCALATION_REPORT_PASS: EscalationReport = {
  escalation_level: "LEVEL_0",
  confidence: 1.0,
  risk_type: "other",
  imminence: "uncertain",
  evidence: "Triage cleared -- full review not performed.",
  protocol: "No protocol needed -- triage cleared.",
  human_handoff_recommended: false,
};
```

---

## Safe Template Responses

Pre-written, clinician-reviewed responses used as fallbacks when the Rewrite Agent fails or the pipeline encounters catastrophic errors. These are never LLM-generated -- they are static, safe, and guaranteed appropriate for their escalation level.

```typescript
/**
 * Safe template responses indexed by escalation level.
 *
 * Selection: When a safe template is needed, one is selected randomly from
 * the pool for the appropriate escalation level. Random selection avoids
 * repetition if multiple consecutive messages require fallbacks.
 *
 * These templates must be:
 * - Clinically appropriate for the escalation level
 * - Warm and conversational (not robotic or clinical-sounding)
 * - Non-specific (they work for any conversation context)
 * - Reviewed by a clinical advisor (post-hackathon)
 */
const SAFE_TEMPLATES: Record<EscalationLevel, string[]> = {
  LEVEL_0: [
    "I want to make sure I respond to you thoughtfully. Could you tell me more about what's on your mind?",
    "I'm taking a moment to think about what you've shared. What feels most important to you right now?",
    "I want to make sure I'm really hearing you. Can you help me understand what you're going through?",
  ],
  LEVEL_1: [
    "What you're sharing sounds really important. I want you to know that support is available anytime you need it -- you can reach the 988 Suicide & Crisis Lifeline by calling or texting 988, or text HOME to 741741 for the Crisis Text Line.",
    "Thank you for sharing that with me. If you ever feel like you need to talk to someone right away, the 988 Lifeline is available 24/7 -- just call or text 988.",
    "I hear you, and what you're going through matters. If you ever need immediate support, the 988 Suicide & Crisis Lifeline (call or text 988) and Crisis Text Line (text HOME to 741741) are there for you anytime.",
  ],
  LEVEL_2: [
    "I hear you, and I want to make sure you have support right now. Please know you can reach out to the 988 Suicide & Crisis Lifeline anytime by calling or texting 988, or text HOME to 741741 for the Crisis Text Line. You don't have to go through this alone.",
    "What you've shared is really important, and I want to make sure you're supported. The 988 Lifeline (call or text 988) is available 24/7, and you can also text HOME to 741741. Is there someone you trust that you could reach out to right now?",
    "Thank you for telling me this. Your safety matters, and I want to make sure you have the right support. You can reach the 988 Lifeline anytime by calling or texting 988, or the National Domestic Violence Hotline at 1-800-799-7233. You deserve help.",
  ],
  LEVEL_3: [
    "I'm really glad you told me this, and I want to make sure you get the support you need right now. Please reach out to the 988 Suicide & Crisis Lifeline by calling 988 -- talking to someone can really help. I'm going to stay right here with you.",
    "What you're going through sounds incredibly difficult, and you deserve support right now. Please call 988 to talk to someone who can help. You can also text HOME to 741741. I'm here with you and I'm not going anywhere.",
    "I hear you, and I take what you're saying seriously. Please reach out to the 988 Lifeline right now by calling 988. If you're in immediate danger, please call 911. You matter, and help is available right now.",
  ],
  LEVEL_4: [
    "I need you to hear me right now -- your life matters, and I want to help you stay safe. Please call 988 right now, or if you're in immediate danger, call 911. If there's someone near you, please tell them what's happening. I'm staying right here.",
    "This is important, and I'm taking it seriously. Please call 911 or 988 right now. If you've taken something or you're hurt, please tell someone near you immediately. You deserve help and it's available right now. I'm not going anywhere.",
    "Please hear me -- you matter, and I want you to be safe. Call 911 right now if you're in danger. You can also call 988 for the Crisis Lifeline. If someone is near you, please let them know what's happening. I'm right here with you.",
  ],
};
```

---

## Claude API Call Patterns

Each agent is called through the Anthropic Claude API with the following configuration:

### Review Agents (4x parallel)

| Parameter             | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| **Model**             | `claude-opus-4-6`                                           |
| **Max tokens**        | 2000                                                        |
| **Temperature**       | 0 (deterministic for safety-critical decisions)             |
| **System prompt**     | Agent-specific prompt (from specs 02-05) + per-agent corpus |
| **User message**      | The `ContextPayload` formatted as the user turn             |
| **Structured output** | JSON schema matching the agent's report type                |

### Rewrite Agent (1x conditional)

| Parameter             | Value                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------- |
| **Model**             | `claude-opus-4-6`                                                                           |
| **Max tokens**        | 4000 (rewrites can be longer than agent reports)                                            |
| **Temperature**       | 0                                                                                           |
| **System prompt**     | Rewrite Agent prompt (from spec 07)                                                         |
| **User message**      | Decision type + original response + user message + conversation history + all agent reports |
| **Structured output** | JSON schema matching `RewriteResult`                                                        |

### Haiku Triage (1x optional)

| Parameter             | Value                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| **Model**             | `claude-haiku` (latest available)                                        |
| **Max tokens**        | 500                                                                      |
| **Temperature**       | 0                                                                        |
| **System prompt**     | Triage prompt (from spec 08)                                             |
| **User message**      | `user_message` + `ai_response` (no full history -- triage is fast/cheap) |
| **Structured output** | JSON schema matching `TriageResult`                                      |

### API Call Helper

```typescript
import Anthropic from "npm:@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

/**
 * Calls Claude with structured JSON output.
 *
 * Used by all agents. The system prompt includes the output JSON schema
 * inline (as documented in each agent spec). Temperature is 0 for
 * deterministic safety-critical decisions.
 *
 * @param model - "claude-opus-4-6" for review/rewrite agents, Haiku for triage
 * @param systemPrompt - Agent-specific system prompt with corpus
 * @param userMessage - The formatted context payload
 * @param maxTokens - Token budget for the response
 * @returns Parsed JSON matching the agent's report schema
 */
async function callClaude<T>(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<T> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text content
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  // Parse JSON (agents are instructed to return raw JSON, no markdown)
  const parsed = JSON.parse(textBlock.text);
  return parsed as T;
}
```

---

## Timeouts

All async operations have explicit timeouts to prevent the pipeline from hanging indefinitely.

```typescript
// ============================================================
// Timeout Constants
// ============================================================

/** Haiku triage timeout. Triage is meant to be fast; 5s is generous. */
const TRIAGE_TIMEOUT_MS = 5_000;

/** Per-agent timeout. Opus with 50K+ context can take time. 30s per agent. */
const AGENT_TIMEOUT_MS = 30_000;

/** Rewrite Agent timeout. Similar complexity to a single review agent. */
const REWRITE_TIMEOUT_MS = 30_000;

/**
 * Full pipeline hard timeout. If the pipeline hasn't completed in 60s,
 * something is fundamentally wrong. The catastrophic failure handler returns
 * a safe template.
 *
 * Note: This timeout is applied at the API layer (spec 10), not within
 * the pipeline itself. The pipeline's internal timeouts should prevent
 * hitting this, but it exists as a final backstop.
 */
const PIPELINE_TIMEOUT_MS = 60_000;

// ============================================================
// Timeout Utility
// ============================================================

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified duration, it rejects with a TimeoutError.
 *
 * @param promise - The async operation to wrap
 * @param ms - Timeout in milliseconds
 * @returns The resolved value of the promise
 * @throws TimeoutError if the promise doesn't resolve in time
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
```

---

## Error Handling Strategy

The pipeline is designed with defense-in-depth error handling. Every failure mode has a defined fallback that preserves safety.

### Error Hierarchy

| Failure Mode              | Impact                                        | Fallback                                                                                                                 | Rationale                                                                                                                                       |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single agent failure**  | 1 of 4 agents missing                         | Continue with 3 agents. Failed agent gets default report (score=0.0, confidence=0.0). Low confidence triggers ASK_HUMAN. | One agent's absence does not mean the response is safe -- route to human review rather than silently passing.                                   |
| **2+ agent failures**     | Majority of review pipeline compromised       | Override to BLOCK_AND_REPLACE with LEVEL_0 safe template.                                                                | With 2+ agents down, the pipeline cannot make a reliable safety assessment. Block the response and log for investigation.                       |
| **All 4 agents fail**     | Complete review pipeline failure              | Same as 2+ failures: BLOCK_AND_REPLACE with safe template.                                                               | Extreme case of the above. The safe template is always available.                                                                               |
| **Rewrite Agent failure** | Decision was REWRITE/BLOCK but rewrite failed | Fall back to safe template selected by escalation level.                                                                 | The decision to intervene was correct; only the specific rewrite failed. A generic safe template is better than delivering the unsafe original. |
| **Audit logging failure** | Audit record not written                      | Log the error but still return the response. Set audit_id to "AUDIT_WRITE_FAILED".                                       | Never block a safety response because the audit database is down. The response to the user takes absolute priority.                             |
| **Full pipeline crash**   | Unhandled exception in orchestrator           | Return generic LEVEL_0 safe template. Attempt best-effort crash audit log.                                               | Last resort. The user gets a safe response. The error is logged for investigation.                                                              |
| **Triage failure**        | Haiku triage errors or times out              | Skip triage, proceed to full Opus review.                                                                                | Triage is an optimization, not a safety gate. If it fails, fall back to the comprehensive review.                                               |

### Error Logging

All errors are logged with the `[pipeline]` prefix for easy filtering. Critical errors (audit failures, pipeline crashes) use the `[CRITICAL]` prefix.

```typescript
// Standard error
console.error("[pipeline] Clinical Safety Agent failed:", error);

// Critical error
console.error("[CRITICAL] Audit trail write failed:", error);

// Catastrophic error
console.error("[CRITICAL] Pipeline crashed:", error);
```

### Error Propagation Rules

1. **Agent errors do NOT propagate.** They are caught in `runAgentReview()` and converted to default reports.
2. **Rewrite errors do NOT propagate.** They are caught in `rewriteIfNeeded()` and converted to safe template rewrites.
3. **Audit errors do NOT propagate.** They are caught in `logAudit()` and converted to a sentinel audit_id.
4. **Only catastrophic errors propagate** to the top-level catch in `reviewResponse()`, which returns a safe template response.

---

## Latency Budget

Target pipeline latency for the full Opus path (no triage):

| Stage                     | Expected Latency | Notes                                          |
| ------------------------- | ---------------- | ---------------------------------------------- |
| Context Assembly          | < 1ms            | Synchronous, in-memory                         |
| Triage (if enabled)       | ~200ms           | Haiku, fast model                              |
| Parallel Agent Review     | ~2-4s            | 4 agents in parallel, limited by slowest agent |
| Decision Engine           | < 1ms            | Synchronous, arithmetic                        |
| Rewrite (if needed)       | ~1-2s            | Single Opus call                               |
| Audit Logging             | ~50-100ms        | Single database insert                         |
| Response Assembly         | < 1ms            | Synchronous, in-memory                         |
| **Total (PASS)**          | **~2-4s**        | No rewrite needed                              |
| **Total (REWRITE/BLOCK)** | **~3-5s**        | Includes rewrite                               |
| **Total (triage PASS)**   | **~250-350ms**   | Haiku only, no Opus                            |

The parallel execution of 4 agents is critical to meeting the latency target. Sequential execution would result in ~8-12s for the review step alone.

---

## Demo Scenarios End-to-End

The pipeline must produce the correct decision for all 6 demo scenarios defined in `Vigil.md` Section 6 and traced through the Decision Engine truth table in spec 06.

| #   | Scenario                            | Expected Decision | Expected Score | Rewrite?                                    |
| --- | ----------------------------------- | ----------------- | -------------- | ------------------------------------------- |
| 1   | Missed Passive SI                   | BLOCK_AND_REPLACE | 0.82           | Yes (crisis-aware rewrite)                  |
| 2   | Premature Reframing During Shutdown | REWRITE           | 0.476          | Yes (grounding-first rewrite)               |
| 3   | Diagnostic Claim                    | REWRITE           | 0.568          | Yes (de-diagnose, add referral)             |
| 4   | Abuse Disclosure Minimization       | ESCALATE          | 0.95           | Yes (crisis protocol response)              |
| 5   | Dependency Reinforcement            | REWRITE           | 0.416          | Yes (boundaried, encourage outside support) |
| 6   | Clean Pass                          | PASS              | 0.035          | No (original delivered)                     |

### Triage Behavior for Demo Scenarios

For the demo, `skip_triage` is set to `true`, so all scenarios go through the full Opus pipeline. If triage were enabled:

| #   | Expected Triage Score | Triage Decision      |
| --- | --------------------- | -------------------- |
| 1   | >= 0.5                | Escalate to Opus     |
| 2   | >= 0.3                | Escalate to Opus     |
| 3   | >= 0.2                | Escalate to Opus     |
| 4   | >= 0.6                | Escalate to Opus     |
| 5   | >= 0.2                | Escalate to Opus     |
| 6   | < 0.15                | PASS (triage clears) |

---

## Acceptance Criteria

1. **End-to-end correctness.** Pipeline processes all 6 demo scenarios and produces the expected decision (matching the truth table in spec 06) for each.

2. **Parallel agent execution.** All 4 review agents execute concurrently (via `Promise.allSettled`), not sequentially. Verifiable by observing that total agent review time is approximately equal to the slowest individual agent, not the sum of all four.

3. **Single agent failure resilience.** When 1 agent fails (simulated timeout), the pipeline continues with the remaining 3 agents and produces a valid `VigilReviewResponse`. The failed agent's default report (confidence=0.0) causes the decision to route to ASK_HUMAN (unless escalation overrides).

4. **Multi-agent failure fallback.** When 2+ agents fail, the pipeline returns BLOCK_AND_REPLACE with a safe template response (not a crash, not an error).

5. **Triage early-exit.** When triage is enabled and the triage score is below `TRIAGE_THRESHOLD` (0.15), the pipeline returns PASS without invoking any Opus agents. An audit record is still written.

6. **Rewrite fallback.** When the Rewrite Agent fails after a REWRITE/BLOCK decision, the pipeline substitutes a safe template response appropriate to the escalation level.

7. **Audit completeness.** Every pipeline execution -- including PASS, triage early-exit, multi-agent failure, rewrite failure, and pipeline crash -- produces an audit record. The only exception is when audit logging itself fails, in which case `audit_id` is set to `"AUDIT_WRITE_FAILED"`.

8. **Latency target.** Full pipeline (4 parallel agents + decision + rewrite) completes in under 5 seconds for typical payloads. Measured as `Date.now() - startTime` at response assembly.

9. **Timeout enforcement.** No individual operation exceeds its timeout: Haiku triage (5s), each Opus agent (30s), Rewrite Agent (30s). The `withTimeout` utility is applied to all async external calls.

10. **Safe template availability.** Safe templates exist for all 5 escalation levels (LEVEL_0 through LEVEL_4). Each level has at least 3 templates. Templates are pre-written static strings, not LLM-generated.

11. **Error isolation.** No error in any component propagates to the caller as an unhandled exception. The top-level `try/catch` in `reviewResponse()` catches all unhandled errors and returns a safe response.

12. **Type conformance.** The returned `VigilReviewResponse` matches the schema defined in `00-overview.md` for all code paths (normal, triage early-exit, agent failure, rewrite failure, pipeline crash).

13. **Flags summary accuracy.** `flags_summary` contains the union of all flags from all 4 agents. No flags are dropped, no duplicates are introduced, and escalation level is included as a synthetic flag when non-zero.

14. **Deterministic decisions.** Given identical agent reports, the Decision Engine always produces the same decision. The pipeline's non-determinism comes only from LLM calls and timing -- not from the orchestration logic.
