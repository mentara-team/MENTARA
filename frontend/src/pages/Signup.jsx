import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/layout/AuthShell';

const Signup = () => {
  const navigate = useNavigate();
  const { register, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    grade: '11',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      password_confirm: formData.password_confirm,
      first_name: formData.first_name,
      last_name: formData.last_name,
      grade: formData.grade,
    });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Start your IB Physics mastery journey"
      bullets={[
        'Track mastery with topic analytics',
        'Take timed tests with stable resume on refresh',
        'Earn streaks and climb the leaderboard',
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {(error || authError) && (
          <div
            role="alert"
            className="flex items-start gap-2 p-4 bg-mentara-error/10 border border-mentara-error/30 rounded-mentara-sm text-mentara-error"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm leading-relaxed">{error || authError}</span>
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
              placeholder="Choose a username"
            />
          </div>
          <p className="text-xs text-mentara-muted mt-2">This will be used to sign in.</p>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium mb-2">
              First name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              autoComplete="given-name"
              className="input-mentara"
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium mb-2">
              Last name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              autoComplete="family-name"
              className="input-mentara"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-mentara-muted w-5 h-5" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="input-mentara pl-11"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Grade Selection */}
        <div>
          <label htmlFor="grade" className="block text-sm font-medium mb-2">
            Grade / year
          </label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-mentara-muted w-5 h-5" />
            <select
              id="grade"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              className="input-mentara pl-11 appearance-none"
            >
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11 (IB DP Year 1)</option>
              <option value="12">Grade 12 (IB DP Year 2)</option>
            </select>
          </div>
        </div>

        {/* Password Fields */}
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
              autoComplete="new-password"
              className="input-mentara pl-11 pr-11"
              placeholder="Min. 8 characters"
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
          <p className="text-xs text-mentara-muted mt-2">Use at least 8 characters.</p>
        </div>

        <div>
          <label htmlFor="password_confirm" className="block text-sm font-medium mb-2">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-mentara-muted w-5 h-5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="password_confirm"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className="input-mentara pl-11 pr-11"
              placeholder="Re-enter password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mentara-muted hover:text-white transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Terms */}
        <p className="text-xs text-mentara-muted">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-mentara-cyan hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-mentara-cyan hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-mentara btn-primary text-lg py-4 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <p className="text-center mt-6 text-mentara-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-mentara-cyan hover:text-mentara-teal transition-colors font-medium">
          Log In
        </Link>
      </p>
    </AuthShell>
  );
};

export default Signup;
