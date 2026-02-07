// Decision Engine — Pure, synchronous, deterministic
// Spec 06: decision-engine.md

import type {
  AgentReports,
  DecisionResult,
  VigilDecisionType,
  EscalationLevel,
} from "./types.ts";

import {
  PASS_THRESHOLD,
  REWRITE_THRESHOLD,
  BLOCK_THRESHOLD,
  UNCERTAINTY_THRESHOLD,
  BREADTH_BONUS_PER_AGENT,
  BREADTH_BONUS_CAP,
  CLINICAL_SAFETY_WEIGHT,
  BOUNDARY_WEIGHT,
  REGULATION_WEIGHT,
  ESCALATION_WEIGHT,
  ESCALATION_NORMALIZATION,
  DECISION_SEVERITY,
} from "./types.ts";

/** Clamp a number to [0.0, 1.0]. Treats NaN/undefined as 0. */
function clamp01(value: number): number {
  if (typeof value !== "number" || isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Computes the Vigil decision from all agent reports.
 *
 * Pure function: no side effects, no async, deterministic.
 * Same input always produces same output.
 */
export function computeDecision(reports: AgentReports): DecisionResult {
  const clinical = reports.clinical_safety;
  const boundary = reports.boundary;
  const regulation = reports.regulation_aware;
  const escalation = reports.escalation;

  // Step 1: Clamp all agent scores to [0,1] to guard against malformed LLM output
  const clinicalScore = clamp01(clinical.risk_score);
  const boundaryScore = clamp01(boundary.violation_score);
  const regulationScore = clamp01(regulation.dysregulation_risk);

  // Step 2: Normalize escalation level to 0.0-1.0
  const escalation_normalized =
    ESCALATION_NORMALIZATION[escalation.escalation_level] ?? 0;

  // Step 3: Compute weighted scores
  const weighted_clinical = clinicalScore * CLINICAL_SAFETY_WEIGHT;
  const weighted_boundary = boundaryScore * BOUNDARY_WEIGHT;
  const weighted_regulation = regulationScore * REGULATION_WEIGHT;
  const weighted_escalation = escalation_normalized * ESCALATION_WEIGHT;

  // Step 4: Peak score
  const peak_score = Math.max(
    weighted_clinical,
    weighted_boundary,
    weighted_regulation,
    weighted_escalation,
  );

  // Step 5: Count flagging agents
  const flag_count = [
    clinical.flags.length > 0,
    boundary.flags.length > 0,
    regulation.flags.length > 0,
    escalation.escalation_level !== "LEVEL_0",
  ].filter(Boolean).length;

  // Step 6: Breadth bonus
  // 0 agents flag -> bonus = 0
  // 1 agent flags -> bonus = 0 (no consensus)
  // 2 agents flag -> bonus = 0.1
  // 3+ agents flag -> bonus = 0.2-0.25 (capped)
  const breadth_bonus = Math.min(
    BREADTH_BONUS_CAP,
    BREADTH_BONUS_PER_AGENT * Math.max(0, flag_count - 1),
  );

  // Step 7: Final score (clamped to 1.0)
  const final_score = Math.min(1.0, peak_score + breadth_bonus);

  // Step 8: Confidence (min of all agents)
  const confidence = Math.min(
    clamp01(clinical.confidence),
    clamp01(boundary.confidence),
    clamp01(regulation.confidence),
    clamp01(escalation.confidence),
  );

  // Step 9: Apply decision thresholds
  let decision: VigilDecisionType;

  // Low confidence triggers ASK_HUMAN only when there is NO escalation signal.
  // Any escalation level (LEVEL_1+) should be processed normally, not routed
  // to a human queue that may not exist at runtime.
  if (
    confidence < UNCERTAINTY_THRESHOLD &&
    escalation.escalation_level === "LEVEL_0"
  ) {
    decision = "ASK_HUMAN";
  } else if (final_score < PASS_THRESHOLD) {
    decision = "PASS";
  } else if (final_score < REWRITE_THRESHOLD) {
    decision = "REWRITE";
  } else if (final_score < BLOCK_THRESHOLD) {
    decision = "BLOCK_AND_REPLACE";
  } else {
    decision = "ESCALATE";
  }

  // Step 10: Escalation override rules
  // LEVEL_3+ -> always ESCALATE
  if (
    escalation.escalation_level === "LEVEL_3" ||
    escalation.escalation_level === "LEVEL_4"
  ) {
    decision = "ESCALATE";
  }

  // LEVEL_2 -> minimum BLOCK_AND_REPLACE
  if (
    escalation.escalation_level === "LEVEL_2" &&
    DECISION_SEVERITY[decision] < DECISION_SEVERITY["BLOCK_AND_REPLACE"]
  ) {
    decision = "BLOCK_AND_REPLACE";
  }

  // LEVEL_1 -> minimum REWRITE (ensure elevated risk is never PASSed)
  if (
    escalation.escalation_level === "LEVEL_1" &&
    DECISION_SEVERITY[decision] < DECISION_SEVERITY["REWRITE"]
  ) {
    decision = "REWRITE";
  }

  // Step 11: Assemble result
  return {
    decision,
    final_score,
    peak_score,
    breadth_bonus,
    flag_count,
    confidence,
    agent_reports: reports,
  };
}
