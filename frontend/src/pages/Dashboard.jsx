import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, BookOpen, Clock, Play, Target, TrendingUp, Trophy, Zap } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const avgScore = useMemo(() => {
    const scores = submittedAttempts.map((a) => Number(a.percentage ?? 0)).filter((n) => Number.isFinite(n));
    if (!scores.length) return 0;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }, [submittedAttempts]);

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

  const trendPoints = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const buckets = days.map((d) => ({ key: d.toDateString(), values: [] }));

    for (const attempt of submittedAttempts) {
      if (!attempt?.started_at) continue;
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

  return (
    <AppShell
      brandIcon={(
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-bg" />
        </div>
      )}
      brandTitle="Mentara"
      brandSubtitle="IB Exam Preparation"
      nav={(
        <StudentNav active="dashboard" />
      )}
      right={(
        <>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold text-text mb-2">Welcome back, {user?.first_name || 'Student'}!</h2>
              <p className="text-text-secondary">You’re on a {streak}-day streak. Keep it going!</p>
            </div>
            <button onClick={() => navigate('/exams')} className="btn-primary">
              <Play className="w-4 h-4 inline-block mr-2" />
              Start Test
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {topStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-elevated"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center border border-elevated/50">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-text">{stat.value}</div>
              </div>
              <p className="text-sm text-text-secondary">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-text">Performance Trend</h3>
                <div className="text-xs text-text-secondary">Last 7 days</div>
              </div>
              <div className="bg-surface/40 border border-elevated/50 rounded-2xl p-4">
                <svg viewBox="0 0 520 160" className="w-full h-40 text-primary">
                  <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.9" />
                  <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="8" strokeOpacity="0.25" />
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
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
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
                        <div className="text-sm font-semibold text-text">{Math.round(Number(a.percentage ?? 0))}%</div>
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
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
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
