---
name: github-pr-safety
description: Safely integrates GitHub repository reading, pinned revisions, minimal patch validation, and explicit approval-gated idempotent draft pull requests in RepoMedic.
---

# GitHub Source and Pull Request Safety

1. MVP GitHub repository must be owned and **explicitly allowlisted**. Use installation-scoped GitHub App if possible; otherwise a fine-grained token limited to the fixture repo and minimum necessary permissions.
2. Read files from a pinned Git commit SHA; cap total file count and bytes. Defend against path traversal, symlinks and prompt injection in repo data.
3. Patches touch allowlisted source/test files only; reject env files, workflows, lockfiles, binaries, config/secrets, and changes beyond size limits without explicit scope update.
4. Apply proposed modifications only in isolated sandbox initially. Check patch context, base SHA, formatting/test outcomes.
5. Require authenticated user approval recorded against the exact proposed diff hash. Only the server creates a branch and **draft** PR; model never directly gets write tools.
6. Make PR creation idempotent: unique run branch name, existing PR lookup, per-run unique DB constraint, safe retries.
7. Never merge, change default branch, force push, delete remote branches, or deploy customer code automatically.
8. If permissions unavailable, export the real patch and truthfully mark automated PR integration blocked rather than returning a fake URL.
