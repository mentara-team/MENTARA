import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Play } from 'lucide-react';

import api from '../services/api';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

function ExamsList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const didLoadRef = useRef(false);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    loadExams();
  }, []);

  async function loadExams() {
    try {
      const res = await api.get('exams/');
      const data = res?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setExams(list);
    } catch (err) {
      console.error('Failed to load exams:', err);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="Choose a test to start"
      nav={<StudentNav active="exams" />}
      right={(
        <Link to="/dashboard" className="btn-secondary text-sm">
          Back
        </Link>
      )}
    >
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Available Tests</h1>
          <p className="text-text-secondary">Pick a test and start immediately.</p>
        </div>
        <button className="btn-secondary text-sm" onClick={loadExams} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-elevated space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="card-elevated space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-primary" />}
          title="No tests available"
          description="Ask your teacher or admin to publish exams."
          action={
            <Link to="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="card-elevated">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-text truncate">{exam.title}</div>
                  <div className="mt-2 text-sm text-text-secondary flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {exam.duration_seconds ? `${Math.round(exam.duration_seconds / 60)} min` : '—'}
                    </span>
                    <span>{exam.total_marks ? `${exam.total_marks} marks` : '—'}</span>
                  </div>
                </div>
                <Link to={`/test/${exam.id}`} className="btn-primary text-sm inline-flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default ExamsList;
