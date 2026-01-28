import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Play,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import ThemeToggle from '../components/ui/ThemeToggle';

const LSK = {
  WEEKLY_GOAL: 'mentara_student_weekly_goal',
  ATTEMPT_UI: (attemptId) => `mentara_attempt_${attemptId}_ui`,
};

const readAttemptUi = (attemptId) => {
  try {
    const raw = localStorage.getItem(LSK.ATTEMPT_UI(attemptId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readWeeklyGoal = () => {
  try {
    const raw = localStorage.getItem(LSK.WEEKLY_GOAL);
    const n = raw ? Number(raw) : 5;
    if (!Number.isFinite(n)) return 5;
    return Math.max(1, Math.min(20, Math.round(n)));
  } catch {
    return 5;
  }
};

const writeWeeklyGoal = (n) => {
  try {
    localStorage.setItem(LSK.WEEKLY_GOAL, String(n));
  } catch {
    // ignore
  }
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [weeklyGoal, setWeeklyGoal] = useState(() => readWeeklyGoal());

  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    upcomingExams: [],
    recentAttempts: [],
    topicProgress: [],
    leaderboard: [],
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [examsRes, attemptsRes, topicsRes, leaderboardRes] = await Promise.all([
        api.get('exams/'),
        api.get('users/me/attempts/'),
        api.get('analytics/user/me/topics/'),
        api.get('leaderboard/?period=weekly'),
      ]);

      const examsArray = Array.isArray(examsRes.data) ? examsRes.data : (examsRes.data?.results || []);
      const attemptsArray = attemptsRes.data?.attempts || [];
      const topicsArray = topicsRes.data?.topics || [];
      const leaders = leaderboardRes.data?.leaders || [];

      setDashboardData({
        upcomingExams: examsArray,
        recentAttempts: attemptsArray,
        topicProgress: topicsArray,
        leaderboard: leaders,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTest = (examId) => {
    navigate(`/test/${examId}`);
  };

  const handleViewResults = (attemptId) => {
    navigate(`/results/${attemptId}`);
  };

  const submittedAttempts = useMemo(
    () => (dashboardData.recentAttempts || []).filter((a) => a && (a.status === 'submitted' || a.status === 'timedout')),
    [dashboardData.recentAttempts]
  );

  const gradedSubmittedAttempts = useMemo(
    () => submittedAttempts.filter((a) => !a?.needs_grading),
    [submittedAttempts]
  );

  const latestAttempt = useMemo(() => {
    const attempts = (dashboardData.recentAttempts || []).filter(Boolean);
    if (!attempts.length) return null;

    const sorted = [...attempts].sort((a, b) => {
      const ta = new Date(a?.started_at || a?.finished_at || 0).getTime();
      const tb = new Date(b?.started_at || b?.finished_at || 0).getTime();
      return tb - ta;
    });
    return sorted[0] || null;
  }, [dashboardData.recentAttempts]);

  const latestAttemptUi = useMemo(() => {
    if (!latestAttempt?.id) return null;
    return readAttemptUi(latestAttempt.id);
  }, [latestAttempt?.id]);

  const latestAttemptAnsweredCount = useMemo(() => {
    const answers = latestAttemptUi?.answers;
    if (!answers || typeof answers !== 'object') return 0;
    return Object.keys(answers).length;
  }, [latestAttemptUi]);

  const latestAttemptExamMeta = useMemo(() => {
    const examId = latestAttempt?.exam_id;
    if (!examId) return null;
    return (dashboardData.upcomingExams || []).find((e) => String(e?.id) === String(examId)) || null;
  }, [dashboardData.upcomingExams, latestAttempt?.exam_id]);

  useEffect(() => {
    writeWeeklyGoal(weeklyGoal);
  }, [weeklyGoal]);

  const avgScore = useMemo(() => {
    const scores = gradedSubmittedAttempts.map((a) => Number(a.percentage ?? 0)).filter((n) => Number.isFinite(n));
    if (!scores.length) return 0;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }, [gradedSubmittedAttempts]);

  const streak = useMemo(() => {
    const dates = submittedAttempts
      .map((a) => (a.started_at ? new Date(a.started_at).toDateString() : null))
      .filter(Boolean);
    if (!dates.length) return 0;

    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let count = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.floor((prev - curr) / 86400000);
      if (diffDays === 1) count += 1;
      else break;
    }
    return count;
  }, [submittedAttempts]);

  const myLeaderboardRank = useMemo(() => {
    const username = user?.username;
    if (!username) return null;
    const found = (dashboardData.leaderboard || []).find((l) => l && l.username === username);
    return found?.rank ?? null;
  }, [dashboardData.leaderboard, user?.username]);

  const upcoming = useMemo(() => (dashboardData.upcomingExams || []).slice(0, 3), [dashboardData.upcomingExams]);
  const recentTwo = useMemo(() => submittedAttempts.slice(0, 2), [submittedAttempts]);
  const topTopics = useMemo(() => (dashboardData.topicProgress || []).slice(0, 4), [dashboardData.topicProgress]);

  const trendPoints = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const buckets = days.map((d) => ({ key: d.toDateString(), values: [] }));

    for (const attempt of submittedAttempts) {
      if (!attempt?.started_at) continue;
      if (attempt?.needs_grading) continue;
      const key = new Date(attempt.started_at).toDateString();
      const idx = buckets.findIndex((b) => b.key === key);
      if (idx >= 0) buckets[idx].values.push(Number(attempt.percentage ?? 0));
    }

    return buckets.map((b) => {
      if (!b.values.length) return 0;
      const sum = b.values.reduce((acc, v) => acc + v, 0);
      return Math.round((sum / b.values.length) * 10) / 10;
    });
  }, [submittedAttempts]);

  const trendPath = useMemo(() => {
    const w = 520;
    const h = 160;
    const pad = 12;
    const max = 100;
    const min = 0;
    const pts = trendPoints.length ? trendPoints : [0, 0, 0, 0, 0, 0, 0];
    const stepX = (w - pad * 2) / (pts.length - 1);

    const y = (v) => {
      const clamped = Math.max(min, Math.min(max, v));
      const t = (clamped - min) / (max - min);
      return h - pad - t * (h - pad * 2);
    };

    return pts
      .map((v, i) => {
        const x = pad + i * stepX;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y(v).toFixed(2)}`;
      })
      .join(' ');
  }, [trendPoints]);

  const trendAreaPath = useMemo(() => {
    const w = 520;
    const h = 160;
    const pad = 12;
    const max = 100;
    const min = 0;
    const pts = trendPoints.length ? trendPoints : [0, 0, 0, 0, 0, 0, 0];
    const stepX = (w - pad * 2) / (pts.length - 1);

    const y = (v) => {
      const clamped = Math.max(min, Math.min(max, v));
      const t = (clamped - min) / (max - min);
      return h - pad - t * (h - pad * 2);
    };

    const points = pts.map((v, i) => ({ x: pad + i * stepX, y: y(v) }));
    const start = points[0];
    const end = points[points.length - 1];
    return [
      `M ${start.x.toFixed(2)} ${(h - pad).toFixed(2)}`,
      `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
      ...points.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
      `L ${end.x.toFixed(2)} ${(h - pad).toFixed(2)}`,
      'Z',
    ].join(' ');
  }, [trendPoints]);

  const firstName = user?.first_name || 'Student';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Student';
  const initials = `${(user?.first_name || 'S').slice(0, 1)}${(user?.last_name || 'D').slice(0, 1)}`.toUpperCase();

  const upcomingCards = useMemo(() => {
    const arr = upcoming.length ? upcoming : [];
    return arr.map((e) => ({
      id: e?.id,
      title: e?.title,
      durationMin: Number.isFinite(e?.duration) ? e.duration : Math.round((e?.duration_seconds || 0) / 60),
      questionCount: e?.question_count || 0,
    }));
  }, [upcoming]);

  return (
    <div className="student-dashboard-shell">
      <div className="student-dashboard-layout">
        {/* Sidebar */}
        <aside className="student-dashboard-sidebar">
          <div className="student-dashboard-brand">
            <img
              src="/branding/mentara-logo-transparent.png"
              alt="Mentara"
              className="h-9 w-auto object-contain"
              draggable="false"
            />
            <div className="min-w-0">
              <div className="student-dashboard-brandTitle truncate">Mentara</div>
              <div className="student-dashboard-brandSub truncate">IB Exam Preparation</div>
            </div>
          </div>

          <nav className="student-dashboard-nav" aria-label="Student navigation">
            <Link to="/dashboard" className="student-dashboard-navItem student-dashboard-navItemActive">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link to="/grades" className="student-dashboard-navItem">
              <GraduationCap className="w-4 h-4" />
              Grades
            </Link>
            <Link to="/class" className="student-dashboard-navItem">
              <Users className="w-4 h-4" />
              Class
            </Link>
            <Link to="/groups" className="student-dashboard-navItem">
              <Users className="w-4 h-4" />
              Groups
            </Link>
            <Link to="/administration" className="student-dashboard-navItem">
              <Settings className="w-4 h-4" />
              Administration
            </Link>
            <Link to="/departments" className="student-dashboard-navItem">
              <BookOpen className="w-4 h-4" />
              Departments
            </Link>
            <div className="pt-3 mt-2 border-t border-white/10 light:border-slate-900/10">
              <Link to="/messages" className="student-dashboard-navItem">
                <MessageCircle className="w-4 h-4" />
                Message
              </Link>
              <Link to="/call" className="student-dashboard-navItem">
                <PhoneIconFallback className="w-4 h-4" />
                Call Meeting
              </Link>
            </div>
          </nav>

          <div className="student-dashboard-cta">
            <div className="text-sm font-bold text-white">Upgrade to Pro</div>
            <div className="text-xs student-dashboard-muted mt-1">Unlock premium analytics, streak boosts, and more.</div>
            <button type="button" className="btn-premium w-full mt-3" onClick={() => navigate('/pricing')}>Upgrade</button>
          </div>
        </aside>

        {/* Main */}
        <section className="min-w-0">
          <div className="student-dashboard-header">
            <div className="min-w-0">
              <div className="student-dashboard-subtitle">Hello {firstName}, Welcome back 👋</div>
              <div className="student-dashboard-title">Your Dashboard today</div>
            </div>
            <div className="student-dashboard-topActions">
              <button type="button" className="btn-secondary btn-icon" aria-label="Notifications" title="Notifications">
                <Bell className="w-4 h-4" />
              </button>
              <ThemeToggle />
              <button
                type="button"
                className="btn-secondary btn-icon"
                aria-label="Refresh"
                title="Refresh"
                onClick={loadDashboardData}
                disabled={loading}
              >
                <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                className="btn-secondary btn-icon"
                aria-label="Account"
                title={fullName}
                onClick={logout}
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </span>
              </button>
            </div>
          </div>

          <div className="student-dashboard-heroCard">
            <div className="flex items-center justify-between gap-12">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-white">Creative outdoor ads</div>
                <div className="text-xs student-dashboard-muted mt-1 max-w-[560px]">
                  Every large design company whether it’s a multi-national branding corporation or a regular down to their
                  local magazine publisher needs to fill holes in the workforce.
                </div>
              </div>
              <button onClick={() => navigate('/exams')} className="btn-premium whitespace-nowrap">Get started</button>
            </div>
          </div>

          <div className="student-dashboard-grid" style={{ marginTop: 18 }}>
            <div className="student-dashboard-card">
              <div className="student-dashboard-cardTitle">
                <span>Semester Grade</span>
                <span className="text-xs student-dashboard-muted">Last 7 days</span>
              </div>
              <div className="mt-3">
                {/* Keep existing performance trend SVG (feature logic unchanged) */}
                <div className="bg-black/10 light:bg-slate-900/5 rounded-2xl p-4">
                  <svg viewBox="0 0 520 160" className="w-full h-40">
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
                      </linearGradient>
                    </defs>

                    <g className="text-text" opacity="0.12" stroke="currentColor" strokeWidth="1">
                      <path d="M 12 40 L 508 40" />
                      <path d="M 12 80 L 508 80" />
                      <path d="M 12 120 L 508 120" />
                    </g>

                    <g className="text-primary">
                      <path d={trendAreaPath} fill="url(#trendFill)" />
                      <path d={trendPath} fill="none" stroke="url(#trendStroke)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="12" strokeOpacity="0.12" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>

            <div className="student-dashboard-card">
              <div className="student-dashboard-cardTitle">
                <span>Lesson</span>
                <span className="text-xs student-dashboard-muted">Overview</span>
              </div>
              <div className="mt-3 bg-black/10 light:bg-slate-900/5 rounded-2xl p-4">
                {/* Lightweight donut to match Figma feel; uses existing stats inputs */}
                {(() => {
                  const v1 = Math.max(0, Math.min(100, avgScore));
                  const v2 = Math.max(0, Math.min(100, 100 - v1));
                  const total = Math.max(1, v1 + v2);
                  const d1 = (v1 / total) * 360;
                  const d2 = 360 - d1;
                  return (
                    <div className="flex items-center gap-4">
                      <div
                        className="w-28 h-28 rounded-full"
                        style={{
                          background: `conic-gradient(var(--primary-purple) 0deg ${d1}deg, rgba(255,255,255,0.14) ${d1}deg 360deg)`,
                        }}
                        aria-label="Lesson completion"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-text">Submission</div>
                        <div className="text-xs student-dashboard-muted">Avg score {avgScore}%</div>
                        <div className="mt-3 text-sm font-bold text-text">Streak</div>
                        <div className="text-xs student-dashboard-muted">{streak} days</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="student-dashboard-grid" style={{ marginTop: 18 }}>
            <div className="student-dashboard-card">
              <div className="student-dashboard-cardTitle">
                <span>Your documents</span>
                <span className="text-xs student-dashboard-muted">Recent</span>
              </div>
              <div className="student-dashboard-list">
                {recentTwo.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="student-dashboard-listItem text-left"
                    onClick={() => handleViewResults(a.id)}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text truncate">{a.exam_title}</div>
                      <div className="text-xs student-dashboard-muted truncate">
                        {a.started_at ? new Date(a.started_at).toLocaleString() : '—'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-text">
                      {a?.needs_grading ? 'Pending' : `${Math.round(Number(a.percentage ?? 0))}%`}
                    </span>
                  </button>
                ))}
                {recentTwo.length === 0 && (
                  <div className="text-sm student-dashboard-muted">No documents yet. Start a test to see results.</div>
                )}
              </div>
            </div>

            <div className="student-dashboard-card">
              <div className="student-dashboard-cardTitle">
                <span>Progress learning</span>
                <span className="text-xs student-dashboard-muted">By topics</span>
              </div>
              <div className="student-dashboard-list">
                {topTopics.map((t) => (
                  <div key={t.topic_id} className="student-dashboard-listItem">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text truncate">{t.topic}</div>
                      <div className="text-xs student-dashboard-muted">Accuracy</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-white/10 light:bg-slate-900/10 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, t.accuracy_pct || 0))}%`,
                            background: 'var(--gradient-primary)',
                          }}
                        />
                      </div>
                      <div className="text-xs font-bold text-text w-[44px] text-right">{t.accuracy_pct}%</div>
                    </div>
                  </div>
                ))}
                {topTopics.length === 0 && (
                  <div className="text-sm student-dashboard-muted">No topic data yet. Take a test to see analytics.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right rail */}
        <aside className="student-dashboard-right">
          <div className="student-dashboard-card">
            <div className="student-dashboard-cardTitle">
              <span>Upcoming</span>
              <span className="text-xs student-dashboard-muted">Next</span>
            </div>
            <div className="student-dashboard-list">
              {upcomingCards.slice(0, 4).map((e) => (
                <div key={e.id} className="student-dashboard-listItem">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text truncate">{e.title}</div>
                    <div className="text-xs student-dashboard-muted flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{e.durationMin || 0}m</span>
                      <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{e.questionCount}</span>
                    </div>
                  </div>
                  <button className="btn-secondary text-xs px-3 py-2" onClick={() => handleStartTest(e.id)}>Start</button>
                </div>
              ))}
              {upcomingCards.length === 0 && <div className="text-sm student-dashboard-muted">No upcoming tests.</div>}
            </div>
          </div>

          <div className="student-dashboard-card">
            <div className="student-dashboard-cardTitle">
              <span>Recent Activity</span>
              <span className="text-xs student-dashboard-muted">Latest</span>
            </div>
            <div className="student-dashboard-list">
              {recentTwo.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="student-dashboard-listItem text-left"
                  onClick={() => handleViewResults(a.id)}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text truncate">{a.exam_title}</div>
                    <div className="text-xs student-dashboard-muted">{a.started_at ? new Date(a.started_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="text-xs font-bold text-text">{a?.needs_grading ? 'Pending' : `${Math.round(Number(a.percentage ?? 0))}%`}</div>
                </button>
              ))}
              {recentTwo.length === 0 && <div className="text-sm student-dashboard-muted">No activity yet.</div>}
            </div>
          </div>

          <div className="student-dashboard-card">
            <div className="student-dashboard-cardTitle">
              <span>Latest Message</span>
              <span className="text-xs student-dashboard-muted">Team</span>
            </div>
            <div className="student-dashboard-list">
              {dashboardData.leaderboard.slice(0, 4).map((l) => (
                <div key={l.username} className="student-dashboard-listItem">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/10 light:bg-slate-900/10 flex items-center justify-center text-xs font-bold text-text">
                      {(l.username || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text truncate">{l.username}</div>
                      <div className="text-xs student-dashboard-muted">Rank #{l.rank}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-text">{l.score}</span>
                </div>
              ))}
              {(!dashboardData.leaderboard || dashboardData.leaderboard.length === 0) && (
                <div className="text-sm student-dashboard-muted">No messages yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

function PhoneIconFallback({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6.62 10.79a15.06 15.06 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Dashboard;
