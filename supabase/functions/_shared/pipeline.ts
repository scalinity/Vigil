// Pipeline Core — Spec 01
// Main orchestrator: context assembly → triage → parallel review → decision → rewrite → audit → response

import type {
  VigilReviewRequest,
  VigilReviewResponse,
  ContextPayload,
  SessionMetadata,
  AgentReports,
  DecisionResult,
  RewriteResult,
  TriageResult,
  ClinicalSafetyReport,
  BoundaryReport,
  RegulationReport,
  EscalationReport,
  EscalationLevel,
} from "./types.ts";
import { MAX_CONVERSATION_HISTORY } from "./types.ts";
import { computeDecision, clamp01 } from "./decision-engine.ts";
import { insertAuditRecord } from "./audit-logger.ts";
import { runClinicalSafetyAgent } from "./agents/clinical-safety.ts";
import { runBoundaryAgent } from "./agents/boundary.ts";
import { runRegulationAgent } from "./agents/regulation.ts";
import { runEscalationAgent } from "./agents/escalation.ts";
import { runRewriteAgent } from "./agents/rewrite.ts";
import { runHaikuTriage } from "./agents/triage.ts";

// ============================================================
// Timeout Constants
// ============================================================

const TRIAGE_TIMEOUT_MS = 5_000;
const AGENT_TIMEOUT_MS = 30_000;
const REWRITE_TIMEOUT_MS = 30_000;

// ============================================================
// Timeout Utility
// ============================================================

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

// ============================================================
// Safe Template Responses
// ============================================================

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

// ============================================================
// Default Reports — Agent Failure
// ============================================================

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
  escalation_level: "LEVEL_1",
  confidence: 0.0,
  risk_type: "other",
  imminence: "uncertain",
  evidence:
    "Agent failed -- default report substituted. Escalated to LEVEL_1 as fail-safe.",
  protocol:
    "Agent failed. Escalated to LEVEL_1 as fail-safe. Route to human review.",
  human_handoff_recommended: false,
};

// ============================================================
// Default Reports — Triage Early Pass
// ============================================================

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

// ============================================================
// Step 1: Context Assembly
// ============================================================

function assembleContext(request: VigilReviewRequest): ContextPayload {
  const trimmedHistory = request.conversation_history.slice(
    -MAX_CONVERSATION_HISTORY,
  );

  // Use original length, not trimmed length, so audit records reflect true session size.
  // +2 accounts for the current user_message and ai_response under review.
  const messageCount = request.conversation_history.length + 2;

  const sessionMetadata: SessionMetadata = {
    session_id: request.session_id,
    session_start:
      trimmedHistory.length > 0
        ? trimmedHistory[0].timestamp
        : new Date().toISOString(),
    message_count: messageCount,
    prior_interventions: 0,
    prior_escalation_level: "LEVEL_0",
  };

  return {
    user_message: request.user_message,
    ai_response: request.ai_response,
    conversation_history: trimmedHistory,
    session_metadata: sessionMetadata,
  };
}

// ============================================================
// Step 2: Triage (Optional)
// ============================================================

async function triageCheck(
  context: ContextPayload,
  skipTriage: boolean,
): Promise<TriageResult | null> {
  if (skipTriage) return null;

  try {
    const triageResult = await withTimeout(
      runHaikuTriage(context),
      TRIAGE_TIMEOUT_MS,
    );

    if (
      typeof triageResult.triage_score !== "number" ||
      isNaN(triageResult.triage_score) ||
      triageResult.triage_score < 0 ||
      triageResult.triage_score > 1
    ) {
      console.error("[pipeline] Malformed triage result:", triageResult);
      return null;
    }

    if (typeof triageResult.should_escalate_to_opus !== "boolean") {
      console.error(
        "[pipeline] Malformed triage result: should_escalate_to_opus is not boolean",
      );
      return null; // proceed to full review on malformed output
    }

    return triageResult;
  } catch (error) {
    console.error(
      "[pipeline] Triage failed, proceeding to full review:",
      error,
    );
    return null;
  }
}

// ============================================================
// Step 3: Parallel Agent Review
// ============================================================

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
      withTimeout(runClinicalSafetyAgent(context), AGENT_TIMEOUT_MS),
      withTimeout(runBoundaryAgent(context), AGENT_TIMEOUT_MS),
      withTimeout(runRegulationAgent(context), AGENT_TIMEOUT_MS),
      withTimeout(runEscalationAgent(context), AGENT_TIMEOUT_MS),
    ]);

  const failedAgents: string[] = [];

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

  // Sanitize agent scores to guard against malformed LLM output
  clinical.risk_score = clamp01(clinical.risk_score);
  clinical.confidence = clamp01(clinical.confidence);
  if (!Array.isArray(clinical.flags)) clinical.flags = [];

  boundary.violation_score = clamp01(boundary.violation_score);
  boundary.confidence = clamp01(boundary.confidence);
  if (!Array.isArray(boundary.flags)) boundary.flags = [];

  regulation.dysregulation_risk = clamp01(regulation.dysregulation_risk);
  regulation.confidence = clamp01(regulation.confidence);
  if (!Array.isArray(regulation.flags)) regulation.flags = [];

  escalation.confidence = clamp01(escalation.confidence);

  // Validate escalation_level to prevent NaN propagation in decision engine
  const VALID_LEVELS = new Set([
    "LEVEL_0",
    "LEVEL_1",
    "LEVEL_2",
    "LEVEL_3",
    "LEVEL_4",
  ]);
  if (!VALID_LEVELS.has(escalation.escalation_level)) {
    console.error(
      "[pipeline] Malformed escalation_level, defaulting to LEVEL_0:",
      escalation.escalation_level,
    );
    escalation.escalation_level = "LEVEL_0";
  }

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

// ============================================================
// Step 5: Rewrite (Conditional)
// ============================================================

async function rewriteIfNeeded(
  decision: DecisionResult,
  context: ContextPayload,
  originalResponse: string,
): Promise<RewriteResult | null> {
  if (decision.decision === "PASS") return null;

  // ASK_HUMAN means confidence is too low to trust the assessment.
  // There is no human in the loop at runtime, so we MUST NOT deliver
  // the original response. Use a safe template instead.
  if (decision.decision === "ASK_HUMAN") {
    return buildSafeTemplateRewrite(decision);
  }

  // ESCALATE: always use safe template with crisis resources.
  // Too dangerous to rely on the rewrite agent for the highest-severity case.
  if (decision.decision === "ESCALATE") {
    return buildSafeTemplateRewrite(decision);
  }

  try {
    const rewriteResult = await withTimeout(
      runRewriteAgent({
        decision_type: decision.decision,
        original_response: originalResponse,
        user_message: context.user_message,
        conversation_history: context.conversation_history.slice(-10),
        agent_reports: decision.agent_reports,
      }),
      REWRITE_TIMEOUT_MS,
    );

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

function buildSafeTemplateRewrite(decision: DecisionResult): RewriteResult {
  const escalationLevel = decision.agent_reports.escalation.escalation_level;
  const templates =
    SAFE_TEMPLATES[escalationLevel] ?? SAFE_TEMPLATES["LEVEL_0"];
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

// ============================================================
// Step 6: Audit Logging
// ============================================================

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

// ============================================================
// Step 7: Response Assembly
// ============================================================

function assembleResponse(
  decision: DecisionResult,
  rewrite: RewriteResult | null,
  originalResponse: string,
  auditId: string,
  latencyMs: number,
): VigilReviewResponse {
  const finalResponse = rewrite?.rewritten_response ?? originalResponse;

  const flagsSummary: string[] = [
    ...decision.agent_reports.clinical_safety.flags,
    ...decision.agent_reports.boundary.flags,
    ...decision.agent_reports.regulation_aware.flags,
    ...(decision.agent_reports.escalation.escalation_level !== "LEVEL_0"
      ? [`ESCALATION_${decision.agent_reports.escalation.escalation_level}`]
      : []),
  ];

  const escalationLevel: EscalationLevel =
    decision.agent_reports.escalation.escalation_level;

  return {
    decision: decision.decision,
    final_response: finalResponse,
    final_score: decision.final_score,
    confidence: decision.confidence,
    peak_score: decision.peak_score,
    breadth_bonus: decision.breadth_bonus,
    flag_count: decision.flag_count,
    flags_summary: flagsSummary,
    escalation_level: escalationLevel,
    audit_id: auditId,
    latency_ms: latencyMs,
  };
}

// ============================================================
// Main Orchestrator
// ============================================================

export async function reviewResponse(
  request: VigilReviewRequest,
): Promise<VigilReviewResponse> {
  const startTime = Date.now();

  try {
    // Step 1: Context Assembly
    const context = assembleContext(request);

    // Step 2: Triage (optional)
    const triageResult = await triageCheck(
      context,
      request.skip_triage ?? false,
    );

    // Triage early exit
    if (triageResult && !triageResult.should_escalate_to_opus) {
      const latencyMs = Date.now() - startTime;

      const earlyPassDecision: DecisionResult = {
        decision: "PASS",
        final_score: triageResult.triage_score,
        peak_score: triageResult.triage_score,
        breadth_bonus: 0,
        flag_count: 0,
        confidence: 1.0,
        agent_reports: {
          clinical_safety: DEFAULT_CLINICAL_SAFETY_REPORT_PASS,
          boundary: DEFAULT_BOUNDARY_REPORT_PASS,
          regulation_aware: DEFAULT_REGULATION_REPORT_PASS,
          escalation: DEFAULT_ESCALATION_REPORT_PASS,
        },
      };

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
        peak_score: triageResult.triage_score,
        breadth_bonus: 0,
        flag_count: 0,
        flags_summary: triageResult.flags,
        escalation_level: "LEVEL_0",
        audit_id: auditId,
        latency_ms: latencyMs,
      };
    }

    // Step 3: Parallel Agent Review
    const { reports, failureCount, failedAgents } =
      await runAgentReview(context);

    // 2+ agent failures: override to BLOCK_AND_REPLACE
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

    // Step 4: Decision Engine
    const decisionResult = computeDecision(reports);

    // Step 5: Rewrite (conditional)
    const rewriteResult = await rewriteIfNeeded(
      decisionResult,
      context,
      request.ai_response,
    );

    // Step 6: Audit Logging
    const latencyMs = Date.now() - startTime;
    const auditId = await logAudit(
      context,
      decisionResult,
      rewriteResult,
      triageResult,
      latencyMs,
    );

    // Step 7: Response Assembly
    return assembleResponse(
      decisionResult,
      rewriteResult,
      request.ai_response,
      auditId,
      latencyMs,
    );
  } catch (error) {
    // Catastrophic Failure Fallback — do NOT log user content
    console.error(
      "[CRITICAL] Pipeline crashed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    const latencyMs = Date.now() - startTime;
    const safeTemplate =
      SAFE_TEMPLATES["LEVEL_0"][
        Math.floor(Math.random() * SAFE_TEMPLATES["LEVEL_0"].length)
      ];

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
      console.error("[CRITICAL] Crash audit logging also failed");
    }

    return {
      decision: "BLOCK_AND_REPLACE",
      final_response: safeTemplate,
      final_score: 0.0,
      confidence: 0.0,
      peak_score: 0.0,
      breadth_bonus: 0.0,
      flag_count: 0,
      flags_summary: [],
      escalation_level: "LEVEL_0",
      audit_id: auditId,
      latency_ms: latencyMs,
    };
  }
}
