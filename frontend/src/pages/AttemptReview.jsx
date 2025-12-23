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
      brandIcon={(
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-bg" />
        </div>
      )}
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
                          <Badge>Reviewed</Badge>
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
                        {r.answer === null || r.answer === undefined ? '—' : JSON.stringify(r.answer)}
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
