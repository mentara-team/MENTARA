import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck, GraduationCap, Users, FileText, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AppShell from '../components/layout/AppShell';

const BASE_API = (import.meta.env.VITE_BASE_API || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const getToken = () => localStorage.getItem('access_token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const asList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const asDisplay = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value.username) return String(value.username);
    if (value.title) return String(value.title);
    if (value.id !== undefined && value.id !== null) return String(value.id);
    return '—';
  }
  return String(value);
};

const BACKEND_ORIGIN = BASE_API.replace(/\/?api\/?$/, '');
const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar !== 'string') return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  if (avatar.startsWith('/')) return `${BACKEND_ORIGIN}${avatar}`;
  return `${BACKEND_ORIGIN}/${avatar}`;
};

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [examAttemptSummary, setExamAttemptSummary] = useState([]);
  const [stats, setStats] = useState({ total_exams: 0, pending_grading: 0, total_students: 0 });
  const [loading, setLoading] = useState(true);

  const recentExams = useMemo(() => exams.slice(0, 5), [exams]);
  const recentSubmissions = useMemo(() => submissions.slice(0, 10), [submissions]);
  const recentStudents = useMemo(() => students.slice(0, 10), [students]);

  useEffect(() => {
    // If token is missing, bail out to login (ProtectedRoute should prevent this,
    // but this keeps the page resilient if accessed directly).
    if (!getToken()) {
      navigate('/login', { replace: true });
      return;
    }
    loadTeacherDashboard();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  async function loadTeacherDashboard() {
    try {
      const [examsRes, attemptsRes, studentsRes, summaryRes] = await Promise.all([
        fetch(`${BASE_API}/exams/`, { headers: authHeaders() }),
        fetch(`${BASE_API}/attempts/`, { headers: authHeaders() }),
        fetch(`${BASE_API}/users/`, { headers: authHeaders() }),
        fetch(`${BASE_API}/analytics/exams/summary/`, { headers: authHeaders() })
      ]);

      const examsData = await safeJson(examsRes);
      const attemptsData = await safeJson(attemptsRes);
      const studentsData = await safeJson(studentsRes);
      const summaryData = await safeJson(summaryRes);

      const examsList = examsRes.ok ? asList(examsData) : [];
      const attemptsList = attemptsRes.ok ? asList(attemptsData) : [];
      const studentsList = studentsRes.ok ? asList(studentsData) : [];
      const summaryList = summaryRes.ok ? asList(summaryData?.exams ?? summaryData) : [];

      setExams(examsList);

      // Filter for submissions that need grading (structured questions)
      const needsGrading = attemptsList.filter((a) => a && a.status === 'submitted');
      setSubmissions(needsGrading);

      setStudents(studentsList);

      setExamAttemptSummary(summaryList);

      setStats({
        total_exams: examsList.length,
        pending_grading: needsGrading.length,
        total_students: studentsList.length
      });
    } catch (error) {
      console.error('Teacher dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatWhen = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, tone }) => (
    <div className={`card-elevated ${tone || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center border border-elevated/50">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm text-text-secondary">{label}</div>
            <div className="text-2xl font-bold text-text">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      brandIcon={(
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-bg" />
        </div>
      )}
      brandTitle="Mentara"
      brandSubtitle="Teaching • Grading • Progress"
      right={(
        <>
          <Link to="/teacher/exams" className="btn-secondary text-sm">
            <FileText className="w-4 h-4 inline-block mr-2" />
            Manage Exams
          </Link>

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-text">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-text-secondary">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Logout
            </button>
          </div>
        </>
      )}
    >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-text mb-2">Teacher Dashboard</h1>
            <p className="text-text-secondary">
              Grade faster, track performance, and keep students moving.
            </p>
          </div>
          <div className="card-elevated overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-text">
                <Sparkles className="w-5 h-5 text-primary" />
                <div className="font-semibold">Today’s Focus</div>
              </div>
              <div className="text-xs text-text-secondary">Auto-updates</div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-sm text-text-secondary">Pending grading</div>
                <div className="text-xl font-bold text-text">{stats.pending_grading}</div>
              </div>
              <div className="flex-1" />
              <button onClick={loadTeacherDashboard} className="btn-ghost text-sm">Refresh</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={BookOpen} label="Total Exams" value={stats.total_exams} />
          <StatCard
            icon={ClipboardCheck}
            label="Pending Grading"
            value={stats.pending_grading}
            tone="border border-warning/30"
          />
          <StatCard icon={Users} label="Students" value={stats.total_students} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Attempts by Exam
                </h2>
              </div>

              <div className="space-y-3">
                {examAttemptSummary.slice(0, 8).map((row) => (
                  <div
                    key={row.exam_id}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-elevated/50 hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-text truncate">{row.exam_title}</div>
                      <div className="text-xs text-text-secondary">
                        Last attempt: {formatWhen(row.last_attempt_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="font-semibold text-text">{row.attempts_total}</div>
                        <div className="text-xs text-text-secondary">attempts</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-text">{row.unique_students}</div>
                        <div className="text-xs text-text-secondary">students</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-text">{row.avg_percentage}%</div>
                        <div className="text-xs text-text-secondary">avg</div>
                      </div>
                    </div>
                  </div>
                ))}

                {examAttemptSummary.length === 0 && (
                  <div className="text-text-secondary text-sm">No attempts yet.</div>
                )}
              </div>
            </div>

            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Your Exams
                </h2>
                <Link to="/teacher/exams" className="btn-ghost text-sm">Manage →</Link>
              </div>

              <div className="space-y-3">
                {recentExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-elevated/50 hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-text">{exam.title}</div>
                      <div className="text-sm text-text-secondary">
                        {exam.duration_seconds ? `${Math.round(exam.duration_seconds / 60)} min` : '—'} • {exam.total_marks ?? '—'} marks
                      </div>
                    </div>
                    <Link to="/teacher/exams" className="btn-secondary text-sm">Manage</Link>
                  </div>
                ))}

                {exams.length === 0 && (
                  <div className="text-text-secondary text-sm">
                    No exams created yet.
                  </div>
                )}
              </div>
            </div>

            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  Pending Grading
                </h2>
              </div>

              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-warning/20 hover:border-warning/40 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-text">Student #{asDisplay(submission.user)}</div>
                      <div className="text-sm text-text-secondary">Exam: {asDisplay(submission.exam)}</div>
                      <div className="text-xs text-text-secondary">
                        {submission.started_at ? new Date(submission.started_at).toLocaleString() : '—'}
                      </div>
                    </div>
                    <Link to={`/teacher/grade/${submission.id}`} className="btn-primary text-sm">
                      Grade Now
                    </Link>
                  </div>
                ))}

                {submissions.length === 0 && (
                  <div className="text-text-secondary text-sm">All caught up — nothing to grade.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Students
                </h2>
              </div>

              <div className="space-y-3">
                {recentStudents.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface/40 border border-elevated/50"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg border border-elevated/50 flex items-center justify-center flex-shrink-0">
                      {getAvatarUrl(s.avatar) ? (
                        <img src={getAvatarUrl(s.avatar)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-text">
                          {(s.username || 'S').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-text truncate">{s.username}</div>
                      <div className="text-xs text-text-secondary truncate">
                        {(s.first_name || s.last_name) ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : '—'}
                        {s.grade ? ` • Grade: ${s.grade}` : ''}
                      </div>
                      <div className="text-xs text-text-secondary truncate">{s.email || '—'}</div>
                    </div>
                  </div>
                ))}

                {students.length === 0 && (
                  <div className="text-text-secondary text-sm">No students found.</div>
                )}
              </div>
            </div>

            <div className="card-elevated overflow-hidden">
              <div className="text-sm font-semibold text-text mb-3">Classroom Preview</div>
              <div className="rounded-xl overflow-hidden border border-elevated/50 bg-surface">
                <img src="/marketing/hero-team.svg" alt="" className="w-full h-40 object-cover opacity-90" />
              </div>
            </div>
          </div>
        </div>
    </AppShell>
  );
}

export default TeacherDashboard;
