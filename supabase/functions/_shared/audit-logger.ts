// Audit Logger — Spec 09
// Writes and queries the vigil_audit_trail table

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

let _supabase: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

interface InsertAuditParams {
  context: ContextPayload;
  decision: DecisionResult;
  rewriteResult: RewriteResult | null;
  triageScore: number | null;
  latencyMs: number;
}

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

export async function insertAuditRecord(
  params: InsertAuditParams,
): Promise<AuditRecord> {
  const { context, decision, rewriteResult, triageScore, latencyMs } = params;
  const supabase = getServiceClient();

  const finalResponse =
    rewriteResult?.rewritten_response ?? context.ai_response;
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

export async function getAuditRecord(id: string): Promise<AuditRecord | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("vigil_audit_trail")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[audit-logger] Failed to fetch audit record:", error);
    throw new Error(`Audit trail query failed: ${error.message}`);
  }

  return data as AuditRecord;
}

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
