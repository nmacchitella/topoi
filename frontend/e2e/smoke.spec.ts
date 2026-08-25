import { expect, test } from '@playwright/test';

test('protected routes redirect to login with a return URL', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login\?returnUrl=%2F$/);
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('login remains usable and zoomable at each supported viewport', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Topoi' }).first()).toBeVisible();
  await expect(page.locator('form').getByRole('button', { name: 'Login', exact: true })).toBeVisible();

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('maximum-scale');
  expect(viewport).not.toContain('user-scalable=no');

  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);
});

test('password login reaches the authenticated shell', async ({ page }) => {
  const tokenPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    .toString('base64url');
  const accessToken = `header.${tokenPayload}.signature`;
  const user = {
    id: 'user-1',
    email: 'demo@example.com',
    name: 'Demo User',
    username: 'demo',
    is_admin: false,
    is_public: false,
    created_at: new Date().toISOString(),
  };

  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith('/auth/login-json')) {
      await route.fulfill({
        json: { access_token: accessToken, refresh_token: 'refresh-token', token_type: 'bearer' },
      });
      return;
    }
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: user });
      return;
    }
    if (pathname.endsWith('/notifications/unread-count')) {
      await route.fulfill({ json: { count: 0 } });
      return;
    }

    await route.fulfill({ json: [] });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill('CorrectHorse7!');
  await page.locator('form').getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByPlaceholder('Search places, users, collections...')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe(accessToken);
});

test('public shared maps fit the mobile viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-specific regression coverage');

  await page.route('**/api/share/demo-token', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'user-1', name: 'Demo User', username: 'demo' },
        places: [],
        lists: [],
        tags: [],
      }),
    });
  });

  await page.goto('/share/demo-token');

  await expect(page.getByText('Topoi', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'List', exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('manifest and service worker are available in production', async ({ context, page, request, isMobile }) => {
  test.skip(isMobile, 'One browser registration check is sufficient');

  const manifest = await request.get('/manifest.json');
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe('standalone');

  const worker = await request.get('/sw.js');
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).toContain('openstreetmap-tiles');

  await page.goto('/login');
  const registered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 10_000)),
    ]);
    return registration !== null;
  });
  expect(registered).toBe(true);

  await page.reload();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
  ).toBe(true);

  await context.setOffline(true);
  try {
    await page.goto('/offline-probe');
    await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
