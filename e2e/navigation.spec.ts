import { test, expect } from '@playwright/test';
import { dismissWebpackOverlay } from './helpers';

test.describe('ナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWebpackOverlay(page);
  });

  test('ページタイトルが正しく設定される', async ({ page }) => {
    await expect(page).toHaveTitle(/Quarkus Droneshop/);
  });

  test('ロゴと名前が表示される', async ({ page }) => {
    await expect(page.getByText('Quarkus Droneshop Homeoffice')).toBeVisible();
  });

  test('ナビゲーションメニューが全て表示される', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'System Components' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Support' })).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('Dashboard リンクをクリックすると "/" に遷移する', async ({ page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('System Components リンクをクリックすると遷移する', async ({ page }) => {
    await page.getByRole('link', { name: 'System Components' }).click();
    await expect(page).toHaveURL('/systemcomponents');
    await expect(page.getByText('Home Office')).toBeVisible();
  });

  test('Support リンクをクリックすると遷移する', async ({ page }) => {
    await page.getByRole('link', { name: 'Support' }).click();
    await expect(page).toHaveURL('/support');
  });

  test('Settings > General に遷移する', async ({ page }) => {
    // Settings グループを展開
    const settingsGroup = page.getByText('Settings');
    await settingsGroup.click();
    await page.getByRole('link', { name: 'General' }).click();
    await expect(page).toHaveURL('/settings/general');
    await expect(page.getByText('General Settings Page Title')).toBeVisible();
  });

  test('Settings > Profile に遷移する', async ({ page }) => {
    const settingsGroup = page.getByText('Settings');
    await settingsGroup.click();
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('/settings/profile');
    await expect(page.getByText('Profile Settings Page Title')).toBeVisible();
  });

  test('存在しないURLにアクセスすると 404 ページが表示される', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await dismissWebpackOverlay(page);
    await expect(page.getByText('404 Page not found')).toBeVisible();
    await expect(page.getByRole('button', { name: /take me home/i })).toBeVisible();
  });

  test('nav-toggle ボタンでサイドバーが折りたたまれる', async ({ page }) => {
    const toggle = page.locator('#nav-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    // サイドバーが collapsed になること
    const sidebar = page.locator('#page-sidebar');
    await expect(sidebar).toHaveClass(/pf-m-collapsed/);
  });

  test('バージョン番号がヘッダーに表示される', async ({ page }) => {
    const pkg = require('../package.json').version;
    await expect(page.getByText(`Release ${pkg}`)).toBeVisible();
  });
});
