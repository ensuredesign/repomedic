import { test, expect } from '@playwright/test';

test.describe('RepoMedic Production UI & Responsive Verification (M3/M4)', () => {
  test('1. Landing page (/) renders hero, workflow preview, and has zero horizontal overflow', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(
      'Turn production exceptions into test-backed draft pull requests.',
    );
    await expect(
      page.getByText('Auditable Closed-Loop Engineering Workflow'),
    ).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    await page.screenshot({
      path: `test-results/landing-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test('2. Interactive Case Study (/demo) renders 5-stage pipeline, unified diff, and approval gate', async ({
    page,
  }, testInfo) => {
    await page.goto('/demo');
    await expect(page.locator('h1')).toContainText(
      'Judge Inspection View — Recorded Case Study vs. Live Investigation',
    );
    await expect(
      page.getByText('Proof of Fix — Deterministic Before/After Verification'),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /Email Report/i })).toBeVisible();
    await page.getByRole('button', { name: /Email Report/i }).click();
    await expect(page.locator('#resend-email-input')).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    await page.screenshot({
      path: `test-results/demo-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test('3. Auth (/auth) -> Sign in as Judge -> Live Dashboard (/app) showing verified runs & Draft PR', async ({
    page,
  }, testInfo) => {
    await page.goto('/auth');
    await expect(page.locator('h1')).toContainText('Sign in to RepoMedic');

    const authOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(authOverflow).toBe(false);

    await page.locator('#auth-email').fill('judge@repomedic.dev');
    await page.locator('#auth-password').fill('RepoMedicJudge!2026');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/app', { timeout: 25000 });
    await expect(page.locator('h1')).toContainText('Incident Investigation Runs');
    await expect(page.getByText('Live Verification Run #1').first()).toBeVisible({
      timeout: 20000,
    });

    const appOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(appOverflow).toBe(false);

    await page.screenshot({
      path: `test-results/dashboard-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});
