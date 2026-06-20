import { test, expect } from '@playwright/test';
import { dismissWebpackOverlay } from './helpers';

test.describe('Settings ページ', () => {
  const openSettings = async (page: any) => {
    await page.goto('/');
    await dismissWebpackOverlay(page);
    await page.getByText('Settings').click();
  };

  test('General Settings ページが表示される', async ({ page }) => {
    await page.goto('/settings/general');
    await expect(page).toHaveTitle('Quarkus Droneshop | General Settings');
    await expect(page.getByText('General Settings Page Title')).toBeVisible();
  });

  test('Profile Settings ページが表示される', async ({ page }) => {
    await page.goto('/settings/profile');
    await expect(page).toHaveTitle('Quarkus Droneshop | Profile Settings');
    await expect(page.getByText('Profile Settings Page Title')).toBeVisible();
  });

  test('ナビから General Settings に遷移できる', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('link', { name: 'General' }).click();
    await expect(page).toHaveURL('/settings/general');
    await expect(page.getByText('General Settings Page Title')).toBeVisible();
  });

  test('ナビから Profile Settings に遷移できる', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('/settings/profile');
    await expect(page.getByText('Profile Settings Page Title')).toBeVisible();
  });
});
