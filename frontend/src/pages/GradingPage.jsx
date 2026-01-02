import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft, Upload, Save, CheckCircle, XCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';
import AppShell from '../components/layout/AppShell';
import TeacherNav from '../components/layout/TeacherNav';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

function GradingPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [responses, setResponses] = useState([]);
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const API_BASE = (api?.defaults?.baseURL || '').replace(/\/+$/, '');
  const BACKEND_ORIGIN = API_BASE.replace(/\/?api\/?$/, '');
  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl) return null;
    if (typeof maybeUrl !== 'string') return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    if (maybeUrl.startsWith('/')) return `${BACKEND_ORIGIN}${maybeUrl}`;
    return `${BACKEND_ORIGIN}/${maybeUrl}`;
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  async function loadAttempt() {
    try {
      const res = await api.get(`attempts/${attemptId}/review/`);
      const data = res?.data;

      setAttempt(data);
      
      setResponses(data.responses || []);
      
      // Initialize marks and remarks
      const initialMarks = {};
      const initialRemarks = {};
      data.responses?.forEach(r => {
        initialMarks[r.question_id] = r.teacher_mark ?? 0;
        initialRemarks[r.question_id] = r.remarks || '';
      });
      setMarks(initialMarks);
      setRemarks(initialRemarks);
    } catch (error) {
      console.error('Load attempt error:', error);
      toast.error(error?.response?.data?.detail || error.message || 'Failed to load attempt');
    }
    setLoading(false);
  }

  async function handleGrade(responseId, questionId) {
    try {
      if (attempt?.grades_finalized) {
        toast.error('Grades are finalized and cannot be edited.');
        return;
      }
      if (!responseId) {
        toast.error('Missing response id; please refresh the page.');
        return;
      }

      const raw = marks[questionId];
      const normalized = raw === '' || raw === null || raw === undefined ? null : Number(raw);
      if (normalized !== null && Number.isNaN(normalized)) {
        toast.error('Teacher mark must be a number');
        return;
      }
      await api.post(`responses/${responseId}/grade/`, {
        teacher_mark: normalized,
        remarks: remarks[questionId],
      });
      toast.success('Saved grade');
      await loadAttempt();
    } catch (error) {
      console.error('Grade error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to save grade');
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      const res = await api.post(`attempts/${attemptId}/finalize-grading/`);
      toast.success(res?.data?.detail || 'Grades finalized');
      await loadAttempt();
    } catch (error) {
      console.error('Finalize error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to finalize grades');
    } finally {
      setFinalizing(false);
    }
  }

  async function handleUploadPDF() {
    if (!pdfFile) return;

    if (attempt?.grades_finalized) {
      toast.error('Grades are finalized. PDF upload is locked.');
      return;
    }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      await api.post(`attempts/${attemptId}/upload-pdf/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('PDF uploaded');
      setPdfFile(null);
    } catch (error) {
      console.error('PDF upload error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to upload PDF');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="Grading"
      nav={<TeacherNav active="dashboard" />}
      right={(
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      )}
      containerClassName="max-w-5xl"
    >
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="spinner w-12 h-12" />
        </div>
      ) : responses.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
          title="No responses to grade"
          description="This attempt has no saved responses yet."
          action={
            <button onClick={() => navigate('/teacher/dashboard')} className="btn-primary">
              Go to Teacher Dashboard
            </button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-text">Grade Submission</h1>
              <p className="text-text-secondary">Add marks and feedback per question.</p>
              <div className="mt-2 text-sm text-text-secondary">
                <span className="font-semibold text-text">{attempt?.curriculum_name || attempt?.exam_snapshot?.curriculum_name || '—'}</span>
                <span className="mx-2">•</span>
                <span className="font-semibold text-text">{attempt?.topic_name || attempt?.exam_snapshot?.topic_name || '—'}</span>
                <span className="mx-2">•</span>
                <span className="font-semibold text-text">{attempt?.exam_title || attempt?.exam_snapshot?.exam_title || '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {attempt?.grades_finalized ? (
                <Badge tone="accent"><Lock className="w-3.5 h-3.5 mr-1" />Finalized</Badge>
              ) : (
                <Badge tone="primary">In progress</Badge>
              )}
              <Badge>Attempt #{attemptId}</Badge>
            </div>
          </div>

          <div className="space-y-6">
            {(Array.isArray(attempt?.student_uploads) && attempt.student_uploads.length > 0) || attempt?.evaluated_pdf ? (
              <div className="card-elevated">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-text">Submission Files</div>
                    <div className="text-sm text-text-secondary">Student uploads and evaluated PDF.</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {Array.isArray(attempt?.student_uploads) && attempt.student_uploads.map((u, idx) => (
                    <a
                      key={`${u.path || ''}_${idx}`}
                      href={resolveMediaUrl(u.url || u.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 rounded-xl bg-surface/40 border border-elevated/50 hover:bg-elevated transition-colors"
                    >
                      <div className="text-sm font-semibold text-text truncate">{u.name || u.path}</div>
                      {u.uploaded_at && <div className="text-xs text-text-secondary">{u.uploaded_at}</div>}
                    </a>
                  ))}

                  {(attempt?.evaluated_pdf_url || attempt?.evaluated_pdf) && (
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text truncate">Evaluated PDF</div>
                          <div className="text-xs text-text-secondary truncate">{attempt.evaluated_pdf}</div>
                        </div>
                        <a
                          href={resolveMediaUrl(attempt.evaluated_pdf_url || attempt.evaluated_pdf)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-sm"
                        >
                          Open
                        </a>
                      </div>
                      <div className="mt-3 rounded-xl overflow-hidden border border-elevated/50 bg-surface">
                        <iframe
                          title="Evaluated PDF"
                          src={resolveMediaUrl(attempt.evaluated_pdf_url || attempt.evaluated_pdf)}
                          className="w-full h-[520px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {responses.map((response, idx) => (
              <div key={response.question_id} className="card-elevated">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-text">Question {idx + 1}</div>
                      {response.correct === true ? (
                        <Badge tone="accent"><CheckCircle className="w-3.5 h-3.5 mr-1" />Auto Correct</Badge>
                      ) : response.correct === false ? (
                        <Badge tone="danger"><XCircle className="w-3.5 h-3.5 mr-1" />Auto Incorrect</Badge>
                      ) : (
                        <Badge>Under review</Badge>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-text-secondary whitespace-pre-wrap">
                      {response.statement}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-surface/40 border border-elevated/50">
                    <div className="text-xs text-text-secondary mb-2">Student answer</div>
                    <div className="text-sm text-text whitespace-pre-wrap break-words">
                      {response?.question_type === 'STRUCT'
                        ? ((Array.isArray(attempt?.student_uploads) && attempt.student_uploads.length > 0)
                          ? 'Uploaded submission available (see Submission Files above).'
                          : '—')
                        : (response.answer === null || response.answer === undefined ? '—' : JSON.stringify(response.answer))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface/40 border border-elevated/50">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs text-text-secondary">Teacher mark</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={response?.total_marks ?? undefined}
                          value={marks[response.question_id] ?? 0}
                          onChange={(e) => setMarks({ ...marks, [response.question_id]: e.target.value })}
                          className="input-mentara mt-1"
                          disabled={Boolean(attempt?.grades_finalized)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Remarks</label>
                        <textarea
                          value={remarks[response.question_id] ?? ''}
                          onChange={(e) => setRemarks({ ...remarks, [response.question_id]: e.target.value })}
                          className="input-mentara mt-1 min-h-[96px]"
                          placeholder="Add feedback for student..."
                          disabled={Boolean(attempt?.grades_finalized)}
                        />
                      </div>
                      <button
                        onClick={() => handleGrade(response.response_id, response.question_id)}
                        className="btn-primary inline-flex items-center justify-center gap-2"
                        disabled={Boolean(attempt?.grades_finalized)}
                      >
                        <Save className="w-4 h-4" />
                        Save Grade
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="card-elevated">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-text">Finalize Grades</div>
                  <div className="text-sm text-text-secondary">
                    Once finalized, grades become read-only and rank becomes stable.
                  </div>
                </div>
                {attempt?.rank ? <Badge tone="primary">Rank #{attempt.rank}</Badge> : <Badge>Rank —</Badge>}
              </div>

              <div className="mt-4">
                <button
                  onClick={handleFinalize}
                  className="btn-primary inline-flex items-center justify-center gap-2"
                  disabled={Boolean(attempt?.grades_finalized) || finalizing}
                >
                  <Lock className="w-4 h-4" />
                  {attempt?.grades_finalized ? 'Finalized' : (finalizing ? 'Finalizing…' : 'Finalize Grades')}
                </button>
              </div>
            </div>

            <div className="card-elevated">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-text">Upload Evaluated PDF</div>
                  <div className="text-sm text-text-secondary">Attach the graded paper for the student.</div>
                </div>
                <Badge>PDF</Badge>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="input-mentara"
                  disabled={Boolean(attempt?.grades_finalized)}
                />
                <button
                  onClick={handleUploadPDF}
                  disabled={!pdfFile || saving || Boolean(attempt?.grades_finalized)}
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {saving ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default GradingPage;
