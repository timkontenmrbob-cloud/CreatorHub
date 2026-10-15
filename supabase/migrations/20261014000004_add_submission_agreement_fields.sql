-- Migration: Add agreement tracking fields to submissions table
-- Checkpoint 3.1: Mandatory Creator Submission Agreement & Server Audit Record

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS agreement_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_version text DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz;

-- Ensure agreement is strictly true for any new submission
COMMENT ON COLUMN public.submissions.agreement_accepted IS 'True when creator explicitly accepted submission agreement checkbox';
COMMENT ON COLUMN public.submissions.agreement_version IS 'Legal version of terms accepted at submission time';
COMMENT ON COLUMN public.submissions.agreement_accepted_at IS 'Server timestamp when terms agreement was accepted';
