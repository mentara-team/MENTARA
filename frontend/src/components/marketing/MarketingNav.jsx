import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navLinkBase = 'text-sm font-semibold transition-colors';
const navLinkActive = 'text-white';
const navLinkInactive = 'text-gray-400 hover:text-white';

export default function MarketingNav() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);

  const links = useMemo(
    () => ([
      { to: '/', label: 'Home' },
      { to: '/about', label: 'About' },
      { to: '/courses', label: 'Courses' },
      { to: '/results', label: 'Result' },
      { to: '/team', label: 'Our Team' },
      { to: '/testimonials', label: 'Testimonial' },
      { to: '/contact', label: 'Contact' },
    ]),
    []
  );

  const goDashboard = () => {
    if (user?.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user?.role === 'TEACHER') navigate('/teacher/dashboard');
    else navigate('/dashboard');
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-3"
            onClick={() => {
              setOpen(false);
              navigate('/');
            }}
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src="/branding/mentara-logo-transparent.png"
                alt="Mentara logo"
                className="h-10 w-auto object-contain drop-shadow-sm"
                draggable="false"
              />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-white leading-tight">Mentara</div>
              <div className="text-xs text-gray-400">Learning • Exams • Results</div>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-6">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>

            {isAuthenticated ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goDashboard}
                className="btn-premium hidden sm:inline-flex items-center gap-2"
              >
                Dashboard <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/login');
                  }}
                  className="hidden sm:inline-flex px-4 py-2 text-white hover:text-purple-300 transition-colors font-semibold"
                >
                  Login
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setOpen(false);
                    navigate('/join');
                  }}
                  className="btn-premium"
                >
                  Join Now
                </motion.button>
              </>
            )}
          </div>
        </div>

        {open && (
          <div className="lg:hidden mt-4 pb-2">
            <div className="grid grid-cols-2 gap-2">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 ${
                      isActive ? 'text-white' : 'text-gray-300'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {!isAuthenticated && (
                <>
                  <NavLink
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    Create Account
                  </NavLink>
                </>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    goDashboard();
                  }}
                  className="col-span-2 px-4 py-3 rounded-xl border border-white/10 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  );
}
