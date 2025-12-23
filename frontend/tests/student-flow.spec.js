// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PW_BASE_URL || 'http://127.0.0.1:3000';
const API_BASE = process.env.PW_API_BASE || 'http://127.0.0.1:8000/api';
const HEALTH_TIMEOUT_MS = Number(
  process.env.PW_HEALTH_TIMEOUT_MS || (API_BASE.includes('onrender.com') ? 90_000 : 5_000)
);

async function assertOkJson(resp, label) {
  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  expect(resp.ok(), `${label} failed: ${resp.status()} ${text}`).toBeTruthy();
  return json;
}

async function apiLogin(request, username, password) {
  const resp = await request.post(`${API_BASE}/auth/login/`, {
    data: { username, password },
  });
  const data = await assertOkJson(resp, `Login ${username}`);
  if (!data?.access) throw new Error(`Login ${username} did not return access token`);
  return data;
}

async function apiCreateTopic(request, accessToken, name) {
  const resp = await request.post(`${API_BASE}/topics/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name, description: 'PW topic', parent: null, order: 0 },
  });
  const data = await assertOkJson(resp, 'Create topic');
  if (!data?.id) throw new Error('Create topic succeeded but no id returned');
  return data;
}

async function apiCreateQuestion(request, accessToken, topicId, statement) {
  const resp = await request.post(`${API_BASE}/questions/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      topic: topicId,
      type: 'MCQ',
      statement,
      choices: { A: '4', B: '3', C: '5', D: '22' },
      correct_answers: ['A'],
      marks: 1,
      estimated_time: 60,
      is_active: true,
    },
  });
  const data = await assertOkJson(resp, 'Create question');
  if (!data?.id) throw new Error('Create question succeeded but no id returned');
  return data;
}

async function apiCreateExam(request, accessToken, topicId, title) {
  const resp = await request.post(`${API_BASE}/exams/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title,
      description: 'PW exam',
      topic: topicId,
      duration_seconds: 600,
      total_marks: 1,
      passing_marks: 1,
      shuffle_questions: false,
      visibility: 'PUBLIC',
      instructions: '',
      is_active: true,
    },
  });
  const data = await assertOkJson(resp, 'Create exam');
  if (!data?.id) throw new Error('Create exam succeeded but no id returned');
  return data;
}

async function apiAddQuestionsToExam(request, accessToken, examId, questionIds) {
  const resp = await request.post(`${API_BASE}/exams/${examId}/add-questions/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { question_ids: questionIds },
  });
  await assertOkJson(resp, 'Add questions to exam');
}

async function loginViaUi(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
}

test.describe('Student flow (dynamic)', () => {
  test('start exam → answer → submit → results show 100%', async ({ page, request }) => {
    test.setTimeout(API_BASE.includes('onrender.com') ? 240_000 : 60_000);
    /** @type {Array<string>} */ const consoleErrors = [];
    /** @type {Array<string>} */ const pageErrors = [];
    /** @type {Array<string>} */ const requestFailures = [];

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => {
      const failure = req.failure();
      requestFailures.push(`${req.method()} ${req.url()} -> ${failure ? failure.errorText : 'FAILED'}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Preflight backend
    const health = await request.get(`${API_BASE}/health/`, { timeout: HEALTH_TIMEOUT_MS });
    expect(health.ok(), `Backend not reachable at ${API_BASE}/health/`).toBeTruthy();

    // Create deterministic exam content as admin
    const suffix = Date.now();
    const admin = await apiLogin(request, 'admin', 'admin123');
    const topic = await apiCreateTopic(request, admin.access, `PW Topic Student ${suffix}`);
    const question = await apiCreateQuestion(request, admin.access, topic.id, `PW Q Student ${suffix}: What is 2 + 2?`);
    const exam = await apiCreateExam(request, admin.access, topic.id, `PW Exam Student ${suffix}`);
    await apiAddQuestionsToExam(request, admin.access, exam.id, [question.id]);

    // Student takes exam via UI
    await loginViaUi(page, 'student', 'student123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Available Exams/i)).toBeVisible({ timeout: 15_000 });

    const examCard = page.locator('.attempt-card').filter({ hasText: exam.title }).first();
    await expect(examCard).toBeVisible({ timeout: 15_000 });
    await examCard.getByRole('link', { name: /^Start$/ }).click();

    await expect(page).toHaveURL(new RegExp(`/test/${exam.id}(/|$)`), { timeout: 15_000 });

    // Select the correct answer (A)
    await page.getByText('A.', { exact: true }).click();

    // Submit
    await page.getByRole('button', { name: /Submit Test/i }).click();

    // Results
    await expect(page).toHaveURL(/\/results\//, { timeout: 60_000 });
    await expect(page.getByText(/Test Results/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/100%/)).toBeVisible({ timeout: 60_000 });

    expect(pageErrors, `Page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(requestFailures, `Request failures:\n${requestFailures.join('\n')}`).toEqual([]);
  });
});
