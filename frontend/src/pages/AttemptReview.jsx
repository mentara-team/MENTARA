import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

function AttemptReview() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [attemptId]);

  const API_BASE = (api?.defaults?.baseURL || '').replace(/\/+$/, '');
  const BACKEND_ORIGIN = API_BASE.replace(/\/?api\/?$/, '');
  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl) return null;
    if (typeof maybeUrl !== 'string') return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    if (maybeUrl.startsWith('/')) return `${BACKEND_ORIGIN}${maybeUrl}`;
    return `${BACKEND_ORIGIN}/${maybeUrl}`;
  };

  async function load() {
    try {
      const res = await api.get(`attempts/${attemptId}/review/`);
      setData(res?.data || null);
    } catch (err) {
      console.error('Attempt review load error:', err);
      toast.error(err?.response?.data?.detail || err.message || 'Failed to load attempt review');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle={data?.exam_title || 'Attempt Review'}
      nav={<StudentNav active="dashboard" />}
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
      ) : !data ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-primary" />}
          title="Unable to load attempt"
          description="This attempt may not exist, or you may not have access."
          action={
            <Link to="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-text">{data.exam_title || 'Attempt Review'}</h1>
              <p className="text-text-secondary">
                Score: {data.score ?? '—'} / {data.total ?? '—'}
                {data.percentage !== undefined && data.percentage !== null ? ` • ${data.percentage}%` : ''}
              </p>
            </div>
            <Badge tone="primary">Attempt #{attemptId}</Badge>
          </div>

          {data?.missing_submission_upload ? (
            <div className="card-elevated mb-6">
              <div className="text-text font-bold">Submission file not found</div>
              <div className="mt-1 text-sm text-text-secondary">
                This attempt contains structured questions but no uploaded answer file is attached. If you uploaded,
                please retry the upload and contact support if it still doesn’t appear.
              </div>
            </div>
          ) : null}

          {(Array.isArray(data?.student_uploads) && data.student_uploads.length > 0) || data?.evaluated_pdf ? (
            <div className="card-elevated mb-6">
              <div className="text-lg font-bold text-text">Submission Files</div>
              <div className="text-sm text-text-secondary">Your uploaded answers and the evaluated PDF (if published).</div>

              <div className="mt-4 space-y-2">
                {Array.isArray(data?.student_uploads) && data.student_uploads.map((u, idx) => (
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

                {(data?.evaluated_pdf_url || data?.evaluated_pdf) ? (
                  <a
                    href={resolveMediaUrl(data.evaluated_pdf_url || data.evaluated_pdf)}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-3 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors"
                  >
                    <div className="text-sm font-semibold text-text truncate">Evaluated PDF</div>
                    <div className="text-xs text-text-secondary truncate">{data.evaluated_pdf}</div>
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="card-elevated">
            <h2 className="text-xl font-bold text-text mb-4">Responses</h2>
            <div className="space-y-3">
              {(data.responses || []).map((r, idx) => (
                <div
                  key={`${r.question_id}-${idx}`}
                  className="p-4 rounded-2xl bg-surface/40 border border-elevated/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-text">Q{idx + 1}</div>
                          {r.correct === true ? (
                          <Badge tone="accent"><CheckCircle className="w-3.5 h-3.5 mr-1" />Correct</Badge>
                        ) : r.correct === false ? (
                          <Badge tone="danger"><XCircle className="w-3.5 h-3.5 mr-1" />Incorrect</Badge>
                        ) : (
                            <Badge>{r.question_type === 'STRUCT' ? 'Under review' : 'Reviewed'}</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
                        {r.statement}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-text font-semibold">
                        {r.marks_obtained ?? '—'} / {r.total_marks ?? '—'}
                      </div>
                      <div className="text-text-secondary">marks</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-bg border border-elevated/50">
                      <div className="text-xs text-text-secondary mb-1">Your answer</div>
                      <div className="text-sm text-text whitespace-pre-wrap break-words">
                        {r.question_type === 'STRUCT'
                          ? ((Array.isArray(data?.student_uploads) && data.student_uploads.length > 0)
                            ? 'Uploaded submission (see Submission Files above).'
                            : '—')
                          : (r.answer === null || r.answer === undefined ? '—' : JSON.stringify(r.answer))}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-bg border border-elevated/50">
                      <div className="text-xs text-text-secondary mb-1">Teacher remarks</div>
                      <div className="text-sm text-text whitespace-pre-wrap break-words">
                        {r.remarks ? r.remarks : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(data.responses || []).length === 0 ? (
                <div className="text-sm text-text-secondary">No responses found for this attempt.</div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Link to="/dashboard" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default AttemptReview;
