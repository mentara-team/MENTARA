// @ts-check
const path = require('path');
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
  const resp = await request.post(`${API_BASE}/auth/login/`, { data: { username, password } });
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

async function apiStartExam(request, accessToken, examId) {
  const resp = await request.post(`${API_BASE}/exams/${examId}/start/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await assertOkJson(resp, 'Start exam');
  if (!data?.attempt_id) throw new Error('Start exam succeeded but no attempt_id returned');
  return data;
}

async function apiSubmitExam(request, accessToken, examId, attemptId, questionId, answerKey) {
  const resp = await request.post(`${API_BASE}/exams/${examId}/submit/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      attempt_id: attemptId,
      responses: [
        {
          question_id: questionId,
          answer_payload: { answers: [answerKey] },
          time_spent_seconds: 0,
        },
      ],
    },
  });
  return await assertOkJson(resp, 'Submit exam');
}

async function loginViaUi(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
}

test.describe('Teacher flow (dynamic)', () => {
  test('teacher grades submission + uploads evaluated PDF; student sees remarks', async ({ page, request }) => {
    test.setTimeout(API_BASE.includes('onrender.com') ? 240_000 : 60_000);
    /** @type {Array<string>} */ const consoleErrors = [];
    /** @type {Array<string>} */ const pageErrors = [];
    /** @type {Array<string>} */ const requestFailures = [];

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => {
      const failure = req.failure();
      // File upload fetch can be marked aborted if navigation happens quickly; we explicitly
      // assert upload success via waitForResponse below.
      if (req.url().includes('/upload-pdf/')) return;
      if (failure && typeof failure.errorText === 'string' && failure.errorText.includes('ERR_ABORTED')) return;
      requestFailures.push(`${req.method()} ${req.url()} -> ${failure ? failure.errorText : 'FAILED'}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Preflight backend
    const health = await request.get(`${API_BASE}/health/`, { timeout: HEALTH_TIMEOUT_MS });
    expect(health.ok(), `Backend not reachable at ${API_BASE}/health/`).toBeTruthy();

    // Arrange: create an exam and a submitted attempt via API
    const suffix = Date.now();
    const admin = await apiLogin(request, 'admin', 'admin123');
    const teacher = await apiLogin(request, 'teacher', 'teacher123');
    const student = await apiLogin(request, 'student', 'student123');

    const topic = await apiCreateTopic(request, admin.access, `PW Topic Teacher ${suffix}`);
    const question = await apiCreateQuestion(request, admin.access, topic.id, `PW Q Teacher ${suffix}: What is 2 + 2?`);
    const exam = await apiCreateExam(request, admin.access, topic.id, `PW Exam Teacher ${suffix}`);
    await apiAddQuestionsToExam(request, admin.access, exam.id, [question.id]);

    const started = await apiStartExam(request, student.access, exam.id);
    const attemptId = started.attempt_id;
    await apiSubmitExam(request, student.access, exam.id, attemptId, question.id, 'B');

    // Teacher grades via UI
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await loginViaUi(page, 'teacher', 'teacher123');
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15_000 });

    // Ensure the dashboard loaded and contains the grade link for this attempt
    const gradeLink = page.locator(`a[href="/teacher/grade/${attemptId}"]`).first();
    await expect(gradeLink).toBeVisible({ timeout: 20_000 });
    await gradeLink.click();

    await expect(page.getByText(/Grade Submission/i)).toBeVisible({ timeout: 15_000 });

    // Enter teacher mark + remarks and save
    const markInput = page.locator('input.mark-input').first();
    await expect(markInput).toBeVisible({ timeout: 15_000 });
    await markInput.fill('1');

    const remarks = `PW Remark ${suffix}`;
    const remarksTextarea = page.locator('textarea.remarks-textarea').first();
    await remarksTextarea.fill(remarks);

    await page.locator('button.save-grade-btn').first().click();

    // Upload evaluated PDF
    const pdfPath = path.join(__dirname, 'fixtures', 'evaluated.pdf');
    await page.locator('input#pdf-upload').setInputFiles(pdfPath);
    const uploadRespP = page.waitForResponse((resp) => {
      return resp.request().method() === 'POST' && resp.url().includes('/upload-pdf/');
    });
    await page.locator('button.upload-pdf-btn').click();
    const uploadResp = await uploadRespP;
    expect(uploadResp.ok(), `Upload PDF failed: ${uploadResp.status()} ${await uploadResp.text()}`).toBeTruthy();

    // Verify via API that grading + PDF are persisted
    const reviewResp = await request.get(`${API_BASE}/attempts/${attemptId}/review/`, {
      headers: { Authorization: `Bearer ${teacher.access}` },
    });
    const review = await assertOkJson(reviewResp, 'Fetch review as teacher');

    const first = (review.responses || [])[0];
    expect(first, 'Expected at least one response in review').toBeTruthy();
    expect(String(first.remarks || ''), 'Expected teacher remarks to be present').toContain(remarks);
    expect(Number(first.teacher_mark), 'Expected teacher_mark to be set to 1').toBe(1);

    // Teacher marks should update attempt score/percentage.
    expect(Number(review.score), 'Expected review.score to reflect teacher grading').toBe(1);
    expect(Number(review.total), 'Expected review.total to be 1 for our single-question exam').toBe(1);
    expect(Number(review.percentage), 'Expected review.percentage to be updated').toBe(100);

    const attemptResp = await request.get(`${API_BASE}/attempts/${attemptId}/`, {
      headers: { Authorization: `Bearer ${teacher.access}` },
    });
    const attempt = await assertOkJson(attemptResp, 'Fetch attempt as teacher');
    expect(attempt?.metadata?.evaluated_pdf, 'Expected evaluated_pdf path to be set in attempt metadata').toBeTruthy();

    // Student sees teacher remark in Attempt Review UI
    await loginViaUi(page, 'student', 'student123');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${BASE_URL}/attempt/${attemptId}/review`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(new RegExp(`Teacher:\\s*${remarks}`))).toBeVisible({ timeout: 20_000 });

    expect(pageErrors, `Page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(requestFailures, `Request failures:\n${requestFailures.join('\n')}`).toEqual([]);
  });
});
