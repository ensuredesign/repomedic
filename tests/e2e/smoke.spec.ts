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

  test('2. Interactive Case Study (/demo) renders 5-stage pipeline, unified diff, and Resend email report drawer', async ({
    page,
  }, testInfo) => {
    await page.goto('/demo');
    await expect(page.locator('h1')).toContainText(
      'Judge Inspection View — Recorded Case Study vs. Live Investigation',
    );
    await expect(
      page.getByText('Proof of Fix — Deterministic Before/After Verification'),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByText('Automated Patch Security & Blast-Radius Audit'),
    ).toBeVisible();
    await expect(page.getByText('6/6 CHECKS PASSED')).toBeVisible();
    await expect(page.getByRole('button', { name: /Attestation JSON/i })).toBeVisible();
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

  test('3. 1-Click User Demo Login (/auth) -> Live Dashboard (/app) -> Profile Management (/app/profile)', async ({
    page,
  }, testInfo) => {
    await page.goto('/auth');
    await expect(page.locator('#one-click-user-login')).toBeVisible();
    await expect(page.locator('#one-click-admin-login')).toBeVisible();

    const authOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(authOverflow).toBe(false);

    await page.locator('#one-click-user-login').click();

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

    // Navigate to Profile Management page
    await page.goto('/app/profile');
    await expect(page.locator('h1')).toContainText('Developer Profile & Preferences');
    await expect(page.locator('#profile-display-name')).toBeVisible({ timeout: 20000 });

    const profileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(profileOverflow).toBe(false);
  });

  test('4. 1-Click Admin Demo Login (/auth) -> Admin Control Plane (/admin) with RBAC & Global Telemetry', async ({
    page,
  }, testInfo) => {
    await page.goto('/auth');
    await page.locator('#one-click-admin-login').click();

    await page.waitForURL('**/admin', { timeout: 25000 });
    await expect(page.locator('h1')).toContainText('RepoMedic Admin Control Plane');
    await expect(page.getByText(/User Directory & Role Management/i)).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('main').getByText('admin@repomedic.dev').first()).toBeVisible();

    const adminOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(adminOverflow).toBe(false);

    await page.screenshot({
      path: `test-results/admin-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});
