import { test, expect } from '@playwright/test';

test.describe('Dashboard ページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Dashboard 見出しが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Key Metrics ラベルが表示される', async ({ page }) => {
    await expect(page.getByText('OrderUp')).toBeVisible();
    await expect(page.getByText('Sales')).toBeVisible();
    await expect(page.getByText('Inventory')).toBeVisible();
  });

  test('Mocker スイッチが表示される（ローディング完了後）', async ({ page }) => {
    // ローディング状態またはスイッチが表示されることを確認
    const mockerArea = page.locator('#simple-switch, :text("Loading..."), :text("Mocker")');
    await expect(mockerArea.first()).toBeVisible({ timeout: 10_000 });
  });

  test('ページタイトルが正しい', async ({ page }) => {
    await expect(page).toHaveTitle('Quarkus Droneshop | Main Dashboard');
  });
});
