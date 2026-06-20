import { test, expect } from '@playwright/test';
import { dismissWebpackOverlay } from './helpers';

test.describe('404 Not Found ページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await dismissWebpackOverlay(page);
  });

  test('404 メッセージが表示される', async ({ page }) => {
    await expect(page.getByText('404 Page not found')).toBeVisible();
  });

  test('説明文が表示される', async ({ page }) => {
    await expect(
      page.getByText(/We didn't find a page that matches the address you navigated to/i)
    ).toBeVisible();
  });

  test('"Take me home" ボタンが表示される', async ({ page }) => {
    await expect(page.getByRole('button', { name: /take me home/i })).toBeVisible();
  });

  test('"Take me home" クリックで Dashboard に戻る', async ({ page }) => {
    await page.getByRole('button', { name: /take me home/i }).click();
    await dismissWebpackOverlay(page);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('ナビゲーションサイドバーは 404 ページでも表示される', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });
});
