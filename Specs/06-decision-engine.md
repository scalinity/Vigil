# Spec 06: Decision Engine

## Purpose

Aggregate all agent outputs into a single deterministic decision. The Decision Engine is a **pure algorithm** -- no LLM calls, no network requests, no side effects. It takes four agent reports as input, applies peak severity scoring with a breadth bonus, respects escalation overrides, and returns a `DecisionResult`.

The decision vocabulary is: `PASS`, `REWRITE`, `BLOCK_AND_REPLACE`, `ESCALATE`, `ASK_HUMAN`.

## Dependencies

- **00-overview.md**: `DecisionResult`, `AgentReports`, `VigilDecisionType`, `EscalationLevel`, `ClinicalSafetyReport`, `BoundaryReport`, `RegulationReport`, `EscalationReport`

## Interface

### Input

`AgentReports` -- the combined output of all four review agents:

```typescript
interface AgentReports {
  clinical_safety: ClinicalSafetyReport;
  boundary: BoundaryReport;
  regulation_aware: RegulationReport;
  escalation: EscalationReport;
}
```

Each agent report contains a primary score, a confidence value, and a list of flags. The relevant fields consumed by the Decision Engine are:

| Agent            | Score Field          | Confidence Field | Flags Field |
| ---------------- | -------------------- | ---------------- | ----------- |
| Clinical Safety  | `risk_score`         | `confidence`     | `flags`     |
| Boundary         | `violation_score`    | `confidence`     | `flags`     |
| Regulation-Aware | `dysregulation_risk` | `confidence`     | `flags`     |
| Escalation       | `escalation_level`   | `confidence`     | (see below) |

The Escalation Agent does not use a numeric score directly -- it reports an `EscalationLevel` enum that must be normalized to a `[0.0, 1.0]` range. Its "flags" equivalent for breadth calculation is whether `escalation_level >= LEVEL_1` (i.e., any non-zero escalation counts as flagged).

### Output

```typescript
interface DecisionResult {
  decision: VigilDecisionType;
  final_score: number; // 0.0 - 1.0
  peak_score: number; // max of weighted agent scores
  breadth_bonus: number; // bonus from multiple agents flagging
  flag_count: number; // number of agents with any flags
  confidence: number; // min of all agent confidences
  agent_reports: AgentReports;
}
```

---

## Constants

All thresholds and weights are defined in `00-overview.md` and reproduced here for completeness. The canonical values live in `_shared/types.ts`.

```typescript
// === Decision Thresholds ===
const PASS_THRESHOLD = 0.3;
const REWRITE_THRESHOLD = 0.7;
const BLOCK_THRESHOLD = 0.9;
const UNCERTAINTY_THRESHOLD = 0.4;

// === Breadth Bonus ===
const BREADTH_BONUS_PER_AGENT = 0.1;
const BREADTH_BONUS_CAP = 0.25;

// === Agent Weights ===
const CLINICAL_SAFETY_WEIGHT = 1.0;
const BOUNDARY_WEIGHT = 0.8;
const REGULATION_WEIGHT = 0.7;
const ESCALATION_WEIGHT = 1.0;

// === Escalation Normalization ===
const ESCALATION_NORMALIZATION: Record<EscalationLevel, number> = {
  LEVEL_0: 0.0,
  LEVEL_1: 0.25,
  LEVEL_2: 0.5,
  LEVEL_3: 0.75,
  LEVEL_4: 1.0,
};
```

---

## Algorithm

The following is the complete, implementable algorithm in TypeScript. The function is **synchronous** and **pure** -- same input always produces same output.

```typescript
function computeDecision(reports: AgentReports): DecisionResult {
  // -------------------------------------------------------
  // Step 1: Input validation
  // -------------------------------------------------------
  // All scores must be in [0.0, 1.0]. If any agent report is
  // missing (agent failure), use default: score=0.0,
  // confidence=0.0, flags=[]. A confidence of 0.0 from a
  // failed agent WILL trigger ASK_HUMAN -- this is intentional
  // (Section 3.7 of Vigil.md).

  const clinical = reports.clinical_safety;
  const boundary = reports.boundary;
  const regulation = reports.regulation_aware;
  const escalation = reports.escalation;

  // -------------------------------------------------------
  // Step 2: Normalize escalation level to 0.0-1.0
  // -------------------------------------------------------
  const escalation_normalized =
    ESCALATION_NORMALIZATION[escalation.escalation_level];

  // -------------------------------------------------------
  // Step 3: Compute weighted scores for each agent
  // -------------------------------------------------------
  const weighted_clinical = clinical.risk_score * CLINICAL_SAFETY_WEIGHT;
  const weighted_boundary = boundary.violation_score * BOUNDARY_WEIGHT;
  const weighted_regulation = regulation.dysregulation_risk * REGULATION_WEIGHT;
  const weighted_escalation = escalation_normalized * ESCALATION_WEIGHT;

  // -------------------------------------------------------
  // Step 4: Find peak score (max of weighted scores)
  // -------------------------------------------------------
  const peak_score = Math.max(
    weighted_clinical,
    weighted_boundary,
    weighted_regulation,
    weighted_escalation,
  );

  // -------------------------------------------------------
  // Step 5: Count flagging agents
  // -------------------------------------------------------
  // An agent "has flags" if:
  //   - Clinical Safety: flags.length > 0
  //   - Boundary: flags.length > 0
  //   - Regulation-Aware: flags.length > 0
  //   - Escalation: escalation_level >= LEVEL_1
  const flag_count = [
    clinical.flags.length > 0,
    boundary.flags.length > 0,
    regulation.flags.length > 0,
    escalation.escalation_level !== "LEVEL_0",
  ].filter(Boolean).length;

  // -------------------------------------------------------
  // Step 6: Compute breadth bonus
  // -------------------------------------------------------
  // Breadth bonus rewards multi-agent agreement. It only
  // kicks in when 2+ agents flag concerns (first flagging
  // agent is "free" -- the bonus is for corroboration).
  const breadth_bonus = Math.min(
    BREADTH_BONUS_CAP,
    BREADTH_BONUS_PER_AGENT * Math.max(0, flag_count - 1),
  );

  // -------------------------------------------------------
  // Step 7: Compute final score
  // -------------------------------------------------------
  const final_score = Math.min(1.0, peak_score + breadth_bonus);

  // -------------------------------------------------------
  // Step 8: Compute confidence (min of all agents)
  // -------------------------------------------------------
  const confidence = Math.min(
    clinical.confidence,
    boundary.confidence,
    regulation.confidence,
    escalation.confidence,
  );

  // -------------------------------------------------------
  // Step 9: Apply decision thresholds
  // -------------------------------------------------------
  let decision: VigilDecisionType;

  if (
    confidence < UNCERTAINTY_THRESHOLD &&
    escalation.escalation_level !== "LEVEL_2" &&
    escalation.escalation_level !== "LEVEL_3" &&
    escalation.escalation_level !== "LEVEL_4"
  ) {
    // ASK_HUMAN only applies when NO agent flags LEVEL_2+
    // escalation. Safety overrides uncertainty.
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

  // -------------------------------------------------------
  // Step 10: Apply escalation override rules
  // -------------------------------------------------------
  // These overrides ensure that high escalation levels
  // ALWAYS produce at least the minimum decision severity,
  // regardless of what the scoring algorithm computed.

  const DECISION_SEVERITY: Record<VigilDecisionType, number> = {
    PASS: 0,
    ASK_HUMAN: 1,
    REWRITE: 2,
    BLOCK_AND_REPLACE: 3,
    ESCALATE: 4,
  };

  // LEVEL_3 or LEVEL_4 -> always ESCALATE
  if (
    escalation.escalation_level === "LEVEL_3" ||
    escalation.escalation_level === "LEVEL_4"
  ) {
    decision = "ESCALATE";
  }

  // LEVEL_2 -> minimum decision is BLOCK_AND_REPLACE
  if (
    escalation.escalation_level === "LEVEL_2" &&
    DECISION_SEVERITY[decision] < DECISION_SEVERITY["BLOCK_AND_REPLACE"]
  ) {
    decision = "BLOCK_AND_REPLACE";
  }

  // -------------------------------------------------------
  // Step 11: Assemble result
  // -------------------------------------------------------
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
```

### Algorithm Summary (Prose)

1. **Normalize** the escalation level enum to a float in `[0.0, 1.0]` using the normalization table.
2. **Weight** each agent's primary score by its weight. Clinical Safety and Escalation have weight 1.0 (highest authority). Boundary has 0.8. Regulation has 0.7.
3. **Peak score** is the maximum of the four weighted scores. This ensures a single severe finding dominates the decision -- a critical safety issue is not diluted by three clean agents.
4. **Flag count** is the number of agents with any flags (or non-zero escalation level). This measures breadth of concern.
5. **Breadth bonus** adds 0.10 per additional flagging agent beyond the first, capped at 0.25. This ensures that many moderate concerns across agents can push a decision higher than any single agent would alone.
6. **Final score** is `min(1.0, peak_score + breadth_bonus)`.
7. **Confidence** is the minimum confidence across all agents. One uncertain agent lowers the overall confidence of the decision.
8. **Threshold application** maps final_score to a decision using four thresholds: `< 0.3` = PASS, `< 0.7` = REWRITE, `< 0.9` = BLOCK_AND_REPLACE, `>= 0.9` = ESCALATE.
9. **Uncertainty override**: If confidence is below 0.4, the decision becomes ASK_HUMAN -- unless a high-level escalation (LEVEL_2+) is in play, because safety overrides uncertainty.
10. **Escalation overrides**: LEVEL_3+ always forces ESCALATE. LEVEL_2 forces at least BLOCK_AND_REPLACE. These overrides are applied last and can only increase severity, never decrease it.

---

## Truth Table

All six demo scenarios traced through the engine with exact numbers. These serve as acceptance tests.

### Scenario 1: Missed Passive SI

**Agent Outputs:**

| Agent            | Score Field          | Value   | Confidence | Flags                                      |
| ---------------- | -------------------- | ------- | ---------- | ------------------------------------------ |
| Clinical Safety  | `risk_score`         | 0.72    | 0.85       | `[MISSED_RISK_SIGNAL, UNSAFE_REASSURANCE]` |
| Boundary         | `violation_score`    | 0.05    | 0.90       | `[]`                                       |
| Regulation-Aware | `dysregulation_risk` | 0.15    | 0.70       | `[]`                                       |
| Escalation       | `escalation_level`   | LEVEL_2 | 0.80       | (LEVEL_2 >= LEVEL_1 -> flagged)            |

**Calculation:**

```
Step 2: escalation_normalized = 0.5

Step 3: weighted scores
  clinical:   0.72 * 1.0 = 0.72
  boundary:   0.05 * 0.8 = 0.04
  regulation: 0.15 * 0.7 = 0.105
  escalation: 0.5  * 1.0 = 0.5

Step 4: peak_score = max(0.72, 0.04, 0.105, 0.5) = 0.72

Step 5: flag_count = 2  (clinical has flags, escalation >= LEVEL_1)

Step 6: breadth_bonus = min(0.25, 0.10 * max(0, 2-1)) = min(0.25, 0.10) = 0.10

Step 7: final_score = min(1.0, 0.72 + 0.10) = 0.82

Step 8: confidence = min(0.85, 0.90, 0.70, 0.80) = 0.70

Step 9: confidence (0.70) >= UNCERTAINTY_THRESHOLD (0.4)
         final_score (0.82) >= 0.7, < 0.9 -> BLOCK_AND_REPLACE

Step 10: escalation_level = LEVEL_2 -> minimum BLOCK_AND_REPLACE
         current decision is already BLOCK_AND_REPLACE -> no change
```

**Result:** `BLOCK_AND_REPLACE` | final_score=0.82 | confidence=0.70

---

### Scenario 2: Premature Reframing During Shutdown

**Agent Outputs:**

| Agent            | Score Field          | Value   | Confidence | Flags                                                        |
| ---------------- | -------------------- | ------- | ---------- | ------------------------------------------------------------ |
| Clinical Safety  | `risk_score`         | 0.15    | 0.80       | `[]`                                                         |
| Boundary         | `violation_score`    | 0.05    | 0.85       | `[]`                                                         |
| Regulation-Aware | `dysregulation_risk` | 0.68    | 0.75       | `[PREMATURE_REFRAME, MISSED_GROUNDING_NEED, STATE_MISMATCH]` |
| Escalation       | `escalation_level`   | LEVEL_0 | 0.90       | (LEVEL_0 -> not flagged)                                     |

**Calculation:**

```
Step 2: escalation_normalized = 0.0

Step 3: weighted scores
  clinical:   0.15 * 1.0 = 0.15
  boundary:   0.05 * 0.8 = 0.04
  regulation: 0.68 * 0.7 = 0.476
  escalation: 0.0  * 1.0 = 0.0

Step 4: peak_score = max(0.15, 0.04, 0.476, 0.0) = 0.476

Step 5: flag_count = 1  (only regulation has flags)

Step 6: breadth_bonus = min(0.25, 0.10 * max(0, 1-1)) = min(0.25, 0.0) = 0.0

Step 7: final_score = min(1.0, 0.476 + 0.0) = 0.476

Step 8: confidence = min(0.80, 0.85, 0.75, 0.90) = 0.75

Step 9: confidence (0.75) >= UNCERTAINTY_THRESHOLD (0.4)
         final_score (0.476) >= 0.3, < 0.7 -> REWRITE

Step 10: escalation_level = LEVEL_0 -> no override
```

**Result:** `REWRITE` | final_score=0.476 | confidence=0.75

---

### Scenario 3: Diagnostic Claim

**Agent Outputs:**

| Agent            | Score Field          | Value   | Confidence | Flags                                |
| ---------------- | -------------------- | ------- | ---------- | ------------------------------------ |
| Clinical Safety  | `risk_score`         | 0.10    | 0.85       | `[]`                                 |
| Boundary         | `violation_score`    | 0.71    | 0.88       | `[DIAGNOSTIC_CLAIM, MEDICAL_ADVICE]` |
| Regulation-Aware | `dysregulation_risk` | 0.05    | 0.80       | `[]`                                 |
| Escalation       | `escalation_level`   | LEVEL_0 | 0.92       | (LEVEL_0 -> not flagged)             |

**Calculation:**

```
Step 2: escalation_normalized = 0.0

Step 3: weighted scores
  clinical:   0.10 * 1.0 = 0.10
  boundary:   0.71 * 0.8 = 0.568
  regulation: 0.05 * 0.7 = 0.035
  escalation: 0.0  * 1.0 = 0.0

Step 4: peak_score = max(0.10, 0.568, 0.035, 0.0) = 0.568

Step 5: flag_count = 1  (only boundary has flags)

Step 6: breadth_bonus = min(0.25, 0.10 * max(0, 1-1)) = min(0.25, 0.0) = 0.0

Step 7: final_score = min(1.0, 0.568 + 0.0) = 0.568

Step 8: confidence = min(0.85, 0.88, 0.80, 0.92) = 0.80

Step 9: confidence (0.80) >= UNCERTAINTY_THRESHOLD (0.4)
         final_score (0.568) >= 0.3, < 0.7 -> REWRITE

Step 10: escalation_level = LEVEL_0 -> no override
```

**Result:** `REWRITE` | final_score=0.568 | confidence=0.80

---

### Scenario 4: Abuse Disclosure Minimization

**Agent Outputs:**

| Agent            | Score Field          | Value   | Confidence | Flags                                     |
| ---------------- | -------------------- | ------- | ---------- | ----------------------------------------- |
| Clinical Safety  | `risk_score`         | 0.75    | 0.85       | `[NORMALIZATION_OF_HARM, HARMFUL_ADVICE]` |
| Boundary         | `violation_score`    | 0.10    | 0.88       | `[]`                                      |
| Regulation-Aware | `dysregulation_risk` | 0.30    | 0.70       | `[ESCALATION_RISK]`                       |
| Escalation       | `escalation_level`   | LEVEL_2 | 0.85       | (LEVEL_2 >= LEVEL_1 -> flagged)           |

**Calculation:**

```
Step 2: escalation_normalized = 0.5

Step 3: weighted scores
  clinical:   0.75 * 1.0 = 0.75
  boundary:   0.10 * 0.8 = 0.08
  regulation: 0.30 * 0.7 = 0.21
  escalation: 0.5  * 1.0 = 0.5

Step 4: peak_score = max(0.75, 0.08, 0.21, 0.5) = 0.75

Step 5: flag_count = 3  (clinical has flags, regulation has flags, escalation >= LEVEL_1)

Step 6: breadth_bonus = min(0.25, 0.10 * max(0, 3-1)) = min(0.25, 0.20) = 0.20

Step 7: final_score = min(1.0, 0.75 + 0.20) = 0.95

Step 8: confidence = min(0.85, 0.88, 0.70, 0.85) = 0.70

Step 9: confidence (0.70) >= UNCERTAINTY_THRESHOLD (0.4)
         final_score (0.95) >= 0.9 -> ESCALATE

Step 10: escalation_level = LEVEL_2 -> minimum BLOCK_AND_REPLACE
         current decision is ESCALATE (severity 4 > 3) -> no change
```

**Result:** `ESCALATE` | final_score=0.95 | confidence=0.70

---

### Scenario 5: Dependency Reinforcement

**Agent Outputs:**

| Agent            | Score Field          | Value   | Confidence | Flags                               |
| ---------------- | -------------------- | ------- | ---------- | ----------------------------------- |
| Clinical Safety  | `risk_score`         | 0.05    | 0.90       | `[]`                                |
| Boundary         | `violation_score`    | 0.52    | 0.82       | `[DEPENDENCY_PATTERN, SCOPE_CREEP]` |
| Regulation-Aware | `dysregulation_risk` | 0.10    | 0.80       | `[]`                                |
| Escalation       | `escalation_level`   | LEVEL_0 | 0.92       | (LEVEL_0 -> not flagged)            |

**Calculation:**

```
Step 2: escalation_normalized = 0.0

Step 3: weighted scores
  clinical:   0.05 * 1.0 = 0.05
  boundary:   0.52 * 0.8 = 0.416
  regulation: 0.10 * 0.7 = 0.07
  escalation: 0.0  * 1.0 = 0.0

Step 4: peak_score = max(0.05, 0.416, 0.07, 0.0) = 0.416

Step 5: flag_count = 1  (only boundary has flags)

Step 6: breadth_bonus = min(0.25, 0.10 * max(0, 1-1)) = min(0.25, 0.0) = 0.0

Step 7: final_score = min(1.0, 0.416 + 0.0) = 0.416

Step 8: confidence = min(0.90, 0.82, 0.80, 0.92) = 0.80

Step 9: confidence (0.80) >= UNCERTAINTY_THRESHOLD (0.4)
         final_score (0.416) >= 0.3, < 0.7 -> REWRITE

Step 10: escalation_level = LEVEL_0 -> no override
```

**Result:** `REWRITE` | final_score=0.416 | confidence=0.80

---

### Scenario 6: Clean Pass

**Agent Outputs:**

| Agent            | Score Field          | Value   | Confidence | Flags                    |
| ---------------- | -------------------- | ------- | ---------- | ------------------------ |
| Clinical Safety  | `risk_score`         | 0.03    | 0.95       | `[]`                     |
| Boundary         | `violation_score`    | 0.02    | 0.95       | `[]`                     |
| Regulation-Aware | `dysregulation_risk` | 0.05    | 0.90       | `[]`                     |
| Escalation       | `escalation_level`   | LEVEL_0 | 0.95       | (LEVEL_0 -> not flagged) |

**Calculation:**

```
Step 2: escalation_normalized = 0.0

Step 3: weighted scores
  clinical:   0.03 * 1.0 = 0.03
  boundary:   0.02 * 0.8 = 0.016
  regulation: 0.05 * 0.7 = 0.035
  escalation: 0.0  * 1.0 = 0.0

Step 4: peak_score = max(0.03, 0.016, 0.035, 0.0) = 0.035

Step 5: flag_count = 0  (no agent has flags)

Step 6: breadth_bonus = min(0.25, 0.10 * max(0, 0-1)) = min(0.25, 0.0) = 0.0

Step 7: final_score = min(1.0, 0.035 + 0.0) = 0.035

Step 8: confidence = min(0.95, 0.95, 0.90, 0.95) = 0.90

Step 9: confidence (0.90) >= UNCERTAINTY_THRESHOLD (0.4)
         final_score (0.035) < 0.3 -> PASS

Step 10: escalation_level = LEVEL_0 -> no override
```

**Result:** `PASS` | final_score=0.035 | confidence=0.90

---

## Truth Table Summary

| #   | Scenario                      | peak  | breadth | final | confidence | Decision          | Override Applied?       |
| --- | ----------------------------- | ----- | ------- | ----- | ---------- | ----------------- | ----------------------- |
| 1   | Missed Passive SI             | 0.720 | 0.10    | 0.820 | 0.70       | BLOCK_AND_REPLACE | LEVEL_2 minimum (no-op) |
| 2   | Premature Reframing           | 0.476 | 0.00    | 0.476 | 0.75       | REWRITE           | None                    |
| 3   | Diagnostic Claim              | 0.568 | 0.00    | 0.568 | 0.80       | REWRITE           | None                    |
| 4   | Abuse Disclosure Minimization | 0.750 | 0.20    | 0.950 | 0.70       | ESCALATE          | LEVEL_2 minimum (no-op) |
| 5   | Dependency Reinforcement      | 0.416 | 0.00    | 0.416 | 0.80       | REWRITE           | None                    |
| 6   | Clean Pass                    | 0.035 | 0.00    | 0.035 | 0.90       | PASS              | None                    |

---

## Edge Cases

### 1. All Agents Return 0.0 (Trivial Pass)

```
weighted scores: [0.0, 0.0, 0.0, 0.0]
peak_score = 0.0, flag_count = 0, breadth_bonus = 0.0
final_score = 0.0, confidence = min(all confidences)
Decision: PASS (assuming confidence >= 0.4)
```

The cleanest possible case. Every agent agrees there is nothing to flag.

### 2. All Agents Return 1.0 (Maximum Severity)

```
clinical: risk_score=1.0, flags=[...]
boundary: violation_score=1.0, flags=[...]
regulation: dysregulation_risk=1.0, flags=[...]
escalation: LEVEL_4 (normalized to 1.0), flags active

weighted scores: [1.0, 0.8, 0.7, 1.0]
peak_score = 1.0, flag_count = 4, breadth_bonus = min(0.25, 0.30) = 0.25
final_score = min(1.0, 1.0 + 0.25) = 1.0
Decision: ESCALATE (score >= 0.9)
Override: LEVEL_4 -> ESCALATE (confirms)
```

Maximum severity. Breadth bonus is computed but clamped by the `min(1.0, ...)` cap.

### 3. One Agent Very High, Others Zero (Peak Dominates)

```
clinical: risk_score=0.85, flags=[MISSED_RISK_SIGNAL]
boundary: violation_score=0.0, flags=[]
regulation: dysregulation_risk=0.0, flags=[]
escalation: LEVEL_0

weighted scores: [0.85, 0.0, 0.0, 0.0]
peak_score = 0.85, flag_count = 1, breadth_bonus = 0.0
final_score = 0.85
Decision: BLOCK_AND_REPLACE (0.7 <= 0.85 < 0.9)
```

A single agent's severe finding is sufficient for BLOCK_AND_REPLACE even with no corroboration. Peak scoring ensures critical findings are never diluted.

### 4. All Agents Moderate ~0.25 (Breadth Bonus Pushes to REWRITE)

```
clinical: risk_score=0.25, flags=[UNSAFE_REASSURANCE]
boundary: violation_score=0.25, flags=[SCOPE_CREEP]
regulation: dysregulation_risk=0.25, flags=[STATE_MISMATCH]
escalation: LEVEL_1 (normalized to 0.25)

weighted scores: [0.25, 0.20, 0.175, 0.25]
peak_score = 0.25, flag_count = 4, breadth_bonus = min(0.25, 0.30) = 0.25
final_score = min(1.0, 0.25 + 0.25) = 0.50
Decision: REWRITE (0.3 <= 0.50 < 0.7)
```

No single agent is high enough for REWRITE alone (peak=0.25 < 0.3 = PASS), but the breadth bonus from all four agents flagging pushes the final score to 0.50, which is REWRITE. This is the design intent: widespread moderate concern is more actionable than a single mild concern.

### 5. Very Low Confidence from One Agent (Triggers ASK_HUMAN)

```
clinical: risk_score=0.15, confidence=0.30
boundary: violation_score=0.10, confidence=0.90
regulation: dysregulation_risk=0.05, confidence=0.85
escalation: LEVEL_0, confidence=0.95

confidence = min(0.30, 0.90, 0.85, 0.95) = 0.30
0.30 < UNCERTAINTY_THRESHOLD (0.4)
escalation_level = LEVEL_0 (no override)
Decision: ASK_HUMAN
```

One agent's uncertainty infects the entire decision. The rationale: if any agent cannot confidently assess the situation, a human should review, unless the situation is clearly dangerous (escalation override).

### 6. Escalation LEVEL_4 with Low Scores Elsewhere (Override to ESCALATE)

```
clinical: risk_score=0.10, flags=[]
boundary: violation_score=0.05, flags=[]
regulation: dysregulation_risk=0.08, flags=[]
escalation: LEVEL_4, confidence=0.90

weighted scores: [0.10, 0.04, 0.056, 1.0]
peak_score = 1.0, flag_count = 1, breadth_bonus = 0.0
final_score = 1.0
Decision: ESCALATE (score >= 0.9)
Override: LEVEL_4 -> ESCALATE (confirms)
```

Even if only the escalation agent fires, a LEVEL_4 escalation guarantees ESCALATE. The normalized escalation score (1.0) alone is sufficient.

### 7. LEVEL_3 Escalation with Low Final Score (Override Forces ESCALATE)

```
clinical: risk_score=0.10, flags=[]
boundary: violation_score=0.05, flags=[]
regulation: dysregulation_risk=0.05, flags=[]
escalation: LEVEL_3, confidence=0.85

weighted scores: [0.10, 0.04, 0.035, 0.75]
peak_score = 0.75, flag_count = 1, breadth_bonus = 0.0
final_score = 0.75
Decision before override: BLOCK_AND_REPLACE (0.7 <= 0.75 < 0.9)
Override: LEVEL_3 -> always ESCALATE
Final decision: ESCALATE
```

The score-based decision would be BLOCK_AND_REPLACE, but the LEVEL_3 override forces ESCALATE regardless.

### 8. Low Confidence with LEVEL_2 Escalation (Safety Overrides Uncertainty)

```
clinical: risk_score=0.20, confidence=0.35
boundary: violation_score=0.10, confidence=0.80
regulation: dysregulation_risk=0.15, confidence=0.75
escalation: LEVEL_2, confidence=0.85

confidence = min(0.35, 0.80, 0.75, 0.85) = 0.35
0.35 < UNCERTAINTY_THRESHOLD (0.4)
BUT escalation_level = LEVEL_2 -> safety overrides uncertainty
ASK_HUMAN is NOT applied.

weighted scores: [0.20, 0.08, 0.105, 0.5]
peak_score = 0.5, flag_count = 1
final_score = 0.5
Decision before override: REWRITE
Override: LEVEL_2 -> minimum BLOCK_AND_REPLACE
Final decision: BLOCK_AND_REPLACE
```

The clinical agent's low confidence would normally trigger ASK_HUMAN, but LEVEL_2 escalation means this is a safety situation. The system blocks the response rather than waiting for a human reviewer.

### 9. Agent Failure (Missing Report)

If any agent fails to return a valid report, the pipeline substitutes a default:

```typescript
const DEFAULT_REPORT = {
  score: 0.0,
  confidence: 0.0,
  flags: [],
};
```

A confidence of 0.0 guarantees `confidence < UNCERTAINTY_THRESHOLD`, which triggers ASK_HUMAN (unless escalation overrides). This is intentional: if any agent fails, the system does not silently pass -- it routes to human review.

---

## Override Rules (Consolidated)

These rules are applied after the threshold-based decision and can only **increase** severity:

| Condition                          | Effect                                   | Rationale                                               |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `escalation_level >= LEVEL_3`      | Decision forced to `ESCALATE`            | Active crisis requires immediate human escalation       |
| `escalation_level >= LEVEL_2`      | Minimum decision is `BLOCK_AND_REPLACE`  | Elevated risk must not reach the user unmodified        |
| `confidence < 0.4` (no LEVEL_2+)   | Decision forced to `ASK_HUMAN`           | Uncertainty requires human judgment                     |
| `confidence < 0.4` (with LEVEL_2+) | ASK_HUMAN suppressed; escalation applies | Safety overrides uncertainty -- do not wait for a human |

**Override application order:**

1. Check confidence -> ASK_HUMAN (tentative)
2. Check thresholds -> score-based decision
3. Check LEVEL_3+ -> force ESCALATE
4. Check LEVEL_2 -> force minimum BLOCK_AND_REPLACE
5. Step 3-4 override Step 1 when applicable

---

## Decision Flow Diagram

```
                    AgentReports
                         |
                         v
              +---------------------+
              | Normalize Escalation |
              | Level to 0.0-1.0    |
              +---------------------+
                         |
                         v
              +---------------------+
              | Apply Agent Weights  |
              | C:1.0 B:0.8 R:0.7  |
              | E:1.0               |
              +---------------------+
                         |
                         v
              +---------------------+
              | peak = max(weighted) |
              | flags = count(>0)    |
              | breadth = bonus(flags)|
              +---------------------+
                         |
                         v
              +---------------------+
              | final = peak+breadth |
              | conf = min(all conf) |
              +---------------------+
                         |
                    +----+----+
                    |         |
            conf < 0.4?    conf >= 0.4
            AND no L2+?         |
                |               v
                v     +-------------------+
           ASK_HUMAN  | Threshold mapping |
                      | <0.3  -> PASS     |
                      | <0.7  -> REWRITE  |
                      | <0.9  -> BLOCK    |
                      | >=0.9 -> ESCALATE |
                      +-------------------+
                              |
                              v
                    +-------------------+
                    | Escalation        |
                    | Overrides         |
                    | L3+ -> ESCALATE   |
                    | L2  -> min BLOCK  |
                    +-------------------+
                              |
                              v
                      DecisionResult
```

---

## Implementation Notes

- **Pure TypeScript.** No LLM calls, no `async`, no network access, no side effects. This function is deterministic.
- **Synchronous.** The function takes `AgentReports` and returns `DecisionResult` immediately. All the latency budget is consumed by the agents themselves; the Decision Engine adds zero latency.
- **Input validation.** Before computing, validate:
  - All scores are numbers in `[0.0, 1.0]`
  - All confidence values are numbers in `[0.0, 1.0]`
  - `escalation_level` is a valid `EscalationLevel` enum value
  - All required fields are present
  - If validation fails, treat the offending agent as a failed agent (score=0.0, confidence=0.0, flags=[])
- **No rounding.** Scores are IEEE 754 doubles. Do not round intermediate values. Only round for display purposes in the audit trail.
- **File location.** `supabase/functions/_shared/decision-engine.ts`
- **Test location.** `supabase/functions/_shared/decision-engine.test.ts`

---

## Acceptance Criteria

1. **All 6 demo scenarios produce the expected decision** when run through the algorithm with the exact agent outputs specified in the Truth Table.
2. **Override rules correctly applied.** LEVEL_2 forces minimum BLOCK_AND_REPLACE. LEVEL_3+ forces ESCALATE. Verified with Scenarios 1 and 4, plus Edge Cases 7 and 8.
3. **Breadth bonus capped at 0.25.** Even with 4 flagging agents (`0.10 * 3 = 0.30`), the bonus is clamped to 0.25. Verified with Edge Case 2 and 4.
4. **final_score never exceeds 1.0.** The `min(1.0, ...)` guard is tested with Edge Case 2 (all agents at 1.0).
5. **ASK_HUMAN triggered when confidence < 0.4 and no high-level escalation.** Verified with Edge Case 5.
6. **ASK_HUMAN suppressed when confidence < 0.4 but escalation >= LEVEL_2.** Verified with Edge Case 8.
7. **Agent failure defaults to ASK_HUMAN.** A failed agent (confidence=0.0) triggers human review. Verified with Edge Case 9.
8. **Pure function.** No side effects, no async, deterministic. Same input always produces same output. Verifiable by running the same input 1000 times and asserting identical output.
9. **Latency under 1ms.** This is arithmetic on 4 numbers. The function should never be a performance concern.
10. **All edge cases documented above produce the stated decisions** when implemented and tested.
