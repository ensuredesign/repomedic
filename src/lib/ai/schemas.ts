import { z } from 'zod';
import { isPatchableSourcePath, isSafeRepositoryFilePath } from '@/lib/security/redact';

export const EvidencePathSchema = z.object({
  path: z.string().min(1).max(240).refine(isSafeRepositoryFilePath, {
    message: 'Evidence path must be a safe relative repository path',
  }),
  lines: z.string().min(1).max(40),
  reason: z.string().min(5).max(500),
});

export const DiagnosisSchema = z.object({
  rootCause: z.string().min(15).max(1500),
  confidenceLabel: z.enum(['high_evidence', 'moderate_evidence', 'low_evidence']),
  evidencePaths: z.array(EvidencePathSchema).min(1).max(8),
  repairPlan: z.string().min(15).max(1500),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisSchema>;

export const FileReplacementSchema = z.object({
  path: z.string().min(1).max(240).refine(isPatchableSourcePath, {
    message: 'Target path must be an allowlisted JS/TS source file',
  }),
  searchBlock: z.string().min(1).max(10000),
  replaceBlock: z.string().min(1).max(10000),
});

export const PatchProposalSchema = z.object({
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
});

export type PatchProposalOutput = z.infer<typeof PatchProposalSchema>;

export const HealthSmokeSchema = z.object({
  status: z.literal('ready'),
  engine: z.string().min(2).max(120),
  capabilities: z.array(z.string().min(2).max(80)).min(1).max(6),
});

export type HealthSmokeOutput = z.infer<typeof HealthSmokeSchema>;
