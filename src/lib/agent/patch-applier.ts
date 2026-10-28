import { createTwoFilesPatch } from 'diff';
import { computeDiffSha256, isPatchableSourcePath } from '@/lib/security/redact';
import { FileReplacementSchema } from '@/lib/ai/schemas';
import { z } from 'zod';

export type FileEdit = z.infer<typeof FileReplacementSchema>;

export interface AppliedPatchResult {
  modifiedFiles: Array<{ path: string; content: string }>;
  touchedPaths: string[];
  unifiedDiff: string;
  diffSha256: string;
}

export function applyStructuredEdits(
  originalFiles: Array<{ path: string; content: string }>,
  edits: FileEdit[],
): AppliedPatchResult {
  if (edits.length === 0) {
    throw new Error('Patch proposal contains no edits.');
  }

  const fileMap = new Map<string, string>();
  for (const file of originalFiles) {
    fileMap.set(file.path, file.content.replace(/\r\n/g, '\n'));
  }

  const touchedSet = new Set<string>();
  const unifiedDiffChunks: string[] = [];

  for (const edit of edits) {
    if (!isPatchableSourcePath(edit.path)) {
      throw new Error(`Disallowed patch target path: ${edit.path}`);
    }

    const currentContent = fileMap.get(edit.path);
    if (currentContent === undefined) {
      throw new Error(`Target file not found in pinned repository slice: ${edit.path}`);
    }

    let normalizedSearch = edit.searchBlock.replace(/\r\n/g, '\n');
    let normalizedReplace = edit.replaceBlock.replace(/\r\n/g, '\n');

    if (!currentContent.includes(normalizedSearch)) {
      const strippedSearch = normalizedSearch
        .split('\n')
        .map((l) => l.replace(/^\s*\d+:\s?/, ''))
        .join('\n');
      const strippedReplace = normalizedReplace
        .split('\n')
        .map((l) => l.replace(/^\s*\d+:\s?/, ''))
        .join('\n');
      if (currentContent.includes(strippedSearch)) {
        normalizedSearch = strippedSearch;
        normalizedReplace = strippedReplace;
      } else {
        throw new Error(
          `Search block did not match verbatim content in ${edit.path}. Refusing fuzzy edit.`,
        );
      }
    }

    if (normalizedSearch === normalizedReplace) {
      throw new Error(`No-op edit proposed for ${edit.path}.`);
    }

    const updatedContent = currentContent.replace(normalizedSearch, normalizedReplace);
    fileMap.set(edit.path, updatedContent);
    touchedSet.add(edit.path);
  }

  const modifiedFiles: Array<{ path: string; content: string }> = [];
  for (const orig of originalFiles) {
    const normalizedOrig = orig.content.replace(/\r\n/g, '\n');
    const updated = fileMap.get(orig.path) ?? normalizedOrig;
    modifiedFiles.push({ path: orig.path, content: updated });

    if (touchedSet.has(orig.path)) {
      const patch = createTwoFilesPatch(
        `a/${orig.path}`,
        `b/${orig.path}`,
        normalizedOrig,
        updated,
        '',
        '',
        { context: 3 },
      );
      unifiedDiffChunks.push(patch.trim());
    }
  }

  const unifiedDiff = unifiedDiffChunks.join('\n\n');
  if (!unifiedDiff || unifiedDiff.length > 50000) {
    throw new Error('Generated diff is empty or exceeds maximum safe patch size (50 KB).');
  }

  return {
    modifiedFiles,
    touchedPaths: Array.from(touchedSet),
    unifiedDiff,
    diffSha256: computeDiffSha256(unifiedDiff),
  };
}

export interface DeterministicVerificationEvaluation {
  isVerified: boolean;
  reason: string;
  baselineReproducedFailure: boolean;
  candidatePassedAll: boolean;
}

export function evaluateTestOutcome(
  baseline: { exitCode: number; command: string; passed: number | null; failed: number | null },
  candidate: { exitCode: number; command: string; passed: number | null; failed: number | null },
): DeterministicVerificationEvaluation {
  if (baseline.command !== candidate.command) {
    return {
      isVerified: false,
      reason: `Test command mismatch between baseline (${baseline.command}) and candidate (${candidate.command}).`,
      baselineReproducedFailure: false,
      candidatePassedAll: false,
    };
  }

  const baselineReproducedFailure =
    baseline.exitCode !== 0 && (baseline.failed === null || baseline.failed > 0);
  if (!baselineReproducedFailure) {
    return {
      isVerified: false,
      reason:
        'Inconclusive baseline: original commit did not fail tests (exit code 0), so patch verification cannot be proven.',
      baselineReproducedFailure: false,
      candidatePassedAll: candidate.exitCode === 0,
    };
  }

  const candidatePassedAll =
    candidate.exitCode === 0 &&
    (candidate.failed === null || candidate.failed === 0) &&
    (candidate.passed === null || candidate.passed > 0);

  if (!candidatePassedAll) {
    return {
      isVerified: false,
      reason: `Candidate test suite failed with exit code ${candidate.exitCode}${
        candidate.failed !== null ? ` (${candidate.failed} failing tests)` : ''
      }.`,
      baselineReproducedFailure: true,
      candidatePassedAll: false,
    };
  }

  return {
    isVerified: true,
    reason: `Verified: baseline failed (exit ${baseline.exitCode}) and candidate passed (exit 0${
      candidate.passed !== null ? `, ${candidate.passed} passing tests` : ''
    }) on identical test suite.`,
    baselineReproducedFailure: true,
    candidatePassedAll: true,
  };
}
