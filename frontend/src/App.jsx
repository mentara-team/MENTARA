import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { BackToTopButton, ScrollToTopOnRouteChange } from './components/ScrollToTop';

// Pages
import Landing from './pages/Landing';
import LandingNew from './pages/LandingNew';
import LandingPremium from './pages/LandingPremium';
import MarketingHome from './pages/marketing/Home';
import MarketingAbout from './pages/marketing/About';
import MarketingCourses from './pages/marketing/Courses';
import MarketingResults from './pages/marketing/Results';
import MarketingTeam from './pages/marketing/Team';
import MarketingTestimonials from './pages/marketing/Testimonials';
import MarketingContact from './pages/marketing/Contact';
import MarketingJoin from './pages/marketing/Join';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DebugDashboard from './pages/DebugDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminDashboardNew from './pages/AdminDashboardNew';
import TeacherDashboard from './pages/TeacherDashboard';
import GradingPage from './pages/GradingPage';
import TeacherExams from './pages/TeacherExams';
import ExamsList from './pages/ExamsList';
import Library from './pages/Library';
import AttemptReview from './pages/AttemptReview';
import TestTaking from './pages/TestTaking';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true, requireRole = null }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-mentara-dark flex items-center justify-center">
        <div className="spinner w-16 h-16" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole) {
    if (requireRole === 'admin' && user?.role !== 'ADMIN') {
      return <Navigate to="/dashboard" replace />;
    }
    if (requireRole === 'teacher' && user?.role !== 'TEACHER') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-mentara-dark">
      <ScrollToTopOnRouteChange />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#111216',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px'
          },
          success: {
            iconTheme: {
              primary: '#A6FFCB',
              secondary: '#0A0A0C'
            }
          },
          error: {
            iconTheme: {
              primary: '#ff6b6b',
              secondary: '#0A0A0C'
            }
          }
        }}
      />

      <BackToTopButton />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MarketingHome />} />
        <Route path="/about" element={<MarketingAbout />} />
        <Route path="/courses" element={<MarketingCourses />} />
        <Route path="/results" element={<MarketingResults />} />
        <Route path="/team" element={<MarketingTeam />} />
        <Route path="/testimonials" element={<MarketingTestimonials />} />
        <Route path="/contact" element={<MarketingContact />} />
        <Route path="/join" element={<MarketingJoin />} />

        <Route path="/landing/premium" element={<LandingPremium />} />
        <Route path="/landing/old" element={<LandingNew />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboardNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard/old"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute requireRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/exams"
          element={
            <ProtectedRoute requireRole="teacher">
              <TeacherExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/grade/:attemptId"
          element={
            <ProtectedRoute requireRole="teacher">
              <GradingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Student Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exams"
          element={
            <ProtectedRoute>
              <ExamsList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/attempt/:attemptId/review"
          element={
            <ProtectedRoute>
              <AttemptReview />
            </ProtectedRoute>
          }
        />
        
        {/* Debug Dashboard */}
        <Route
          path="/debug"
          element={
            <ProtectedRoute>
              <DebugDashboard />
            </ProtectedRoute>
          }
        />

        {/* Test Taking */}
        <Route
          path="/test/:examId"
          element={
            <ProtectedRoute>
              <TestTaking />
            </ProtectedRoute>
          }
        />

        {/* Results */}
        <Route
          path="/results/:attemptId"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />

        {/* Leaderboard */}
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
