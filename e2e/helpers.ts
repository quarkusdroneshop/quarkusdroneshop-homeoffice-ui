import { Page } from '@playwright/test';

/** webpack-dev-server のオーバーレイ iframe を削除してクリックをアンブロックする */
export async function dismissWebpackOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
    const overlay2 = document.getElementById('webpack-dev-server-client-overlay-div');
    if (overlay2) overlay2.remove();
  });
}
