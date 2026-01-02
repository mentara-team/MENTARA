import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Award, BookOpen, Clock, Play, Sparkles, Target, TrendingUp, Trophy, Zap } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';
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

  const topStats = useMemo(
    () => [
      { icon: Trophy, label: 'Tests Completed', value: submittedAttempts.length },
      { icon: Target, label: 'Average Score', value: `${avgScore}%` },
      { icon: Zap, label: 'Day Streak', value: streak },
      { icon: Award, label: 'Weekly Rank', value: myLeaderboardRank ? `#${myLeaderboardRank}` : '—' },
    ],
    [avgScore, myLeaderboardRank, streak, submittedAttempts.length]
  );

  const upcoming = useMemo(() => (dashboardData.upcomingExams || []).slice(0, 3), [dashboardData.upcomingExams]);
  const recentTwo = useMemo(() => submittedAttempts.slice(0, 2), [submittedAttempts]);
  const topTopics = useMemo(() => (dashboardData.topicProgress || []).slice(0, 4), [dashboardData.topicProgress]);

  const weeklyCompleted = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    let count = 0;
    for (const a of submittedAttempts) {
      const when = a?.finished_at || a?.started_at;
      if (!when) continue;
      const t = new Date(when).getTime();
      if (Number.isFinite(t) && t >= weekAgo) count += 1;
    }
    return count;
  }, [submittedAttempts]);

  const weeklyPct = useMemo(() => {
    if (!weeklyGoal) return 0;
    return Math.max(0, Math.min(100, Math.round((weeklyCompleted / weeklyGoal) * 100)));
  }, [weeklyCompleted, weeklyGoal]);

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

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="IB Exam Preparation"
      nav={(
        <StudentNav active="dashboard" />
      )}
      right={(
        <>
          <ThemeToggle />
          <button className="btn-secondary text-sm hidden sm:inline-flex" onClick={loadDashboardData} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-text">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-text-secondary">{user?.email}</p>
            </div>
            <button onClick={logout} className="btn-secondary text-sm">Logout</button>
          </div>
        </>
      )}
    >
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="card-elevated p-0 overflow-hidden">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-surface/0 to-primary/5" />
            <div className="absolute -top-28 -right-28 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-28 -left-28 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
            <img
              src="/marketing/hero-home.svg"
              alt=""
              className="hidden lg:block absolute right-6 bottom-0 w-[360px] opacity-40 pointer-events-none select-none"
              draggable="false"
            />

            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-elevated/50 text-xs text-text-secondary mb-3">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  Student Dashboard
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-text mb-2 truncate">
                  Welcome back, {user?.first_name || 'Student'}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                    <Zap className="w-4 h-4 text-primary" />
                    {streak} day streak
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                    <Target className="w-4 h-4 text-primary" />
                    Avg {avgScore}%
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                    <Award className="w-4 h-4 text-primary" />
                    Rank {myLeaderboardRank ? `#${myLeaderboardRank}` : '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <button onClick={() => navigate('/exams')} className="btn-primary w-full sm:w-auto">
                  <Play className="w-4 h-4 inline-block mr-2" />
                  Start Test
                </button>
                <button onClick={() => navigate('/leaderboard')} className="btn-secondary w-full sm:w-auto">
                  View Leaderboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="sm:hidden mb-6">
        <div className="card-elevated flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text truncate">{user?.first_name} {user?.last_name}</div>
            <div className="text-xs text-text-secondary truncate">{user?.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm" onClick={loadDashboardData} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button onClick={logout} className="btn-secondary text-sm">Logout</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.button
          type="button"
          onClick={() => navigate('/library')}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="card-elevated hover:border-primary/30 hover:bg-surface/30 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text">Browse Library</div>
              <div className="text-xs text-text-secondary mt-1">Pick topics and start practicing</div>
            </div>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="mt-4 h-1 w-full rounded-full bg-surface overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => navigate('/exams')}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="card-elevated hover:border-primary/30 hover:bg-surface/30 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text">Take a Test</div>
              <div className="text-xs text-text-secondary mt-1">Timed practice with instant results</div>
            </div>
            <Play className="w-5 h-5" />
          </div>
          <div className="mt-4 h-1 w-full rounded-full bg-surface overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => navigate('/results')}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="card-elevated hover:border-primary/30 hover:bg-surface/30 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text">Review Results</div>
              <div className="text-xs text-text-secondary mt-1">Fix mistakes and improve score</div>
            </div>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="mt-4 h-1 w-full rounded-full bg-surface overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
          </div>
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-10"
      >
        <div className="card-elevated p-0 overflow-hidden">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-surface/0 to-primary/8" />
            <motion.div
              aria-hidden="true"
              className="absolute -top-14 -right-14 w-56 h-56 rounded-full bg-primary/15 blur-3xl"
              animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-16 -left-14 w-64 h-64 rounded-full bg-primary/15 blur-3xl"
              animate={{ y: [0, 12, 0], x: [0, -6, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-elevated/50 text-xs text-text-secondary mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Continue Learning
                </div>

                {!latestAttempt ? (
                  <>
                    <div className="text-2xl font-bold text-text mb-2">Start your first practice session</div>
                    <div className="text-sm text-text-secondary max-w-2xl">
                      Take a timed test and we’ll keep your progress, streak, and analytics updated automatically.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-text mb-2 truncate">{latestAttempt.exam_title || 'Your last test'}</div>
                    {(latestAttempt?.curriculum_name || latestAttempt?.topic_name) ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mb-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                          {latestAttempt.curriculum_name || '—'}
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                          {latestAttempt.topic_name || '—'}
                        </span>
                        {Number.isFinite(Number(latestAttempt?.rank)) ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                            Rank #{latestAttempt.rank}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                        <span className={`w-2 h-2 rounded-full ${latestAttempt.status === 'inprogress' ? 'bg-primary' : 'bg-success'}`} />
                        {latestAttempt.status === 'inprogress' ? 'In progress' : 'Completed'}
                      </span>
                      {latestAttempt.status === 'inprogress' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                          <Target className="w-4 h-4 text-primary" />
                          {latestAttemptExamMeta?.question_count
                            ? `${latestAttemptAnsweredCount}/${latestAttemptExamMeta.question_count} answered`
                            : `${latestAttemptAnsweredCount} answered`}
                        </span>
                      )}
                      {(latestAttempt.status === 'submitted' || latestAttempt.status === 'timedout') && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-elevated/50">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          {latestAttempt?.needs_grading
                            ? 'Pending teacher grading'
                            : (Number.isFinite(Number(latestAttempt.percentage))
                              ? `${Math.round(Number(latestAttempt.percentage))}% score`
                              : 'Results ready')}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {!latestAttempt ? (
                  <button onClick={() => navigate('/exams')} className="btn-primary w-full sm:w-auto">
                    Start Practice
                    <ArrowRight className="w-4 h-4 inline-block ml-2" />
                  </button>
                ) : latestAttempt.status === 'inprogress' ? (
                  <button
                    onClick={() => navigate(`/test/${latestAttempt.exam_id}`)}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Continue Test
                    <ArrowRight className="w-4 h-4 inline-block ml-2" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleViewResults(latestAttempt.id)}
                      className="btn-primary w-full sm:w-auto"
                    >
                      View Results
                      <ArrowRight className="w-4 h-4 inline-block ml-2" />
                    </button>
                    <button
                      onClick={() => navigate(`/attempt/${latestAttempt.id}/review`)}
                      className="btn-secondary w-full sm:w-auto"
                    >
                      Review Answers
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="card-elevated p-0 overflow-hidden mb-10">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-surface/0 to-primary/5" />
          <img
            src="/marketing/hero-results.svg"
            alt=""
            className="hidden md:block absolute right-6 bottom-0 w-[320px] opacity-35 pointer-events-none select-none"
            draggable="false"
          />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="text-xs text-text-secondary mb-2">Today’s Plan</div>
              <div className="text-2xl font-bold text-text mb-2">Build momentum in 20 minutes</div>
              <div className="text-sm text-text-secondary max-w-2xl">
                Quick, guided routine to keep you consistent and improve scores.
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { k: '1', t: 'Pick a topic', d: 'Library → choose weak areas' },
                  { k: '2', t: 'Take one test', d: 'Timed practice' },
                  { k: '3', t: 'Review mistakes', d: 'Fix gaps quickly' },
                ].map((x) => (
                  <div key={x.k} className="bg-surface/40 border border-elevated/50 rounded-2xl p-4">
                    <div className="text-xs text-text-secondary">Step {x.k}</div>
                    <div className="mt-1 font-semibold text-text">{x.t}</div>
                    <div className="mt-1 text-xs text-text-secondary">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button onClick={() => navigate('/library')} className="btn-secondary w-full sm:w-auto">Open Library</button>
              <button onClick={() => navigate('/exams')} className="btn-primary w-full sm:w-auto">Start Practice</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {topStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
            className="card-elevated hover:border-primary/30 hover:bg-surface/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-surface/40 flex items-center justify-center border border-elevated/50">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-text leading-none">{stat.value}</div>
                <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
              </div>
            </div>
            <div className="h-1 w-full rounded-full bg-surface overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
            </div>
          </motion.div>
        ))}
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-text flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Performance Trend
                </h3>
                <div className="text-xs text-text-secondary">Last 7 days</div>
              </div>
              <div className="bg-surface/30 border border-elevated/50 rounded-2xl p-4 overflow-hidden">
                <svg viewBox="0 0 520 160" className="w-full h-40">
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>

                  <g className="text-text" opacity="0.16" stroke="currentColor" strokeWidth="1">
                    <path d="M 12 40 L 508 40" />
                    <path d="M 12 80 L 508 80" />
                    <path d="M 12 120 L 508 120" />
                  </g>

                  <g className="text-primary">
                    <path d={trendAreaPath} fill="url(#trendFill)" />
                    <path d={trendPath} fill="none" stroke="url(#trendStroke)" strokeWidth="3" />
                    <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="10" strokeOpacity="0.15" />
                  </g>
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card-elevated">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-text">Topic Performance</h3>
                  <div className="text-xs text-text-secondary">Accuracy</div>
                </div>
                <div className="space-y-4">
                  {topTopics.map((t) => (
                    <div key={t.topic_id}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="font-semibold text-text">{t.topic}</div>
                        <div className="text-text-secondary">{t.accuracy_pct}%</div>
                      </div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, t.accuracy_pct || 0))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {topTopics.length === 0 && (
                    <div className="text-sm text-text-secondary">No topic data yet. Take a test to see analytics.</div>
                  )}
                </div>
              </div>

              <div className="card-elevated">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-text">Upcoming Tests</h3>
                  <button onClick={() => navigate('/exams')} className="btn-ghost text-sm">View All</button>
                </div>
                <div className="space-y-3">
                  {upcoming.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 rounded-2xl bg-surface/40 border border-elevated/50 hover:border-primary/40 transition-colors"
                    >
                      <div className="font-semibold text-text">{exam.title}</div>
                      <div className="text-xs text-text-secondary mt-1 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {Number.isFinite(exam.duration)
                            ? `${exam.duration} min`
                            : `${Math.round((exam.duration_seconds || 0) / 60)} min`}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {exam.question_count || 0} questions
                        </span>
                      </div>
                      <div className="mt-3">
                        <button onClick={() => handleStartTest(exam.id)} className="btn-secondary text-sm">Start</button>
                      </div>
                    </div>
                  ))}
                  {upcoming.length === 0 && <div className="text-sm text-text-secondary">No tests available yet.</div>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card-elevated">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-text">Recent Activity</h3>
                </div>
                <div className="space-y-3">
                  {recentTwo.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl bg-surface/40 border border-elevated/50 hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => handleViewResults(a.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-text">{a.exam_title}</div>
                        <div className="text-sm font-semibold text-text">
                          {a?.needs_grading ? 'Pending grading' : `${Math.round(Number(a.percentage ?? 0))}%`}
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {a.started_at ? new Date(a.started_at).toLocaleString() : '—'}
                      </div>
                    </div>
                  ))}
                  {recentTwo.length === 0 && (
                    <div className="text-sm text-text-secondary">No activity yet. Start a test to see results.</div>
                  )}
                </div>
              </div>

              <div className="card-elevated">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-text">Achievements</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-surface/40 border border-elevated/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-text">Consistency</div>
                        <div className="text-xs text-text-secondary">{streak} day streak</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface/40 border border-elevated/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-text">Momentum</div>
                        <div className="text-xs text-text-secondary">Avg score {avgScore}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-text">Weekly Goal</h3>
                <div className="text-xs text-text-secondary">Last 7 days</div>
              </div>

              <div className="p-4 rounded-2xl bg-surface/40 border border-elevated/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-secondary">Completed</div>
                    <div className="mt-1 text-2xl font-extrabold text-text">
                      {weeklyCompleted} <span className="text-text-secondary text-base font-semibold">/ {weeklyGoal}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-secondary btn-icon"
                      onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
                      aria-label="Decrease weekly goal"
                      title="Decrease goal"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-icon"
                      onClick={() => setWeeklyGoal((g) => Math.min(20, g + 1))}
                      aria-label="Increase weekly goal"
                      title="Increase goal"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                    <span>Progress</span>
                    <span className="font-semibold text-text">{weeklyPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden border border-elevated/50">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-full"
                      style={{ width: `${weeklyPct}%` }}
                    />
                  </div>
                  <div className="mt-3 text-xs text-text-secondary">
                    Tip: Set a goal you can hit consistently.
                  </div>
                </div>
              </div>
            </div>

            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-text">Skill Analysis</h3>
                <div className="text-xs text-text-secondary">Overview</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-elevated/50">
                  <span className="text-text-secondary">Accuracy</span>
                  <span className="font-semibold text-text">{avgScore}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-elevated/50">
                  <span className="text-text-secondary">Speed</span>
                  <span className="font-semibold text-text">{submittedAttempts.length ? 'Good' : '—'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-elevated/50">
                  <span className="text-text-secondary">Consistency</span>
                  <span className="font-semibold text-text">{streak ? 'Active' : '—'}</span>
                </div>
              </div>
            </div>

            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-text">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <button onClick={() => navigate('/exams')} className="btn-primary w-full">Browse Tests</button>
                <button onClick={() => navigate('/leaderboard')} className="btn-secondary w-full">View Leaderboard</button>
              </div>
            </div>
          </div>
        </div>
    </AppShell>
  );
};

export default Dashboard;
