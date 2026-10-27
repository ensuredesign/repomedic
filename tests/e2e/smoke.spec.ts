import { expect, test } from '@playwright/test';

test.describe('RepoMedic Desktop & Mobile Smoke Tests', () => {
  test('renders landing page, navigates to recorded demo case study, and shows Proof of Fix', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Turn production exceptions into/i }),
    ).toBeVisible();

    await page.getByRole('link', { name: /Open Live Demo/i }).click();
    await expect(page).toHaveURL(/\/demo/);
    await expect(
      page.getByRole('heading', { name: /Judge Inspection View/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Proof of Fix/i }),
    ).toBeVisible();
  });
});
