// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3000';
const API_BASE = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api';
const HEALTH_TIMEOUT_MS = Number(
  process.env.PW_HEALTH_TIMEOUT_MS || (API_BASE.includes('onrender.com') ? 90_000 : 5_000)
);

async function waitForPostResponse(page, urlRegex) {
  return page.waitForResponse((resp) => {
    return resp.request().method() === 'POST' && urlRegex.test(resp.url());
  });
}

async function assertOkJsonResponse(resp, label) {
  if (resp.ok()) return;
  const body = await resp.text().catch(() => '');
  throw new Error(
    `${label} failed: HTTP ${resp.status()} ${resp.statusText()}\n` +
      `URL: ${resp.url()}\n` +
      (body ? `Body: ${body}` : '')
  );
}

async function preflightBackend({ request }) {
  try {
    const resp = await request.get(`${API_BASE}/health/`, { timeout: HEALTH_TIMEOUT_MS });
    if (!resp.ok()) throw new Error(`Backend health returned ${resp.status()}`);
  } catch (err) {
    throw new Error(
      `Backend is not reachable at ${API_BASE}/health/ (timeout ${HEALTH_TIMEOUT_MS}ms).\n` +
        `Original error: ${String(err)}`
    );
  }
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

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

  const tokenKeys = ['access_token', 'access', 'token'];
  const hasToken = async () =>
    page.evaluate((keys) => {
      for (const key of keys) {
        const v = window.localStorage.getItem(key);
        if (v && v.length > 10) return { key, length: v.length };
      }
      return null;
    }, tokenKeys);

  await expect.poll(hasToken, { timeout: 15_000 }).not.toBeNull();
}

test.describe('Admin CRUD smoke', () => {
  test('create topic + question + exam + add question to exam', async ({ page, request }) => {
    test.setTimeout(API_BASE.includes('onrender.com') ? 240_000 : 60_000);
    /** @type {Array<string>} */ const consoleErrors = [];
    /** @type {Array<string>} */ const pageErrors = [];

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const isReactStack =
          text.includes('The above error occurred in the <') ||
          text.includes('Consider adding an error boundary');
        if (!isReactStack) consoleErrors.push(text);
      }
    });

    await preflightBackend({ request });
    await loginAsAdmin(page);

    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    const suffix = Date.now();
    const topicName = `PW Topic ${suffix}`;
    const questionText = `PW Question ${suffix}: What is 2 + 2?`;
    const examTitle = `PW Exam ${suffix}`;

    // Go to Topics & Structure
    await page.getByRole('button', { name: /Topics\s*&\s*Structure/i }).click();

    // Create Topic
    const topicCreateRespP = waitForPostResponse(page, /\/api\/topics\/?$/);

    await page.getByRole('button', { name: /Create Topic/i }).click();
    await page.locator('input[placeholder*="Mathematics" i]').fill(topicName);
    await page.locator('textarea[placeholder*="Brief description" i]').fill('Playwright-created topic for smoke testing');
    await page.locator('input[placeholder*="📚" i]').fill('📘');
    await page.getByRole('button', { name: /Save Changes/i }).click();
    const topicCreateResp = await topicCreateRespP;
    await assertOkJsonResponse(topicCreateResp, 'Create topic');

    await expect(page.getByText(topicName).first()).toBeVisible({ timeout: 15_000 });

    // Go to Question Bank
    await page.getByRole('button', { name: /Question Bank/i }).click();

    // Create Question
    const questionCreateRespP = waitForPostResponse(page, /\/api\/questions\/?$/);

    await page.getByRole('button', { name: /^Create Question$/i }).first().click();
    await page.locator('textarea[placeholder*="Enter your question" i]').fill(questionText);

    // Marks
    const marksInput = page
      .locator('label:has-text("Marks")')
      .first()
      .locator('xpath=..')
      .locator('input[type="number"]');
    await marksInput.fill('2');

    // Topic select: choose the new topic
    const topicSelect = page
      .locator('label:has-text("Topic")')
      .first()
      .locator('xpath=..')
      .locator('select');
    await topicSelect.selectOption({ label: topicName });

    // Options (MCQ)
    await page.locator('input[placeholder="Option A"]').fill('4');
    await page.locator('input[placeholder="Option B"]').fill('3');
    await page.locator('input[placeholder="Option C"]').fill('5');
    await page.locator('input[placeholder="Option D"]').fill('22');

    await page.locator('input[placeholder*="e.g., A" i]').fill('A');

    await page.getByRole('button', { name: /Save Question/i }).click();
    const questionCreateResp = await questionCreateRespP;
    await assertOkJsonResponse(questionCreateResp, 'Create question');
    const createdQuestion = await questionCreateResp.json().catch(() => null);
    const createdQuestionId = createdQuestion?.id;
    if (!createdQuestionId) throw new Error('Create question succeeded but no id was returned');

    await expect(page.getByText(questionText).first()).toBeVisible({ timeout: 15_000 });

    // Go to Exams & Tests
    await page.getByRole('button', { name: /Exams\s*&\s*Tests/i }).click();

    // Create Exam
    const examCreateRespP = waitForPostResponse(page, /\/api\/exams\/?$/);

    await page.getByRole('button', { name: /Create Exam/i }).click();

    await page.locator('input[placeholder*="Mid-Term" i]').fill(examTitle);

    const examTopicSelect = page
      .locator('label:has-text("Topic")')
      .first()
      .locator('xpath=..')
      .locator('select');
    await examTopicSelect.selectOption({ label: topicName });

    const durationInput = page
      .locator('label:has-text("Duration")')
      .first()
      .locator('xpath=..')
      .locator('input[type="number"]');
    await durationInput.fill('10');

    const totalMarksInput = page
      .locator('label:has-text("Total Marks")')
      .first()
      .locator('xpath=..')
      .locator('input[type="number"]');
    await totalMarksInput.fill('2');
    const passingMarksInput = page
      .locator('label:has-text("Passing Marks")')
      .first()
      .locator('xpath=..')
      .locator('input[type="number"]');
    await passingMarksInput.fill('1');

    // Leave status as DRAFT
    await page.getByRole('button', { name: /Save Changes/i }).click();
    const examCreateResp = await examCreateRespP;
    await assertOkJsonResponse(examCreateResp, 'Create exam');
    const createdExam = await examCreateResp.json().catch(() => null);
    const createdExamId = createdExam?.id;
    if (!createdExamId) throw new Error('Create exam succeeded but no id was returned');

    const examCard = page.locator('.premium-card').filter({ hasText: examTitle }).first();
    await expect(examCard).toBeVisible({ timeout: 15_000 });

    // Open the modal (sanity that UI route/button exists)
    await examCard.getByRole('button', { name: /Add Questions/i }).click();
    await expect(page.getByRole('heading', { name: /Add Questions to Exam/i })).toBeVisible({ timeout: 15_000 });

    // Add via API (same endpoint the UI uses), then reload and assert count increments.
    const tokenKeys = ['access_token', 'access', 'token'];
    const accessToken = await page.evaluate((keys) => {
      for (const key of keys) {
        const v = window.localStorage.getItem(key);
        if (v && v.length > 10) return v;
      }
      return null;
    }, tokenKeys);
    if (!accessToken) throw new Error('Missing access token for authenticated API call');

    const addResp = await request.post(`${API_BASE}/exams/${createdExamId}/add-questions/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { question_ids: [createdQuestionId] },
    });
    if (!addResp.ok()) {
      throw new Error(`Add questions via API failed: ${addResp.status()} ${await addResp.text()}`);
    }

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Reload resets the AdminDashboardNew section state back to overview.
    const examsNav = page.getByRole('button', { name: /Exams\s*&\s*Tests/i });
    await expect(examsNav).toBeVisible({ timeout: 15_000 });
    await examsNav.click();
    await expect(page.getByPlaceholder('Search exams...')).toBeVisible({ timeout: 15_000 });

    const updatedExamCard = page.locator('.premium-card').filter({ hasText: examTitle }).first();
    await expect(updatedExamCard).toBeVisible({ timeout: 15_000 });
    const questionsCount = updatedExamCard
      .locator('p', { hasText: /^Questions$/ })
      .first()
      .locator('xpath=following-sibling::p[1]');
    await expect(questionsCount).toHaveText(/1/, { timeout: 15_000 });

    // Sanity: no runtime errors
    expect(pageErrors, `Page errors found:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
