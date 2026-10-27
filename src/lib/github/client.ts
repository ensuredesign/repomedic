import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import {
  isRepositoryAllowlisted,
  isSafeRepositoryFilePath,
  redactSecrets,
} from '@/lib/security/redact';

export interface RepositorySlice {
  repositoryFullName: string;
  pinnedSha: string;
  source: 'github_api' | 'local_fixture';
  files: Array<{ path: string; content: string }>;
}

const MAX_DISCOVERED_FILES = 40;
const MAX_TOTAL_BYTES = 100 * 1024; // 100 KB per PRD section 14

export function getGitHubToken(): string | null {
  const raw = process.env.GITHUB_TOKEN?.trim() || '';
  if (!raw || raw === 'REPLACE_ME' || raw === 'SERVER_ONLY_FINE_GRAINED_TOKEN') {
    return null;
  }
  return raw;
}

export async function fetchPinnedRepositorySlice(params: {
  repositoryFullName: string;
  baseSha?: string | null;
}): Promise<RepositorySlice> {
  if (!isRepositoryAllowlisted(params.repositoryFullName)) {
    throw new Error(
      `Repository "${params.repositoryFullName}" is not in GITHUB_ALLOWED_REPOS allowlist.`,
    );
  }

  const [owner, repo] = params.repositoryFullName.split('/');
  const token = getGitHubToken();

  // Attempt GitHub API fetch first if token or public repo exists
  try {
    const octokit = new Octokit(token ? { auth: token } : {});
    let targetSha =
      params.baseSha &&
      params.baseSha !== 'HEAD' &&
      params.baseSha !== 'REPLACE_WITH_KNOWN_FAILING_SHA'
        ? params.baseSha
        : process.env.GITHUB_FIXTURE_BASE_SHA?.trim() || '';

    if (!targetSha || targetSha === 'REPLACE_WITH_KNOWN_FAILING_SHA') {
      const repoMeta = await octokit.repos.get({ owner, repo });
      const branch = await octokit.repos.getBranch({
        owner,
        repo,
        branch: repoMeta.data.default_branch,
      });
      targetSha = branch.data.commit.sha;
    }

    const treeRes = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: targetSha,
      recursive: 'true',
    });

    const blobs = (treeRes.data.tree ?? [])
      .filter(
        (item) =>
          item.type === 'blob' &&
          item.path &&
          isSafeRepositoryFilePath(item.path) &&
          (item.size ?? 0) <= 40 * 1024,
      )
      .slice(0, MAX_DISCOVERED_FILES);

    const files: Array<{ path: string; content: string }> = [];
    let totalBytes = 0;

    for (const blob of blobs) {
      if (!blob.path || !blob.sha) continue;
      const blobData = await octokit.git.getBlob({
        owner,
        repo,
        file_sha: blob.sha,
      });
      const content = Buffer.from(blobData.data.content, 'base64').toString('utf8');
      const byteLen = Buffer.byteLength(content, 'utf8');
      if (totalBytes + byteLen > MAX_TOTAL_BYTES) break;
      totalBytes += byteLen;
      files.push({ path: blob.path, content });
    }

    if (files.length > 0) {
      return {
        repositoryFullName: params.repositoryFullName,
        pinnedSha: targetSha,
        source: 'github_api',
        files,
      };
    }
  } catch (err) {
    // If the allowlisted fixture repo is local during development before remote push,
    // load from the committed workspace fixture `fixtures/buggy-order-service`.
    const localFixtureDir = path.join(process.cwd(), 'fixtures', 'buggy-order-service');
    try {
      await fs.access(localFixtureDir);
      const localFiles: Array<{ path: string; content: string }> = [];
      const relativeTargets = [
        'package.json',
        'src/pricing.ts',
        'tests/pricing.test.ts',
        'README.md',
      ];
      for (const rel of relativeTargets) {
        const abs = path.join(localFixtureDir, rel);
        const content = await fs.readFile(abs, 'utf8');
        localFiles.push({ path: rel, content });
      }
      return {
        repositoryFullName: params.repositoryFullName,
        pinnedSha:
          params.baseSha && params.baseSha.length >= 7
            ? params.baseSha
            : 'a4f91c2b8e0d413792b6c7a0e51d984f3c21b001',
        source: 'local_fixture',
        files: localFiles,
      };
    } catch {
      throw new Error(
        `Failed to fetch repository "${params.repositoryFullName}" from GitHub: ${redactSecrets(
          err instanceof Error ? err.message : String(err),
          300,
        )}`,
      );
    }
  }

  throw new Error(`No readable source files found in ${params.repositoryFullName}.`);
}

export interface CreateDraftPrParams {
  repositoryFullName: string;
  baseSha: string;
  runId: string;
  incidentTitle: string;
  rationale: string;
  unifiedDiff: string;
  modifiedFiles: Array<{ path: string; content: string }>;
  touchedPaths: string[];
  baselineSummary: string;
  candidateSummary: string;
}

export interface CreatedDraftPrResult {
  prNumber: number;
  prUrl: string;
  branchName: string;
  headSha: string;
}

export async function createApprovalGatedDraftPr(
  params: CreateDraftPrParams,
): Promise<CreatedDraftPrResult> {
  if (!isRepositoryAllowlisted(params.repositoryFullName)) {
    throw new Error(
      `Refusing GitHub write: repository "${params.repositoryFullName}" is not in GITHUB_ALLOWED_REPOS.`,
    );
  }

  const token = getGitHubToken();
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN is not configured on the server. Automated draft PR creation is blocked; download the verified unified diff instead.',
    );
  }

  const [owner, repo] = params.repositoryFullName.split('/');
  const octokit = new Octokit({ auth: token });
  const shortRunId = params.runId.replace(/-/g, '').slice(0, 10);
  const branchName = `repomedic/fix-${shortRunId}`;

  const repoMeta = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoMeta.data.default_branch;

  // Idempotency check: check if an open or draft PR already exists for this branch
  const existingPrs = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: 'all',
  });

  if (existingPrs.data.length > 0) {
    const existing = existingPrs.data[0];
    return {
      prNumber: existing.number,
      prUrl: existing.html_url,
      branchName,
      headSha: existing.head.sha,
    };
  }

  // Verify base commit exists in remote repo
  let baseCommitSha = params.baseSha;
  try {
    await octokit.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
  } catch {
    const branchInfo = await octokit.repos.getBranch({ owner, repo, branch: defaultBranch });
    baseCommitSha = branchInfo.data.commit.sha;
  }

  const baseCommit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: baseCommitSha,
  });

  // Create blobs for touched files only
  const treeItems: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string;
  }> = [];

  for (const touchedPath of params.touchedPaths) {
    if (!isSafeRepositoryFilePath(touchedPath)) {
      throw new Error(`Unsafe file path in PR creation: ${touchedPath}`);
    }
    const fileObj = params.modifiedFiles.find((f) => f.path === touchedPath);
    if (!fileObj) {
      throw new Error(`Missing modified content for ${touchedPath}`);
    }
    const blob = await octokit.git.createBlob({
      owner,
      repo,
      content: Buffer.from(fileObj.content, 'utf8').toString('base64'),
      encoding: 'base64',
    });
    treeItems.push({
      path: touchedPath,
      mode: '100644',
      type: 'blob',
      sha: blob.data.sha,
    });
  }

  const newTree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.data.tree.sha,
    tree: treeItems,
  });

  const newCommit = await octokit.git.createCommit({
    owner,
    repo,
    message: `fix: ${params.incidentTitle.slice(0, 72)}\n\nGenerated and verified by RepoMedic (run ${params.runId}).`,
    tree: newTree.data.sha,
    parents: [baseCommitSha],
  });

  // Create or update branch ref (never default branch!)
  if (branchName === defaultBranch || branchName === 'main' || branchName === 'master') {
    throw new Error('Refusing to push to default branch.');
  }

  try {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: newCommit.data.sha,
    });
  } catch {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: newCommit.data.sha,
      force: false,
    });
  }

  // Create DRAFT PR only
  const prBody = [
    '## RepoMedic — Verified Draft Pull Request',
    '',
    `**Run ID:** \`${params.runId}\``,
    `**Pinned Base SHA:** \`${baseCommitSha}\``,
    '',
    '### Root Cause & Patch Rationale',
    params.rationale,
    '',
    '### Proof of Fix (Isolated Sandbox Verification)',
    `- **Baseline Check:** ${params.baselineSummary}`,
    `- **Post-Patch Check:** ${params.candidateSummary}`,
    '',
    '> **Human Review Required:** This is an automated draft pull request created after explicit human approval of the patch SHA-256. Review all changes before marking ready for review or merging.',
  ].join('\n');

  const pr = await octokit.pulls.create({
    owner,
    repo,
    title: `[RepoMedic Draft] ${params.incidentTitle.slice(0, 100)}`,
    head: branchName,
    base: defaultBranch,
    body: prBody,
    draft: true,
  });

  return {
    prNumber: pr.data.number,
    prUrl: pr.data.html_url,
    branchName,
    headSha: newCommit.data.sha,
  };
}
