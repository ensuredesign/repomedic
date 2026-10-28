export type RunStatus =
  | 'queued'
  | 'fetching'
  | 'baseline_running'
  | 'investigating'
  | 'patch_generating'
  | 'patch_testing'
  | 'refining'
  | 'verified'
  | 'unverified'
  | 'failed'
  | 'awaiting_approval'
  | 'draft_pr_created';

export type TestResultKind = 'baseline' | 'candidate';

export type UserRole = 'developer' | 'admin';

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  organization: string;
  job_title: string;
  github_username: string | null;
  notification_email: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentRow {
  id: string;
  user_id: string;
  repository_full_name: string;
  repository_id: string | null;
  base_sha: string;
  error_text_redacted: string;
  title: string;
  affected_file_hint: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface DiagnosisEvidenceItem {
  path: string;
  lines: string;
  reason: string;
}

export interface StoredDiagnosis {
  provenance?: 'live_nemotron' | 'recorded_case_study';
  rootCause: string;
  confidenceLabel: 'high_evidence' | 'moderate_evidence' | 'low_evidence';
  evidencePaths: DiagnosisEvidenceItem[];
  repairPlan: string;
  requestId?: string | null;
}

export interface RunRow {
  id: string;
  incident_id: string;
  user_id: string;
  status: RunStatus;
  attempt_count: number;
  current_stage: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number | null;
  started_at: string;
  finished_at: string | null;
  last_error: string | null;
  runner_id: string | null;
  claim_token: string | null;
  claim_expires_at: string | null;
  diagnosis_json: StoredDiagnosis | null;
  idempotency_key: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface RunEventRow {
  id: string;
  run_id: string;
  user_id: string;
  seq: number;
  stage: string;
  event_type: string;
  summary: string;
  payload: Record<string, unknown>;
  is_demo: boolean;
  created_at: string;
}

export interface PatchRow {
  id: string;
  run_id: string;
  user_id: string;
  attempt_number: number;
  unified_diff: string;
  diff_sha256: string;
  touched_paths: string[];
  rationale: string;
  risk_notes: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface TestResultRow {
  id: string;
  run_id: string;
  user_id: string;
  patch_id: string | null;
  kind: TestResultKind;
  command: string;
  exit_code: number;
  passed: number | null;
  failed: number | null;
  duration_ms: number;
  stdout_excerpt: string;
  stderr_excerpt: string;
  log_object_path: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface ApprovalRow {
  id: string;
  run_id: string;
  user_id: string;
  approved_sha: string;
  approved_patch_id: string;
  approved_diff_sha256: string;
  approved_at: string;
  action: 'create_draft_pr';
}

export interface PullRequestRow {
  id: string;
  run_id: string;
  user_id: string;
  approval_id: string;
  github_pr_number: number;
  github_pr_url: string;
  branch_name: string;
  head_sha: string | null;
  is_draft: boolean;
  created_at: string;
}

export interface CompleteRunBundle {
  incident: IncidentRow;
  run: RunRow;
  events: RunEventRow[];
  patches: PatchRow[];
  testResults: TestResultRow[];
  approvals: ApprovalRow[];
  pullRequest: PullRequestRow | null;
}
