import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'mentara_launch_banner_dismissed_v1';

export default function LaunchBanner() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const dismissed = useMemo(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!dismissed) setOpen(true);
  }, [dismissed]);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.22 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[min(920px,calc(100vw-2rem))]"
        >
          <div className="glass-card px-4 py-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold leading-tight">Launching soon</div>
                <div className="text-sm text-gray-400 truncate">
                  Want Mentara for your institute or a client demo? Join the early access list.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/join')}
                  className="btn-premium inline-flex items-center gap-2"
                >
                  Early access <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
