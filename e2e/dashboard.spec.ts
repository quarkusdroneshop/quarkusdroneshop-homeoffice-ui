import { test, expect } from '@playwright/test';
import { dismissWebpackOverlay } from './helpers';

test.describe('Dashboard ページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWebpackOverlay(page);
  });

  test('Dashboard 見出しが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Key Metrics ラベルが表示される', async ({ page }) => {
    await expect(page.getByText('OrderUp', { exact: true })).toBeVisible();
    await expect(page.getByText('Sales', { exact: true })).toBeVisible();
    await expect(page.getByText('Inventory', { exact: true })).toBeVisible();
  });

  test('Key Metrics セクションが表示される', async ({ page }) => {
    // LabelGroup の categoryName ラベルが DOM に存在することを確認
    await expect(page.getByText('Key Metrics')).toBeVisible();
  });

  test('ページタイトルが正しい', async ({ page }) => {
    await expect(page).toHaveTitle('Quarkus Droneshop | Main Dashboard');
  });
});
