# Spec 00: Overview & Shared Types

## Purpose

This spec defines the shared type system, dependency graph, environment configuration, and conventions used across all Vigil component specs. Every other spec references this file for canonical type definitions.

## Project Structure

```
vigil/
  supabase/
    functions/
      vigil-review/         # Main review endpoint
        index.ts
      _shared/
        types.ts             # Shared types (from this spec)
        agents/
          clinical-safety.ts
          boundary.ts
          regulation.ts
          escalation.ts
          rewrite.ts
          triage.ts
        decision-engine.ts
        context-assembly.ts
        audit-logger.ts
    migrations/
      001_audit_trail.sql
  corpus/
    clinical-safety/         # Markdown corpus files per agent
    boundary/
    regulation/
    escalation/
  demo/
    index.html               # Split-pane demo UI
    app.js
    styles.css
    scenarios.json            # Hardcoded demo scenarios
  README.md
```

## Environment Variables

| Variable                      | Purpose                                           | Required |
| ----------------------------- | ------------------------------------------------- | -------- |
| `ANTHROPIC_API_KEY`           | Claude API access (Opus 4.6 + Haiku)              | Yes      |
| `SUPABASE_URL`                | Supabase project URL                              | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`   | Service role for audit trail writes               | Yes      |
| `SUPABASE_ANON_KEY`           | Anon key for demo UI                              | Yes      |
| `VIGIL_TRIAGE_THRESHOLD`      | Haiku triage pass threshold (default: 0.15)       | No       |
| `VIGIL_UNCERTAINTY_THRESHOLD` | Confidence threshold for ASK_HUMAN (default: 0.4) | No       |

## Shared TypeScript Types

```typescript
// === Core Enums ===

type VigilDecisionType =
  | "PASS"
  | "REWRITE"
  | "BLOCK_AND_REPLACE"
  | "ESCALATE"
  | "ASK_HUMAN";

type EscalationLevel =
  | "LEVEL_0"
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3"
  | "LEVEL_4";

type ClinicalSafetyFlag =
  | "MISSED_RISK_SIGNAL"
  | "UNSAFE_REASSURANCE"
  | "HARMFUL_ADVICE"
  | "NORMALIZATION_OF_HARM"
  | "FALSE_EQUIVALENCE";

type BoundaryFlag =
  | "DIAGNOSTIC_CLAIM"
  | "MEDICAL_ADVICE"
  | "LEGAL_ADVICE"
  | "SCOPE_CREEP"
  | "DEPENDENCY_PATTERN"
  | "INAPPROPRIATE_DISCLOSURE";

type RegulationFlag =
  | "STATE_MISMATCH"
  | "PREMATURE_REFRAME"
  | "MISSED_GROUNDING_NEED"
  | "ESCALATION_RISK"
  | "DISSOCIATION_UNADDRESSED";

type InferredState =
  | "ventral_vagal_regulated"
  | "sympathetic_activation"
  | "dorsal_vagal_shutdown"
  | "mixed_state"
  | "uncertain";

type RiskType =
  | "active_suicidal_ideation"
  | "passive_suicidal_ideation"
  | "self_harm"
  | "abuse_disclosure"
  | "psychotic_symptoms"
  | "substance_crisis"
  | "other";

type Imminence =
  | "imminent"
  | "non_imminent_but_elevated"
  | "chronic"
  | "uncertain";

// === Message Types ===

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO-8601
}

interface SessionMetadata {
  session_id: string;
  session_start: string; // ISO-8601
  message_count: number;
  prior_interventions: number; // count of Vigil interventions this session
  prior_escalation_level: EscalationLevel; // highest escalation this session
}

// === Context Assembly ===

interface ContextPayload {
  user_message: string;
  ai_response: string;
  conversation_history: ConversationMessage[]; // last 20 messages
  session_metadata: SessionMetadata;
}

// === Agent Report Types ===

interface ClinicalSafetyReport {
  risk_score: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  flags: ClinicalSafetyFlag[];
  evidence: string;
  recommendation: VigilDecisionType;
  suggested_elements: string[];
}

interface BoundaryReport {
  violation_score: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  flags: BoundaryFlag[];
  evidence: string;
  recommendation: VigilDecisionType;
  suggested_elements: string[];
}

interface RegulationReport {
  dysregulation_risk: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  inferred_state: InferredState;
  state_confidence: number; // 0.0 - 1.0
  flags: RegulationFlag[];
  evidence: string;
  recommendation: VigilDecisionType;
  suggested_elements: string[];
}

interface EscalationReport {
  escalation_level: EscalationLevel;
  confidence: number; // 0.0 - 1.0
  risk_type: RiskType;
  imminence: Imminence;
  evidence: string;
  protocol: string;
  human_handoff_recommended: boolean;
}

interface AgentReports {
  clinical_safety: ClinicalSafetyReport;
  boundary: BoundaryReport;
  regulation_aware: RegulationReport;
  escalation: EscalationReport;
}

// === Decision Engine ===

interface DecisionResult {
  decision: VigilDecisionType;
  final_score: number; // 0.0 - 1.0
  peak_score: number;
  breadth_bonus: number;
  flag_count: number;
  confidence: number; // min of all agent confidences
  agent_reports: AgentReports;
}

// === Rewrite Agent ===

interface ChangeRecord {
  type: "REMOVED" | "ADDED" | "MODIFIED";
  content: string;
  reason: string;
}

interface ConflictResolution {
  agents: string[];
  conflict: string;
  resolution: string;
}

interface RewriteResult {
  rewritten_response: string;
  changes_made: ChangeRecord[];
  conflict_resolutions: ConflictResolution[];
}

// === Haiku Triage ===

interface TriageResult {
  triage_score: number; // 0.0 - 1.0
  should_escalate_to_opus: boolean;
  flags: string[]; // brief triage-level flags
  reasoning: string; // one-sentence explanation
}

// === Audit Trail ===

interface AuditRecord {
  id: string; // uuid
  created_at: string; // ISO-8601
  session_id: string;
  message_index: number;
  user_message: string;
  original_response: string;
  final_response: string;
  decision: VigilDecisionType;
  final_score: number;
  confidence: number;
  peak_score: number;
  breadth_bonus: number;
  flag_count: number;
  triage_score: number | null; // null if triage was skipped
  agent_reports: AgentReports;
  rewrite_result: RewriteResult | null; // null if PASS
  changes_made: ChangeRecord[];
  review_status:
    | "auto_passed"
    | "auto_rewritten"
    | "pending_clinician_review"
    | "clinician_reviewed";
  latency_ms: number; // total pipeline time
}

// === API Layer ===

interface VigilReviewRequest {
  user_message: string;
  ai_response: string;
  conversation_history: ConversationMessage[];
  session_id: string;
  skip_triage?: boolean; // force full Opus review (for demo)
}

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

## Dependency Graph

```
00-overview (this file)
  └── All specs reference shared types

09-audit-trail
  └── depends on: 00-overview (AuditRecord type)

13-corpus-guide
  └── depends on: nothing (standalone content guide)

02-clinical-safety-agent ─┐
03-boundary-agent ────────┤ all depend on: 00-overview (report types)
04-regulation-agent ──────┤ all independent of each other
05-escalation-agent ──────┘

06-decision-engine
  └── depends on: 00-overview, 02-05 (agent report schemas)

07-rewrite-agent
  └── depends on: 00-overview, 02-05 (agent reports), 06 (decision types)

08-haiku-triage
  └── depends on: 00-overview (TriageResult, ContextPayload)

01-pipeline-core
  └── depends on: all of the above (orchestrates everything)

10-api-layer
  └── depends on: 01 (pipeline), 09 (audit trail)

11-demo-ui
  └── depends on: 10 (API contract)

12-demo-scenarios
  └── depends on: all (end-to-end test suite)
```

## Constants

```typescript
// Decision Engine thresholds
const PASS_THRESHOLD = 0.3;
const REWRITE_THRESHOLD = 0.7;
const BLOCK_THRESHOLD = 0.9;
const UNCERTAINTY_THRESHOLD = 0.4;
const BREADTH_BONUS_PER_AGENT = 0.1;
const BREADTH_BONUS_CAP = 0.25;

// Agent weights
const CLINICAL_SAFETY_WEIGHT = 1.0;
const BOUNDARY_WEIGHT = 0.8;
const REGULATION_WEIGHT = 0.7;
const ESCALATION_WEIGHT = 1.0;

// Escalation normalization
const ESCALATION_NORMALIZATION: Record<EscalationLevel, number> = {
  LEVEL_0: 0.0,
  LEVEL_1: 0.25,
  LEVEL_2: 0.5,
  LEVEL_3: 0.75,
  LEVEL_4: 1.0,
};

// Triage
const TRIAGE_THRESHOLD = 0.15;

// Context
const MAX_CONVERSATION_HISTORY = 20; // messages
const MAX_CORPUS_TOKENS_PER_AGENT = 50_000;

// Conflict resolution priority (higher = more authority)
const CONFLICT_PRIORITY: Record<string, number> = {
  escalation: 4,
  clinical_safety: 3,
  regulation_aware: 2,
  boundary: 1,
};
```

## Conventions

- All scores are floats in range `[0.0, 1.0]`
- All timestamps are ISO-8601 strings
- All IDs are UUID v4 strings
- Agent system prompts include the output JSON schema inline
- Agents must return valid JSON matching their report type — no freeform text
- Deno/TypeScript for all Edge Functions
- Supabase JS SDK v2.49.1 (pinned — see CLAUDE.md)
- Demo UI is vanilla HTML/CSS/JS with Tailwind CDN (no framework needed for hackathon)
