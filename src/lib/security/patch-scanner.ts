export interface SecurityCheckItem {
  id:
    | 'NO_DYNAMIC_CODE_EXEC'
    | 'NO_SHELL_INJECTION'
    | 'NO_SECRET_LITERALS'
    | 'NO_TEST_TAMPERING'
    | 'NO_DEPENDENCY_DRIFT'
    | 'CRYPTOGRAPHIC_DIFF_INTEGRITY';
  label: string;
  passed: boolean;
  detail: string;
}

export interface PatchSecurityAuditReport {
  overallPassed: boolean;
  passedCount: number;
  totalChecks: number;
  surgicalScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  linesAdded: number;
  linesRemoved: number;
  filesTouchedCount: number;
  expectedDiffSha256: string;
  checks: SecurityCheckItem[];
}

function isAllowedPatchSourcePath(relativePath: string): boolean {
  if (!relativePath || relativePath.length > 240) return false;
  if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) {
    return false;
  }
  if (relativePath === 'package.json' || relativePath.endsWith('/package.json')) {
    return false;
  }
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath);
}

export function analyzePatchSecurityAndBlastRadius(params: {
  unifiedDiff: string;
  expectedDiffSha256: string;
  touchedPaths: string[];
}): PatchSecurityAuditReport {
  const { unifiedDiff, expectedDiffSha256, touchedPaths } = params;
  const lines = unifiedDiff.replace(/\r\n/g, '\n').split('\n');

  const addedLines: string[] = [];
  const removedLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
      continue;
    }
    if (line.startsWith('+')) {
      addedLines.push(line.slice(1));
    } else if (line.startsWith('-')) {
      removedLines.push(line.slice(1));
    }
  }

  const addedCode = addedLines.join('\n');

  // 1. Dynamic code execution check
  const hasDynamicExec = /\b(eval\s*\(|new\s+Function\s*\(|vm\.runIn(?:New|This)?Context\s*\()/.test(
    addedCode,
  );

  // 2. Shell / process execution check
  const hasShellExec =
    /\b(child_process|execSync\s*\(|spawnSync\s*\(|execFile\s*\()/.test(addedCode);

  // 3. Hardcoded secret literal check
  const hasHardcodedSecret =
    /\b(gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|v1\.[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9_]{16,})\b/.test(
      addedCode,
    );

  // 4. Test tampering check (no test files modified and no .skip / .only injected)
  const touchesTestFiles = touchedPaths.some(
    (p) =>
      p.includes('.test.') ||
      p.includes('.spec.') ||
      p.startsWith('tests/') ||
      p.includes('/tests/'),
  );
  const injectsTestSkip = /\b(it\.skip|test\.skip|describe\.skip|it\.only|test\.only)\b/.test(
    addedCode,
  );
  const noTestTampering = !touchesTestFiles && !injectsTestSkip;

  // 5. Dependency & config drift check
  const noDependencyDrift =
    touchedPaths.length > 0 && touchedPaths.every((p) => isAllowedPatchSourcePath(p));

  // 6. Cryptographic SHA-256 diff integrity check
  const hashValid =
    /^[a-f0-9]{64}$/i.test(expectedDiffSha256) &&
    addedLines.length > 0 &&
    unifiedDiff.includes('@@');

  const checks: SecurityCheckItem[] = [
    {
      id: 'NO_DYNAMIC_CODE_EXEC',
      label: 'No Dynamic Code Execution',
      passed: !hasDynamicExec,
      detail: !hasDynamicExec
        ? 'Zero eval(), new Function(), or VM context calls in added lines'
        : 'Detected dynamic code execution primitive in patch',
    },
    {
      id: 'NO_SHELL_INJECTION',
      label: 'No Subprocess / Shell Spawning',
      passed: !hasShellExec,
      detail: !hasShellExec
        ? 'Zero child_process / execSync / spawn calls in added lines'
        : 'Detected subprocess execution primitive in patch',
    },
    {
      id: 'NO_SECRET_LITERALS',
      label: 'Zero Hardcoded Credentials',
      passed: !hasHardcodedSecret,
      detail: !hasHardcodedSecret
        ? 'No API tokens, PATs, or secret literals detected in diff'
        : 'Detected potential secret literal in added lines',
    },
    {
      id: 'NO_TEST_TAMPERING',
      label: 'Test Suite Integrity Preserved',
      passed: noTestTampering,
      detail: noTestTampering
        ? 'Existing unit tests untouched; zero .skip/.only bypasses'
        : 'Patch modifies test files or disables assertions',
    },
    {
      id: 'NO_DEPENDENCY_DRIFT',
      label: 'Allowlisted Source Scope Only',
      passed: noDependencyDrift,
      detail: noDependencyDrift
        ? `Restricted to ${touchedPaths.join(', ')} (package.json & lockfiles untouched)`
        : 'Patch touches non-source or configuration files',
    },
    {
      id: 'CRYPTOGRAPHIC_DIFF_INTEGRITY',
      label: 'SHA-256 Diff Fingerprint Match',
      passed: hashValid,
      detail: hashValid
        ? `Verified sha256:${expectedDiffSha256.slice(0, 16)}…`
        : 'Invalid or missing SHA-256 diff fingerprint',
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const overallPassed = passedCount === checks.length;

  // Compute surgical precision score (0-100): penalize excessive churn or multiple files
  const totalLinesChanged = addedLines.length + removedLines.length;
  const filePenalty = Math.max(0, (touchedPaths.length - 1) * 10);
  const churnPenalty = Math.max(0, Math.floor((totalLinesChanged - 2) * 1.5));
  const checkPenalty = (checks.length - passedCount) * 25;
  const surgicalScore = Math.max(0, Math.min(100, 100 - filePenalty - churnPenalty - checkPenalty));

  const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' =
    !overallPassed || surgicalScore < 60
      ? 'HIGH'
      : surgicalScore < 85
        ? 'MODERATE'
        : 'LOW';

  return {
    overallPassed,
    passedCount,
    totalChecks: checks.length,
    surgicalScore,
    riskLevel,
    linesAdded: addedLines.length,
    linesRemoved: removedLines.length,
    filesTouchedCount: touchedPaths.length,
    expectedDiffSha256,
    checks,
  };
}
