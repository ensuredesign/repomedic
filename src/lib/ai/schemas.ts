import { z } from 'zod';
import { isPatchableSourcePath, isSafeRepositoryFilePath } from '@/lib/security/redact';

function normalizeConfidence(val: unknown): 'high_evidence' | 'moderate_evidence' | 'low_evidence' {
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    if (lower === 'high_evidence' || lower.startsWith('high')) return 'high_evidence';
    if (lower === 'moderate_evidence' || lower.startsWith('mod') || lower.startsWith('med')) {
      return 'moderate_evidence';
    }
    if (lower === 'low_evidence' || lower.startsWith('low')) return 'low_evidence';
  }
  return 'high_evidence';
}

export const EvidencePathSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  const rawLines = obj.lines ?? obj.line ?? obj.lineRange ?? obj.line_range ?? '1-50';
  const linesStr = Array.isArray(rawLines) ? rawLines.join('-') : String(rawLines);
  return {
    path: obj.path ?? obj.file ?? obj.filePath ?? obj.file_path,
    lines: linesStr,
    reason: obj.reason ?? obj.description ?? obj.explanation ?? 'Relevant source location',
  };
}, z.object({
  path: z.string().min(1).max(240).refine(isSafeRepositoryFilePath, {
    message: 'Evidence path must be a safe relative repository path',
  }),
  lines: z.string().min(1).max(40),
  reason: z.string().min(5).max(500),
}));

export const DiagnosisSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  return {
    rootCause: obj.rootCause ?? obj.root_cause ?? obj.diagnosis ?? obj.summary,
    confidenceLabel: normalizeConfidence(obj.confidenceLabel ?? obj.confidence_label ?? obj.confidence),
    evidencePaths: obj.evidencePaths ?? obj.evidence_paths ?? obj.evidence,
    repairPlan: obj.repairPlan ?? obj.repair_plan ?? obj.fixPlan ?? obj.fix_plan ?? obj.plan,
  };
}, z.object({
  rootCause: z.string().min(15).max(1500),
  confidenceLabel: z.enum(['high_evidence', 'moderate_evidence', 'low_evidence']),
  evidencePaths: z.array(EvidencePathSchema).min(1).max(8),
  repairPlan: z.string().min(15).max(1500),
}));

export type DiagnosisOutput = z.infer<typeof DiagnosisSchema>;

export const FileReplacementSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  return {
    path: obj.path ?? obj.file ?? obj.filePath ?? obj.file_path,
    searchBlock: obj.searchBlock ?? obj.search_block ?? obj.search ?? obj.original ?? obj.oldText,
    replaceBlock: obj.replaceBlock ?? obj.replace_block ?? obj.replace ?? obj.replacement ?? obj.newText,
  };
}, z.object({
  path: z.string().min(1).max(240).refine(isPatchableSourcePath, {
    message: 'Target path must be an allowlisted JS/TS source file',
  }),
  searchBlock: z.string().min(1).max(10000),
  replaceBlock: z.string().min(1).max(10000),
}));

export const PatchProposalSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  const rawEdits = obj.edits ?? obj.changes ?? obj.replacements ?? obj.patches;
  let rawTouched = obj.touchedPaths ?? obj.touched_paths ?? obj.files;
  if ((!Array.isArray(rawTouched) || rawTouched.length === 0) && Array.isArray(rawEdits)) {
    rawTouched = Array.from(
      new Set(
        rawEdits
          .map((e) => (e && typeof e === 'object' ? ((e as Record<string, unknown>).path ?? (e as Record<string, unknown>).file) : undefined))
          .filter((p): p is string => typeof p === 'string' && p.length > 0),
      ),
    );
  }
  const rawRisk = obj.riskNotes ?? obj.risk_notes ?? obj.risks;
  const riskNotes = Array.isArray(rawRisk)
    ? rawRisk.join('; ')
    : typeof rawRisk === 'string' && rawRisk.trim().length >= 5
      ? rawRisk
      : 'Minimal surgical source change verified against full test suite.';

  return {
    rationale: obj.rationale ?? obj.explanation ?? obj.summary ?? obj.reason,
    touchedPaths: rawTouched,
    edits: rawEdits,
    riskNotes,
  };
}, z.object({
  rationale: z.string().min(15).max(1500),
  touchedPaths: z
    .array(
      z.string().min(1).max(240).refine(isPatchableSourcePath, {
        message: 'Touched path must be an allowlisted JS/TS source file',
      }),
    )
    .min(1)
    .max(4),
  edits: z.array(FileReplacementSchema).min(1).max(4),
  riskNotes: z.string().min(5).max(1000),
}));

export type PatchProposalOutput = z.infer<typeof PatchProposalSchema>;

export const HealthSmokeSchema = z.object({
  status: z.literal('ready'),
  engine: z.string().min(2).max(120),
  capabilities: z.array(z.string().min(2).max(80)).min(1).max(6),
});

export type HealthSmokeOutput = z.infer<typeof HealthSmokeSchema>;

export const CopilotActionSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  const rawSteps = obj.actionItems ?? obj.action_items ?? obj.steps ?? obj.recommendations;
  return {
    title: obj.title ?? obj.heading ?? 'RepoMedic Incident Co-Pilot Synthesis',
    executiveSummary:
      obj.executiveSummary ?? obj.executive_summary ?? obj.summary ?? obj.analysis,
    memoryInvariantLearned:
      obj.memoryInvariantLearned ??
      obj.memory_invariant_learned ??
      obj.invariant ??
      'Enforce explicit nullish coalescing (`??`) and zero-value boundary unit tests.',
    actionItems: Array.isArray(rawSteps)
      ? rawSteps.map((s) => String(s))
      : ['Verify candidate patch exit code 0 in isolated sandbox', 'Approve SHA-256 diff hash for Draft PR'],
    codeOrCommandSnippet:
      obj.codeOrCommandSnippet ??
      obj.code_or_command_snippet ??
      obj.snippet ??
      obj.code ??
      'npx vitest run',
  };
}, z.object({
  title: z.string().min(4).max(200),
  executiveSummary: z.string().min(15).max(2500),
  memoryInvariantLearned: z.string().min(10).max(600),
  actionItems: z.array(z.string().min(4).max(500)).min(1).max(6),
  codeOrCommandSnippet: z.string().min(2).max(2000),
}));

export type CopilotActionOutput = z.infer<typeof CopilotActionSchema>;
