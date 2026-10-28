import { createHash } from 'crypto';

const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\b(gh[pousr]_[A-Za-z0-9_]{20,255})\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  {
    pattern: /\b(github_pat_[A-Za-z0-9_]{20,255})\b/g,
    replacement: '[REDACTED_GITHUB_PAT]',
  },
  {
    pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    replacement: '[REDACTED_JWT]',
  },
  {
    pattern: /\b(sk-[A-Za-z0-9_-]{20,})\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  {
    pattern: /\b(v1\.[A-Za-z0-9_-]{20,})\b/g,
    replacement: '[REDACTED_NEBIUS_KEY]',
  },
  {
    pattern: /\b(re_[A-Za-z0-9_]{16,})\b/g,
    replacement: '[REDACTED_RESEND_KEY]',
  },
  {
    pattern: /(Authorization\s*:\s*(?:Bearer|Basic)\s+)[^\s"']+/gi,
    replacement: '$1[REDACTED_AUTH_HEADER]',
  },
  {
    pattern: /((?:NEBIUS_API_KEY|GITHUB_TOKEN|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|VERCEL_TOKEN)\s*=\s*)[^\s"']+/gi,
    replacement: '$1[REDACTED_ENV_SECRET]',
  },
];

export function redactSecrets(input: string, maxChars = 12000): string {
  if (!input) return '';
  let sanitized = input;
  for (const { pattern, replacement } of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  if (sanitized.length > maxChars) {
    return `${sanitized.slice(0, maxChars)}\n...[TRUNCATED_AT_${maxChars}_CHARS]`;
  }
  return sanitized;
}

const FORBIDDEN_PATH_PATTERNS = [
  /(^|\/)\.\.(\/|$)/,
  /^\/+/,
  /\\/,
  /^\.github\/workflows\//i,
  /(^|\/)\.env(\..+)?$/i,
  /(^|\/)pnpm-lock\.yaml$/i,
  /(^|\/)package-lock\.json$/i,
  /(^|\/)yarn\.lock$/i,
  /\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|tar|gz|exe|dll|so|dylib|wasm)$/i,
];

export function isSafeRepositoryFilePath(relativePath: string): boolean {
  if (!relativePath || relativePath.length > 240) return false;
  if (relativePath.includes('\0')) return false;
  for (const rule of FORBIDDEN_PATH_PATTERNS) {
    if (rule.test(relativePath)) {
      return false;
    }
  }
  return /^[A-Za-z0-9_./-]+$/.test(relativePath);
}

export function isPatchableSourcePath(relativePath: string): boolean {
  if (!isSafeRepositoryFilePath(relativePath)) return false;
  if (relativePath === 'package.json' || relativePath.endsWith('/package.json')) {
    return false;
  }
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath);
}

export function getAllowedRepositories(): string[] {
  const raw = process.env.GITHUB_ALLOWED_REPOS || 'ensuredesign/repomedic-fixture';
  return raw
    .split(',')
    .map((r) => r.trim())
    .filter((r) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r));
}

export function isRepositoryAllowlisted(repoFullName: string): boolean {
  const normalized = repoFullName.trim().toLowerCase();
  return getAllowedRepositories().some((allowed) => allowed.toLowerCase() === normalized);
}

export function computeDiffSha256(unifiedDiff: string): string {
  const normalized = unifiedDiff.replace(/\r\n/g, '\n').trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
