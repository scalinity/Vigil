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

  // Step 2: Normalize escalation level to 0.0-1.0
  const escalation_normalized =
    ESCALATION_NORMALIZATION[escalation.escalation_level];

  // Step 3: Compute weighted scores
  const weighted_clinical = clinical.risk_score * CLINICAL_SAFETY_WEIGHT;
  const weighted_boundary = boundary.violation_score * BOUNDARY_WEIGHT;
  const weighted_regulation = regulation.dysregulation_risk * REGULATION_WEIGHT;
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

  // Step 6: Breadth bonus (first flagging agent is "free")
  const breadth_bonus = Math.min(
    BREADTH_BONUS_CAP,
    BREADTH_BONUS_PER_AGENT * Math.max(0, flag_count - 1),
  );

  // Step 7: Final score
  const final_score = Math.min(1.0, peak_score + breadth_bonus);

  // Step 8: Confidence (min of all agents)
  const confidence = Math.min(
    clinical.confidence,
    boundary.confidence,
    regulation.confidence,
    escalation.confidence,
  );

  // Step 9: Apply decision thresholds
  let decision: VigilDecisionType;

  if (
    confidence < UNCERTAINTY_THRESHOLD &&
    escalation.escalation_level !== "LEVEL_2" &&
    escalation.escalation_level !== "LEVEL_3" &&
    escalation.escalation_level !== "LEVEL_4"
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
