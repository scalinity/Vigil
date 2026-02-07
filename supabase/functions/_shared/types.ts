// Vigil Shared Types
// Canonical definitions from Spec 00-overview.md

// === Core Enums ===

export type VigilDecisionType =
  | "PASS"
  | "REWRITE"
  | "BLOCK_AND_REPLACE"
  | "ESCALATE"
  | "ASK_HUMAN";

export type EscalationLevel =
  | "LEVEL_0"
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3"
  | "LEVEL_4";

export type ClinicalSafetyFlag =
  | "MISSED_RISK_SIGNAL"
  | "UNSAFE_REASSURANCE"
  | "HARMFUL_ADVICE"
  | "NORMALIZATION_OF_HARM"
  | "FALSE_EQUIVALENCE";

export type BoundaryFlag =
  | "DIAGNOSTIC_CLAIM"
  | "MEDICAL_ADVICE"
  | "LEGAL_ADVICE"
  | "SCOPE_CREEP"
  | "DEPENDENCY_PATTERN"
  | "INAPPROPRIATE_DISCLOSURE";

export type RegulationFlag =
  | "STATE_MISMATCH"
  | "PREMATURE_REFRAME"
  | "MISSED_GROUNDING_NEED"
  | "ESCALATION_RISK"
  | "DISSOCIATION_UNADDRESSED";

export type InferredState =
  | "ventral_vagal_regulated"
  | "sympathetic_activation"
  | "dorsal_vagal_shutdown"
  | "mixed_state"
  | "uncertain";

export type RiskType =
  | "active_suicidal_ideation"
  | "passive_suicidal_ideation"
  | "self_harm"
  | "abuse_disclosure"
  | "psychotic_symptoms"
  | "substance_crisis"
  | "other";

export type Imminence =
  | "imminent"
  | "non_imminent_but_elevated"
  | "chronic"
  | "uncertain";

// === Message Types ===

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO-8601
}

export interface SessionMetadata {
  session_id: string;
  session_start: string; // ISO-8601
  message_count: number;
  prior_interventions: number;
  prior_escalation_level: EscalationLevel;
}

// === Context Assembly ===

export interface ContextPayload {
  user_message: string;
  ai_response: string;
  conversation_history: ConversationMessage[];
  session_metadata: SessionMetadata;
}

// === Agent Report Types ===

export interface ClinicalSafetyReport {
  risk_score: number;
  confidence: number;
  flags: ClinicalSafetyFlag[];
  evidence: string;
  recommendation: VigilDecisionType;
  suggested_elements: string[];
}

export interface BoundaryReport {
  violation_score: number;
  confidence: number;
  flags: BoundaryFlag[];
  evidence: string;
  recommendation: VigilDecisionType;
  suggested_elements: string[];
}

export interface RegulationReport {
  dysregulation_risk: number;
  confidence: number;
  inferred_state: InferredState;
  state_confidence: number;
  flags: RegulationFlag[];
  evidence: string;
  recommendation: VigilDecisionType;
  suggested_elements: string[];
}

export interface EscalationReport {
  escalation_level: EscalationLevel;
  confidence: number;
  risk_type: RiskType;
  imminence: Imminence;
  evidence: string;
  protocol: string;
  human_handoff_recommended: boolean;
}

export interface AgentReports {
  clinical_safety: ClinicalSafetyReport;
  boundary: BoundaryReport;
  regulation_aware: RegulationReport;
  escalation: EscalationReport;
}

// === Decision Engine ===

export interface DecisionResult {
  decision: VigilDecisionType;
  final_score: number;
  peak_score: number;
  breadth_bonus: number;
  flag_count: number;
  confidence: number;
  agent_reports: AgentReports;
}

// === Rewrite Agent ===

export interface ChangeRecord {
  type: "REMOVED" | "ADDED" | "MODIFIED";
  content: string;
  reason: string;
}

export interface ConflictResolution {
  agents: string[];
  conflict: string;
  resolution: string;
}

export interface RewriteResult {
  rewritten_response: string;
  changes_made: ChangeRecord[];
  conflict_resolutions: ConflictResolution[];
}

// === Haiku Triage ===

export interface TriageResult {
  triage_score: number;
  should_escalate_to_opus: boolean;
  flags: string[];
  reasoning: string;
}

// === Audit Trail ===

export interface AuditRecord {
  id: string;
  created_at: string;
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
  triage_score: number | null;
  agent_reports: AgentReports;
  rewrite_result: RewriteResult | null;
  changes_made: ChangeRecord[];
  review_status:
    | "auto_passed"
    | "auto_rewritten"
    | "pending_clinician_review"
    | "clinician_reviewed";
  latency_ms: number;
}

// === API Layer ===

export interface VigilReviewRequest {
  user_message: string;
  ai_response: string;
  conversation_history: ConversationMessage[];
  session_id: string;
  skip_triage?: boolean;
}

export interface VigilReviewResponse {
  decision: VigilDecisionType;
  final_response: string;
  final_score: number;
  confidence: number;
  peak_score: number;
  breadth_bonus: number;
  flag_count: number;
  flags_summary: string[];
  escalation_level: EscalationLevel;
  audit_id: string;
  latency_ms: number;
}

// === Constants ===

// Decision Engine thresholds
export const PASS_THRESHOLD = 0.3;
export const REWRITE_THRESHOLD = 0.7;
export const BLOCK_THRESHOLD = 0.9;
export const UNCERTAINTY_THRESHOLD = 0.4;
export const BREADTH_BONUS_PER_AGENT = 0.1;
export const BREADTH_BONUS_CAP = 0.25;

// Agent weights
export const CLINICAL_SAFETY_WEIGHT = 1.0;
export const BOUNDARY_WEIGHT = 0.8;
export const REGULATION_WEIGHT = 0.7;
export const ESCALATION_WEIGHT = 1.0;

// Escalation normalization
export const ESCALATION_NORMALIZATION: Record<EscalationLevel, number> = {
  LEVEL_0: 0.0,
  LEVEL_1: 0.25,
  LEVEL_2: 0.5,
  LEVEL_3: 0.75,
  LEVEL_4: 1.0,
};

// Triage
export const TRIAGE_THRESHOLD = 0.15;

// Context
export const MAX_CONVERSATION_HISTORY = 20;
export const MAX_CORPUS_TOKENS_PER_AGENT = 50_000;

// Conflict resolution priority (higher = more authority)
export const CONFLICT_PRIORITY: Record<string, number> = {
  escalation: 4,
  clinical_safety: 3,
  regulation_aware: 2,
  boundary: 1,
};

// Decision severity ordering
export const DECISION_SEVERITY: Record<VigilDecisionType, number> = {
  PASS: 0,
  ASK_HUMAN: 1,
  REWRITE: 2,
  BLOCK_AND_REPLACE: 3,
  ESCALATE: 4,
};
