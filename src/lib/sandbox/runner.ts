import { Sandbox } from '@vercel/sandbox';
import { isSafeRepositoryFilePath, redactSecrets } from '@/lib/security/redact';

export interface SandboxExecutionResult {
  command: string;
  exitCode: number;
  passed: number | null;
  failed: number | null;
  durationMs: number;
  stdoutExcerpt: string;
  stderrExcerpt: string;
  runnerId: string;
}

const ALLOWED_TEST_COMMAND = 'npx vitest run';

export function isVercelSandboxConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
      (process.env.VERCEL_TOKEN &&
        process.env.VERCEL_PROJECT_ID &&
        process.env.VERCEL_TEAM_ID),
  );
}

export function parseVitestCounts(output: string): { passed: number | null; failed: number | null } {
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  const testsLineMatch = clean.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(?:(\d+)\s+passed)?/i);
  if (testsLineMatch && (testsLineMatch[1] || testsLineMatch[2])) {
    const failed = testsLineMatch[1] ? Number.parseInt(testsLineMatch[1], 10) : 0;
    const passed = testsLineMatch[2] ? Number.parseInt(testsLineMatch[2], 10) : 0;
    return { passed, failed };
  }

  const failedOnlyMatch = clean.match(/Tests\s+(\d+)\s+failed/i);
  const passedOnlyMatch = clean.match(/Tests\s+(\d+)\s+passed/i);
  if (failedOnlyMatch || passedOnlyMatch) {
    return {
      passed: passedOnlyMatch ? Number.parseInt(passedOnlyMatch[1], 10) : 0,
      failed: failedOnlyMatch ? Number.parseInt(failedOnlyMatch[1], 10) : 0,
    };
  }

  return { passed: null, failed: null };
}

export async function runTestsInVercelSandbox(params: {
  files: Array<{ path: string; content: string }>;
  timeoutMs?: number;
}): Promise<SandboxExecutionResult> {
  const startedAt = Date.now();
  const timeoutMs = params.timeoutMs ?? 120000;

  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null;
  try {
    sandbox = await Sandbox.create({
      timeout: timeoutMs,
      runtime: 'node22',
    });

    const filesToWrite = params.files
      .filter((f) => isSafeRepositoryFilePath(f.path))
      .map((f) => ({
        path: `/vercel/sandbox/${f.path}`,
        content: Buffer.from(f.content, 'utf8'),
      }));

    await sandbox.writeFiles(filesToWrite);

    const installCmd = await sandbox.runCommand('npm', [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
    ]);
    const installExit = installCmd.exitCode ?? 0;
    if (installExit !== 0) {
      const installStderr = redactSecrets(await installCmd.stderr(), 2000);
      return {
        command: ALLOWED_TEST_COMMAND,
        exitCode: installExit,
        passed: null,
        failed: null,
        durationMs: Date.now() - startedAt,
        stdoutExcerpt: redactSecrets(await installCmd.stdout(), 2000),
        stderrExcerpt: `Dependency installation failed in sandbox: ${installStderr}`,
        runnerId: 'vercel-sandbox',
      };
    }

    const testCmd = await sandbox.runCommand('npx', ['vitest', 'run', '--reporter=verbose']);
    const rawStdout = await testCmd.stdout();
    const rawStderr = await testCmd.stderr();
    const exitCode = testCmd.exitCode ?? 1;
    const counts = parseVitestCounts(`${rawStdout}\n${rawStderr}`);

    return {
      command: ALLOWED_TEST_COMMAND,
      exitCode,
      passed: counts.passed,
      failed: counts.failed,
      durationMs: Date.now() - startedAt,
      stdoutExcerpt: redactSecrets(rawStdout, 4000),
      stderrExcerpt: redactSecrets(rawStderr, 4000),
      runnerId: 'vercel-sandbox',
    };
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // Ensure cleanup errors never mask test outcome
      }
    }
  }
}
