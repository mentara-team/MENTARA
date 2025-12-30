import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderTree, FileQuestion, FileText, Users, BarChart3, 
  Settings, Trophy, Menu, X, Bell, Search, ChevronDown, Sparkles,
  TrendingUp, BookOpen, Target, Award, Zap, Activity, Clock, CheckCircle
} from 'lucide-react';
import TopicManagerNew from '../components/admin/TopicManagerNew';
import QuestionManagerNew from '../components/admin/QuestionManagerNew';
import ExamManagerNew from '../components/admin/ExamManagerNew';
import UserManager from '../components/admin/UserManager';
import AnalyticsPanel from '../components/admin/AnalyticsPanel';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/premium-theme.css';

const AdminDashboardNew = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTopics: 0,
    totalQuestions: 0,
    totalExams: 0,
    activeTests: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
    } else {
      fetchStats();
    }
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Use shared axios instance so base URL + auth + refresh work consistently.
      const { default: api } = await import('../services/api');
      const { data } = await api.get('admin/overview/');
      setStats({
        totalUsers: data.totalUsers || 0,
        totalTopics: data.totalTopics || 0,
        totalQuestions: data.totalQuestions || 0,
        totalExams: data.totalExams || 0,
        activeTests: data.activeAttempts || 0,
        completionRate: data.avgScore || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-purple-500 to-pink-500' },
    { id: 'topics', label: 'Topics & Structure', icon: FolderTree, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'questions', label: 'Question Bank', icon: FileQuestion, gradient: 'from-green-500 to-emerald-500' },
    { id: 'exams', label: 'Exams & Tests', icon: FileText, gradient: 'from-orange-500 to-red-500' },
    { id: 'users', label: 'User Management', icon: Users, gradient: 'from-indigo-500 to-purple-500' },
    { id: 'analytics', label: 'Analytics Hub', icon: BarChart3, gradient: 'from-pink-500 to-rose-500' },
  ];

  const StatCard = ({ title, value, icon: Icon, trend, gradient, loading }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="stat-card group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:shadow-xl transition-shadow`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
            <TrendingUp className="w-4 h-4" />
            <span>{trend}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">
          {loading ? (
            <div className="h-8 w-20 bg-gray-700 rounded shimmer" />
          ) : (
            value.toLocaleString()
          )}
        </h3>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
      </div>
    </motion.div>
  );

  const OverviewSection = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-8 animated-gradient"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Welcome back, Admin!</h1>
          </div>
          <p className="text-white/90 text-lg">
            Manage your platform with ease. Everything is running smoothly.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid-auto-fill">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={Users}
          trend={12}
          gradient="from-purple-500 to-pink-500"
          loading={loading}
        />
        <StatCard 
          title="Total Topics" 
          value={stats.totalTopics} 
          icon={FolderTree}
          trend={8}
          gradient="from-blue-500 to-cyan-500"
          loading={loading}
        />
        <StatCard 
          title="Total Questions" 
          value={stats.totalQuestions} 
          icon={FileQuestion}
          trend={15}
          gradient="from-green-500 to-emerald-500"
          loading={loading}
        />
        <StatCard 
          title="Total Exams" 
          value={stats.totalExams} 
          icon={FileText}
          trend={5}
          gradient="from-orange-500 to-red-500"
          loading={loading}
        />
        <StatCard 
          title="Active Tests" 
          value={stats.activeTests} 
          icon={Activity}
          gradient="from-indigo-500 to-purple-500"
          loading={loading}
        />
        <StatCard 
          title="Avg Completion" 
          value={`${stats.completionRate}%`} 
          icon={CheckCircle}
          trend={3}
          gradient="from-pink-500 to-rose-500"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="premium-card"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'New Topic', icon: FolderTree, action: 'topics' },
            { label: 'Add Questions', icon: FileQuestion, action: 'questions' },
            { label: 'Create Exam', icon: FileText, action: 'exams' },
            { label: 'View Analytics', icon: BarChart3, action: 'analytics' },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveSection(action.action)}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 rounded-xl hover:border-purple-500/50 transition-all group"
            >
              <action.icon className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="premium-card"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Recent Activity
        </h2>
        <div className="space-y-4">
          {[
            { action: 'New user registered', time: '2 minutes ago', icon: Users, color: 'text-green-400' },
            { action: 'Exam completed by 5 students', time: '15 minutes ago', icon: CheckCircle, color: 'text-blue-400' },
            { action: '10 new questions added', time: '1 hour ago', icon: FileQuestion, color: 'text-purple-400' },
            { action: 'Analytics report generated', time: '2 hours ago', icon: BarChart3, color: 'text-pink-400' },
          ].map((activity, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className={`p-2 rounded-lg bg-white/10 ${activity.color}`}>
                <activity.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{activity.action}</p>
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'topics':
        return <TopicManagerNew />;
      case 'questions':
        return (
          <ErrorBoundary
            fallback={
              <div className="p-6 glass-card border border-white/10 rounded-2xl">
                <h2 className="text-white text-lg font-semibold">Question Bank</h2>
                <p className="text-gray-300 mt-2">
                  This section failed to load. Please refresh and try again.
                </p>
              </div>
            }
          >
            <QuestionManagerNew />
          </ErrorBoundary>
        );
      case 'exams':
        return <ExamManagerNew />;
      case 'users':
        return <UserManager />;
      case 'analytics':
        return <AnalyticsPanel />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Top Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src="/branding/mentara-logo-transparent.png"
                  alt="Mentara"
                  className="w-8 h-8 object-contain drop-shadow-sm"
                  loading="eager"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Mentara Admin</h1>
                <p className="text-xs text-gray-400">Control Center</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/50 transition-colors focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-64 focus:outline-none"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20" tabIndex={0}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-white">{user?.username}</p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </motion.nav>

      <div className="flex pt-20">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 top-20 bg-black/40 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />

              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed left-0 top-20 bottom-0 w-72 max-w-[85vw] glass-card border-r border-white/10 p-4 sm:p-6 overflow-y-auto z-40"
              >
              <div className="space-y-2">
                {menuItems.map((item, idx) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                      activeSection === item.id
                        ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      activeSection === item.id ? 'text-white' : ''
                    }`} />
                    <span className="font-semibold">{item.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Logout Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={logout}
                className="w-full mt-6 flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <X className="w-5 h-5" />
                <span className="font-semibold">Logout</span>
              </motion.button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-1 p-4 sm:p-6 transition-all ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardNew;
