import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck, GraduationCap, Users, FileText, Sparkles, TrendingUp, Folder, ChevronDown, ChevronRight, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import AppShell from '../components/layout/AppShell';
import TeacherNav from '../components/layout/TeacherNav';
import ThemeToggle from '../components/ui/ThemeToggle';

const BASE_API = (import.meta.env.VITE_BASE_API || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
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

  // Paper-based reporting (curriculum tree → select paper/topic → list students)
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [treeRoots, setTreeRoots] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [paperFilters, setPaperFilters] = useState({ level: '', paper_number: '' });
    const isIbCurriculum = (c) => {
      const s = String(c?.slug || c?.name || '').toLowerCase();
      return s === 'ib' || s.includes('international baccalaureate') || s.startsWith('ib');
    };

    const selectedCurriculum = useMemo(
      () => (curriculums || []).find((c) => String(c.id) === String(selectedCurriculumId)) || null,
      [curriculums, selectedCurriculumId]
    );

    const selectedIsIb = useMemo(() => isIbCurriculum(selectedCurriculum), [selectedCurriculum]);

    useEffect(() => {
      if (!selectedIsIb) {
        setPaperFilters({ level: '', paper_number: '' });
      }
    }, [selectedIsIb]);
  const [paperAttemptsLoading, setPaperAttemptsLoading] = useState(false);
  const [paperAttemptRows, setPaperAttemptRows] = useState([]);

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

  useEffect(() => {
    if (!getToken()) return;

    (async () => {
      try {
        const res = await fetch(`${BASE_API}/curriculums/`, { headers: authHeaders() });
        const data = await safeJson(res);
        const list = res.ok ? asList(data) : [];
        setCurriculums(list);
        if (list.length > 0) setSelectedCurriculumId(String(list[0].id));
      } catch {
        setCurriculums([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCurriculumId) return;
    if (!getToken()) return;

    (async () => {
      setTreeLoading(true);
      setTreeRoots([]);
      setExpanded(new Set());
      setSelectedTopic(null);
      setPaperAttemptRows([]);
      try {
        const res = await fetch(`${BASE_API}/curriculums/${selectedCurriculumId}/tree/`, { headers: authHeaders() });
        const data = await safeJson(res);
        const roots = res.ok ? data?.roots : [];
        setTreeRoots(Array.isArray(roots) ? roots : []);
      } catch {
        setTreeRoots([]);
      } finally {
        setTreeLoading(false);
      }
    })();
  }, [selectedCurriculumId]);

  useEffect(() => {
    if (!selectedTopic?.id) return;
    if (!getToken()) return;

    (async () => {
      setPaperAttemptsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('topic', String(selectedTopic.id));
        params.set('completed', '1');
        if (selectedIsIb && paperFilters.level) params.set('level', paperFilters.level);
        if (selectedIsIb && paperFilters.paper_number) params.set('paper_number', paperFilters.paper_number);

        const res = await fetch(`${BASE_API}/attempts/?${params.toString()}`, { headers: authHeaders() });
        const data = await safeJson(res);
        const attempts = res.ok ? asList(data) : [];

        const byStudent = new Map();
        for (const a of attempts) {
          const u = a?.user;
          const key = u?.id ?? u?.username ?? u?.email ?? String(a?.id);
          const when = a?.finished_at || a?.started_at || null;
          const examTitle = a?.exam?.title || '—';

          const prev = byStudent.get(key);
          if (!prev) {
            byStudent.set(key, { user: u, attempts: 1, last_when: when, last_exam: examTitle });
          } else {
            prev.attempts += 1;
            if (when && (!prev.last_when || new Date(when) > new Date(prev.last_when))) {
              prev.last_when = when;
              prev.last_exam = examTitle;
            }
          }
        }

        const rows = Array.from(byStudent.values()).sort((a, b) => {
          const aw = a.last_when ? new Date(a.last_when).getTime() : 0;
          const bw = b.last_when ? new Date(b.last_when).getTime() : 0;
          return bw - aw;
        });
        setPaperAttemptRows(rows);
      } catch {
        setPaperAttemptRows([]);
      } finally {
        setPaperAttemptsLoading(false);
      }
    })();
  }, [paperFilters.level, paperFilters.paper_number, selectedTopic?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  async function loadTeacherDashboard() {
    try {
      const [examsRes, attemptsRes, studentsRes, summaryRes] = await Promise.all([
        fetch(`${BASE_API}/exams/`, { headers: authHeaders() }),
        fetch(`${BASE_API}/attempts/?completed=1&needs_grading=1`, { headers: authHeaders() }),
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

      // Attempts that still have STRUCT responses without teacher_mark.
      const needsGrading = attemptsList;
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

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const TreeNode = ({ node, level }) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = String(selectedTopic?.id) === String(node.id);

    return (
      <div>
        <div
          className={
            `w-full flex items-center gap-2 rounded-xl pr-3 py-2 text-left transition-colors ring-1 ` +
            (isSelected
              ? 'bg-elevated text-text ring-white/10'
              : 'text-text-secondary hover:text-text hover:bg-surface ring-transparent')
          }
          style={{ paddingLeft: `${12 + level * 14}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/5 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-7 h-7 shrink-0" />
          )}

          <button
            type="button"
            aria-current={isSelected ? 'true' : undefined}
            onClick={() => {
              setSelectedTopic(node);
              if (hasChildren && !isExpanded) toggleExpand(node.id);
            }}
            className="min-w-0 flex-1 flex items-center gap-2 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <Folder className="w-4 h-4 shrink-0" />
            <span className="truncate font-semibold">{node.name}</span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map((c) => (
              <TreeNode key={c.id} node={c} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="spinner w-12 h-12" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, tone }) => (
    <div className={`card-elevated hover:border-primary/30 hover:bg-surface/10 transition-colors ${tone || ''}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 rounded-xl bg-surface/40 flex items-center justify-center border border-elevated/50">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-text leading-none">{value}</div>
          <div className="text-xs text-text-secondary mt-1">{label}</div>
        </div>
      </div>
      <div className="h-1 w-full rounded-full bg-surface overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-primary to-accent" />
      </div>
    </div>
  );

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="Teaching • Grading • Progress"
      nav={<TeacherNav active="dashboard" />}
      right={(
        <>
          <ThemeToggle />
          <button onClick={loadTeacherDashboard} className="btn-secondary text-sm" disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
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
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="card-elevated p-0 overflow-hidden">
            <div className="relative p-6 sm:p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-surface/0 to-accent/10" />
              <div className="absolute -top-28 -right-28 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 w-[520px] h-[520px] rounded-full bg-accent/10 blur-3xl" />
              <img
                src="/marketing/hero-team.svg"
                alt=""
                className="hidden lg:block absolute right-6 bottom-0 w-[360px] opacity-35 pointer-events-none select-none"
                draggable="false"
              />

              <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-elevated/50 text-xs text-text-secondary mb-3">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    Teaching Dashboard
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-bold text-text mb-2 truncate">
                    Welcome, {user?.first_name || 'Teacher'}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                      <ClipboardCheck className="w-4 h-4 text-primary" />
                      {stats.pending_grading} pending grading
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                      <Users className="w-4 h-4 text-primary" />
                      {stats.total_students} students
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                      <Zap className="w-4 h-4 text-primary" />
                      {stats.total_exams} exams
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <Link to="/teacher/exams" className="btn-primary w-full sm:w-auto">
                    <FileText className="w-4 h-4 inline-block mr-2" />
                    Manage Exams
                  </Link>
                  <button onClick={loadTeacherDashboard} className="btn-secondary w-full sm:w-auto">
                    Refresh Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <button
            type="button"
            onClick={() => navigate('/teacher/exams')}
            className="card-elevated text-left hover:border-primary/30 hover:bg-surface/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text">Create / Edit Exams</div>
                <div className="text-xs text-text-secondary mt-1">Build papers, attach questions, publish</div>
              </div>
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-4 h-1 w-full rounded-full bg-surface overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-primary to-accent" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById('pending-grading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="card-elevated text-left hover:border-warning/40 hover:bg-surface/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text">Grade Submissions</div>
                <div className="text-xs text-text-secondary mt-1">Keep feedback fast and consistent</div>
              </div>
              <ClipboardCheck className="w-5 h-5 text-warning" />
            </div>
            <div className="mt-4 h-1 w-full rounded-full bg-surface overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-warning to-accent" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById('students-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="card-elevated text-left hover:border-primary/30 hover:bg-surface/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text">View Students</div>
                <div className="text-xs text-text-secondary mt-1">Track engagement and performance</div>
              </div>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-4 h-1 w-full rounded-full bg-surface overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-primary to-accent" />
            </div>
          </button>
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
                      <div className="mt-2 h-1.5 w-full rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent"
                          style={{ width: `${Math.min(100, Math.max(0, Number(row.avg_percentage) || 0))}%` }}
                        />
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
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h2 className="text-xl font-bold text-text flex items-center gap-2">
                  <Folder className="w-5 h-5 text-primary" />
                  Attempts by Paper
                </h2>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="input text-sm min-w-[220px]"
                    value={selectedCurriculumId}
                    onChange={(e) => setSelectedCurriculumId(e.target.value)}
                    aria-label="Select curriculum"
                  >
                    {curriculums.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                    {curriculums.length === 0 && (
                      <option value="">No curriculums</option>
                    )}
                  </select>

                  {selectedIsIb && (
                    <>
                      <select
                        className="input text-sm min-w-[140px]"
                        value={paperFilters.level}
                        onChange={(e) => setPaperFilters((p) => ({ ...p, level: e.target.value }))}
                        aria-label="Select level"
                      >
                        <option value="">All levels</option>
                        <option value="SL">SL</option>
                        <option value="HL">HL</option>
                      </select>

                      <select
                        className="input text-sm min-w-[160px]"
                        value={paperFilters.paper_number}
                        onChange={(e) => setPaperFilters((p) => ({ ...p, paper_number: e.target.value }))}
                        aria-label="Select paper number"
                      >
                        <option value="">All papers</option>
                        <option value="1">Paper 1</option>
                        <option value="2">Paper 2</option>
                        <option value="3">Paper 3</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-text-secondary mb-2">Folders</div>
                  <div className="rounded-xl border border-elevated/50 bg-surface/30 p-2 max-h-[320px] overflow-auto">
                    {treeLoading && (
                      <div className="text-sm text-text-secondary p-3">Loading folders…</div>
                    )}

                    {!treeLoading && treeRoots.length === 0 && (
                      <div className="text-sm text-text-secondary p-3">No topics found for this curriculum.</div>
                    )}

                    {!treeLoading && treeRoots.length > 0 && (
                      <div className="space-y-1">
                        {treeRoots.map((r) => (
                          <TreeNode key={r.id} node={r} level={0} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-text-secondary">
                    Selected: <span className="text-text">{selectedTopic?.name || '—'}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-secondary mb-2">Students who appeared (completed attempts)</div>
                  <div className="rounded-xl border border-elevated/50 bg-surface/30 overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-surface/40 border-b border-elevated/50 text-xs text-text-secondary">
                      <div className="col-span-7">Student</div>
                      <div className="col-span-2 text-right">Attempts</div>
                      <div className="col-span-3 text-right">Last</div>
                    </div>
                    <div className="max-h-[320px] overflow-auto">
                      {!selectedTopic?.id && (
                        <div className="text-sm text-text-secondary p-4">Select a folder to see students.</div>
                      )}

                      {selectedTopic?.id && paperAttemptsLoading && (
                        <div className="text-sm text-text-secondary p-4">Loading attempts…</div>
                      )}

                      {selectedTopic?.id && !paperAttemptsLoading && paperAttemptRows.length === 0 && (
                        <div className="text-sm text-text-secondary p-4">No completed attempts for this selection.</div>
                      )}

                      {selectedTopic?.id && !paperAttemptsLoading && paperAttemptRows.length > 0 && (
                        <div className="divide-y divide-elevated/50">
                          {paperAttemptRows.map((row, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-surface/40 transition-colors"
                            >
                              <div className="col-span-7 min-w-0">
                                <div className="font-semibold text-text truncate">
                                  {row.user?.username || row.user?.email || 'Student'}
                                </div>
                                <div className="text-xs text-text-secondary truncate">
                                  {(row.user?.first_name || row.user?.last_name)
                                    ? `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim()
                                    : (row.user?.email || '—')}
                                </div>
                                <div className="text-xs text-text-secondary truncate">
                                  Last exam: <span className="text-text-secondary">{row.last_exam || '—'}</span>
                                </div>
                              </div>

                              <div className="col-span-2 text-right">
                                <div className="font-semibold text-text">{row.attempts}</div>
                                <div className="text-[11px] text-text-secondary">attempts</div>
                              </div>

                              <div className="col-span-3 text-right">
                                <div className="text-xs text-text-secondary">{formatWhen(row.last_when)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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

            <div className="card-elevated" id="pending-grading">
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
            <div className="card-elevated" id="students-panel">
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
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface/40 border border-elevated/50 hover:border-primary/30 hover:bg-surface/60 transition-colors"
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
