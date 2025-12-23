// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';
const API_BASE = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api';
const HEALTH_TIMEOUT_MS = Number(
  process.env.PW_HEALTH_TIMEOUT_MS || (API_BASE.includes('onrender.com') ? 90_000 : 5_000)
);

test.describe('Admin smoke', () => {
  test('login and load admin dashboard sections', async ({ page, request }) => {
    test.setTimeout(API_BASE.includes('onrender.com') ? 180_000 : 60_000);
    /** @type {Array<string>} */ const consoleErrors = [];
    /** @type {Array<string>} */ const pageErrors = [];
    /** @type {Array<string>} */ const requestFailures = [];

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => {
      const failure = req.failure();
      requestFailures.push(`${req.method()} ${req.url()} -> ${failure ? failure.errorText : 'FAILED'}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // React will log an error boundary/component stack; treat this as non-fatal
        // if it's just the stack trace without an uncaught exception.
        const isReactStack =
          text.includes('The above error occurred in the <') ||
          text.includes('Consider adding an error boundary');
        if (!isReactStack) consoleErrors.push(text);
      }
    });

    // Preflight: backend must be running for login to work
    try {
      const resp = await request.get(`${API_BASE}/health/`, { timeout: HEALTH_TIMEOUT_MS });
      if (!resp.ok()) {
        throw new Error(`Backend health returned ${resp.status()}`);
      }
    } catch (err) {
      throw new Error(
        `Backend is not reachable at ${API_BASE}/health/ (timeout ${HEALTH_TIMEOUT_MS}ms).\n` +
          `Original error: ${String(err)}`
      );
    }

    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    // Flexible selectors (works with our login page)
    const userInput = page
      .locator('input[name="username"], input#username, input[placeholder*="user" i]')
      .first();
    const passInput = page
      .locator('input[name="password"], input#password, input[type="password"]')
      .first();

    await userInput.fill('admin');
    await passInput.fill('admin123');

    const loginButton = page
      .locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login")')
      .first();
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => null),
      loginButton.click(),
    ]);

    // Wait until auth tokens are persisted (our app uses localStorage)
    const tokenKeys = ['access_token', 'access', 'token'];
    const hasToken = async () =>
      page.evaluate((keys) => {
        for (const key of keys) {
          const v = window.localStorage.getItem(key);
          if (v && v.length > 10) return { key, length: v.length };
        }
        return null;
      }, tokenKeys);

    await expect
      .poll(hasToken, {
        timeout: 15_000,
        message:
          `Login did not persist a token. Current URL: ${page.url()}\n` +
          `Request failures:\n${requestFailures.join('\n')}`,
      })
      .not.toBeNull();

    // Now visit admin dashboard (guard should allow)
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(
      page,
      `Expected admin dashboard, got ${page.url()}. Page errors:\n${pageErrors.join(
        '\n'
      )}`
    ).toHaveURL(/\/admin\/dashboard/);

    // Click through sections by visible labels
    const labels = [
      'Dashboard',
      'Topics & Structure',
      'Question Bank',
      'Exams & Tests',
      'User Management',
      'Analytics Hub',
    ];

    for (const label of labels) {
      const item = page.getByRole('button', { name: new RegExp(label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') })
        .or(page.getByRole('link', { name: new RegExp(label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }));
      if (await item.first().isVisible().catch(() => false)) {
        await item.first().click();
        await page.waitForTimeout(350);
      }
    }

    // Assert we didn’t hit obvious runtime failures
    expect(pageErrors, `Page errors found:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
