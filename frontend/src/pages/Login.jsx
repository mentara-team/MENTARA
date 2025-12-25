import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/layout/AuthShell';

const Login = () => {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // Redirect based on role
      const user = result.user;
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your learning journey"
      bullets={[
        'Premium student dashboard with analytics & streaks',
        'Teacher + admin dashboards built for speed',
        'Stable timer + resume on refresh during exams',
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {(error || authError) && (
          <div
            role="alert"
            className="flex items-start gap-2 p-4 bg-mentara-error/10 border border-mentara-error/30 rounded-mentara-sm text-mentara-error"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error || authError}</span>
          </div>
        )}

        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-mentara-muted w-5 h-5" />
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
              className="input-mentara pl-11"
              placeholder="Enter your username"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-mentara-muted w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="input-mentara pl-11 pr-11"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mentara-muted hover:text-white transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-mentara-muted mt-2">
            Forgot your password? Contact your institute admin.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-mentara btn-primary text-lg py-4 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            <span>Log In</span>
          )}
        </button>

        {/* Demo Accounts (dev only) */}
        {(import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true') && (
          <div className="mt-6 p-4 bg-mentara-cyan/5 border border-mentara-cyan/20 rounded-mentara-sm">
            <p className="text-sm font-medium mb-2 text-mentara-cyan">Demo Accounts (local)</p>
            <div className="text-xs text-mentara-muted space-y-1">
              <p>Student: student / student123</p>
              <p>Teacher: teacher / teacher123</p>
              <p>Admin: admin / admin123</p>
            </div>
          </div>
        )}
      </form>

      <p className="text-center mt-6 text-mentara-muted">
        Don't have an account?{' '}
        <Link to="/signup" className="text-mentara-cyan hover:text-mentara-teal transition-colors font-medium">
          Sign Up
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
