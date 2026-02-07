-- Vigil Audit Trail
-- Migration: 001_audit_trail.sql
--
-- Creates the append-only audit trail table for Vigil decisions.
-- Every AI therapy response reviewed by Vigil produces exactly one row.

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

  -- Triage (NULL when triage was skipped)
  triage_score      FLOAT         CHECK (triage_score IS NULL OR (triage_score >= 0 AND triage_score <= 1)),

  -- Agent reports: full JSON from all four agents
  agent_reports     JSONB         NOT NULL,

  -- Rewrite details: NULL when decision is PASS
  rewrite_result    JSONB,

  -- Individual changes extracted from RewriteResult
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

CREATE INDEX IF NOT EXISTS idx_audit_session          ON vigil_audit_trail(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_created          ON vigil_audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_decision         ON vigil_audit_trail(decision);
CREATE INDEX IF NOT EXISTS idx_audit_review_status    ON vigil_audit_trail(review_status);
CREATE INDEX IF NOT EXISTS idx_audit_score            ON vigil_audit_trail(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_session_message  ON vigil_audit_trail(session_id, message_index);
CREATE INDEX IF NOT EXISTS idx_audit_agent_reports    ON vigil_audit_trail USING GIN (agent_reports);
CREATE INDEX IF NOT EXISTS idx_audit_changes          ON vigil_audit_trail USING GIN (changes_made);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE vigil_audit_trail ENABLE ROW LEVEL SECURITY;

-- Service role: INSERT only
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

-- Authenticated users: SELECT only
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

-- ============================================================
-- RPC: Clinician Review Update
-- ============================================================

CREATE OR REPLACE FUNCTION update_audit_review_status(
  record_id UUID,
  new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
