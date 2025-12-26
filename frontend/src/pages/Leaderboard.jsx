import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Trophy, Medal, Award, TrendingUp, Home, 
  Crown, Zap, Target, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '../components/layout/AppShell';
import StudentNav from '../components/layout/StudentNav';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeframe, setTimeframe] = useState('all-time');
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await api.getLeaderboard(timeframe);
      setLeaderboard(response.data.rankings || []);
      setUserRank(response.data.user_rank || null);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-warning" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-text-secondary" />;
    if (rank === 3) return <Award className="w-6 h-6 text-warning/70" />;
    return null;
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return 'from-warning to-warning/70';
    if (rank === 2) return 'from-text-secondary to-text-secondary/70';
    if (rank === 3) return 'from-warning/70 to-warning/50';
    return 'from-primary to-accent';
  };

  return (
    <AppShell
      brandTitle="Mentara"
      brandSubtitle="Leaderboard"
      nav={<StudentNav active="leaderboard" />}
      right={(
        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm">
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </button>
      )}
    >
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <div className="spinner w-12 h-12 mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading leaderboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Timeframe Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            {[
              { value: 'daily', label: 'Today', icon: Calendar },
              { value: 'weekly', label: 'This Week', icon: Zap },
              { value: 'all-time', label: 'All Time', icon: Trophy }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTimeframe(tab.value)}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2 ${
                  timeframe === tab.value
                    ? 'bg-gradient-to-r from-primary to-accent text-bg shadow-glow'
                    : 'bg-surface text-text-secondary hover:bg-elevated'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </motion.div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-6 mb-8"
          >
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="card-elevated text-center w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-text-secondary/5 to-transparent"></div>
                <div className="relative z-10 py-6">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-text-secondary to-text-secondary/70 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-bg flex items-center justify-center">
                      <Medal className="w-8 h-8 text-text-secondary" />
                    </div>
                  </div>
                  <h3 className="font-bold text-text mb-1">{leaderboard[1].name}</h3>
                  <p className="text-3xl font-bold text-gradient mb-2">{leaderboard[1].score}%</p>
                  <p className="text-sm text-text-secondary">{leaderboard[1].tests_completed} tests</p>
                </div>
              </div>
              <div className="w-full h-16 bg-gradient-to-br from-text-secondary/20 to-text-secondary/10 mt-4 rounded-t-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-text-secondary">2</span>
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center -mt-8"
            >
              <div className="card-elevated text-center w-full relative overflow-hidden border-2 border-warning/30">
                <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent"></div>
                <div className="relative z-10 py-8">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-warning to-warning/70 flex items-center justify-center animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-bg flex items-center justify-center">
                      <Crown className="w-10 h-10 text-warning" />
                    </div>
                  </div>
                  <h3 className="font-bold text-text mb-1 text-lg">{leaderboard[0].name}</h3>
                  <p className="text-4xl font-bold text-gradient mb-2">{leaderboard[0].score}%</p>
                  <p className="text-sm text-text-secondary">{leaderboard[0].tests_completed} tests</p>
                </div>
              </div>
              <div className="w-full h-24 bg-gradient-to-br from-warning/20 to-warning/10 mt-4 rounded-t-xl flex items-center justify-center">
                <span className="text-3xl font-bold text-warning">1</span>
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="card-elevated text-center w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent"></div>
                <div className="relative z-10 py-6">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-warning/70 to-warning/50 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-bg flex items-center justify-center">
                      <Award className="w-8 h-8 text-warning/70" />
                    </div>
                  </div>
                  <h3 className="font-bold text-text mb-1">{leaderboard[2].name}</h3>
                  <p className="text-3xl font-bold text-gradient mb-2">{leaderboard[2].score}%</p>
                  <p className="text-sm text-text-secondary">{leaderboard[2].tests_completed} tests</p>
                </div>
              </div>
              <div className="w-full h-12 bg-gradient-to-br from-warning/10 to-warning/5 mt-4 rounded-t-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-warning/70">3</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* User's Rank Card */}
        {userRank && userRank.rank > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-elevated mb-8 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-2xl font-bold text-bg">#{userRank.rank}</span>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Your Rank</p>
                  <h3 className="text-xl font-bold text-text">{user?.first_name} {user?.last_name}</h3>
                  <p className="text-sm text-text-secondary">{userRank.tests_completed} tests completed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gradient">{userRank.score}%</p>
                <p className="text-sm text-text-secondary">Average Score</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Rankings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-elevated"
        >
          <h3 className="text-2xl font-bold text-text mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Complete Rankings
          </h3>

          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.05 }}
                className={`p-4 rounded-xl transition-all ${
                  entry.user_id === user?.id
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary'
                    : 'bg-surface hover:bg-elevated'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      index < 3
                        ? `bg-gradient-to-br ${getMedalColor(index + 1)}`
                        : 'bg-elevated'
                    }`}>
                      {getMedalIcon(index + 1) || (
                        <span className="font-bold text-text">#{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-text flex items-center gap-2">
                        {entry.name}
                        {entry.user_id === user?.id && (
                          <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs">You</span>
                        )}
                      </h4>
                      <p className="text-sm text-text-secondary">{entry.tests_completed} tests completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gradient">{entry.score}%</p>
                    <p className="text-xs text-text-secondary">Avg Score</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-30" />
              <p className="text-text-secondary">No rankings available yet</p>
              <p className="text-sm text-text-secondary mt-2">Complete some tests to appear on the leaderboard!</p>
            </div>
          )}
        </motion.div>

        {/* Motivational Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="card-elevated text-center mt-8 bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30"
        >
          <Target className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text mb-2">Keep Climbing!</h3>
          <p className="text-text-secondary">
            Complete more tests and improve your scores to rise up the leaderboard.
          </p>
        </motion.div>
        </>
      )}
    </AppShell>
  );
};

export default Leaderboard;
