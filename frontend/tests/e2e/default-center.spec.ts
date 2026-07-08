import { test, expect } from '@playwright/test';

test('Verify default map center coordinates', async ({ page }) => {
  // Add listener for browser console logs
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // The URL sync might be debounced, so wait for a short period or poll
  await expect(async () => {
    const url = new URL(page.url());
    console.log('CURRENT URL:', url.toString());
    expect(url.searchParams.get('lat')).toBe('23.82280');
    expect(url.searchParams.get('lon')).toBe('120.10130');
    expect(url.searchParams.get('zoom')).toBe('7.5');
  }).toPass({ timeout: 10000 });
});
