import { test, expect } from '@playwright/test';
import { dismissWebpackOverlay } from './helpers';

test.describe('System Components ページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/systemcomponents');
    await dismissWebpackOverlay(page);
  });

  test('ページタイトルが正しい', async ({ page }) => {
    await expect(page).toHaveTitle('Quarkus Droneshop | System Components');
  });

  test('ページ見出しが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Home Office' })).toBeVisible();
  });

  test('説明文が表示される', async ({ page }) => {
    await expect(page.getByText(/Here is the status of each part of the system/i)).toBeVisible();
  });

  test('Counter コンポーネントが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Counter' })).toBeVisible();
    await expect(page.getByText('coordinates events in the system')).toBeVisible();
  });

  test('QDCA10 コンポーネントが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'QDCA10', exact: true })).toBeVisible();
    await expect(page.getByText('makes drinks')).toBeVisible();
  });

  test('QDCA10Pro コンポーネントが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'QDCA10Pro' })).toBeVisible();
    await expect(page.getByText('makes food')).toBeVisible();
  });

  test('Inventory コンポーネントが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByText(/stores and restocks/i)).toBeVisible();
  });

  test('Counter 行をクリックするとドロワーが展開される', async ({ page }) => {
    await page.locator('#Counter').click();
    await expect(page.getByText('Counter Details')).toBeVisible();
  });

  test('ドロワーの閉じるボタンでドロワーが閉じる', async ({ page }) => {
    await page.locator('#Counter').click();
    await expect(page.getByText('Counter Details')).toBeVisible();
    await page.getByLabel(/close drawer/i).click();
    await expect(page.getByText('Counter Details')).not.toBeVisible();
  });

  test('Inventory の Re-Stock ボタンが表示される', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Re-Stock' })).toBeVisible();
  });

  test('Detail ボタンが複数ある', async ({ page }) => {
    const detailButtons = page.getByRole('button', { name: 'Detail' });
    await expect(detailButtons).toHaveCount(await detailButtons.count());
    expect(await detailButtons.count()).toBeGreaterThanOrEqual(3);
  });
});
