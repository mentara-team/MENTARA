import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle } from 'lucide-react';

const AuthShell = ({
  title,
  subtitle,
  children,
  sideTitle = 'Mentara',
  sideSubtitle = 'IB Exam Prep • Analytics • Progress',
  bullets = [
    'Premium dashboards for students, teachers, and admins',
    'Attempt resume + stable timer on refresh',
    'Topic analytics and performance insights',
  ],
}) => {
  return (
    <div className="min-h-screen bg-mentara-dark relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-mentara-cyan/10 rounded-full blur-3xl" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-mentara-teal/10 rounded-full blur-3xl" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left: brand / value prop */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-mentara-cyan to-mentara-teal rounded-mentara-sm flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-mentara-dark" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gradient">{sideTitle}</div>
                <div className="text-sm text-mentara-muted">{sideSubtitle}</div>
              </div>
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10"
            >
              <h2 className="text-4xl font-bold text-white leading-tight">
                A premium SaaS experience,
                <span className="block text-gradient">built for learning.</span>
              </h2>
              <p className="mt-4 text-mentara-muted text-lg max-w-xl">
                Clean, fast, and reliable UX — from login to dashboards to test-taking.
              </p>
            </motion.div>

            <div className="mt-10 space-y-3">
              {bullets.map((b) => (
                <div key={b} className="flex items-start gap-3 text-sm text-gray-200">
                  <div className="mt-0.5 w-6 h-6 rounded-lg bg-mentara-cyan/10 border border-mentara-cyan/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-mentara-cyan" />
                  </div>
                  <div className="leading-relaxed">{b}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-mentara-muted">
            Built with a production-first design system: consistent spacing, typography, and states.
          </div>
        </div>

        {/* Right: auth card */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-10">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-6">
              <Link to="/" className="inline-flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-mentara-cyan to-mentara-teal rounded-mentara-sm flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-mentara-dark" />
                </div>
                <span className="text-3xl font-bold text-gradient">Mentara</span>
              </Link>
              <div className="mt-2 text-sm text-mentara-muted">{sideSubtitle}</div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated"
            >
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white">{title}</h1>
                <p className="text-mentara-muted mt-1">{subtitle}</p>
              </div>

              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
