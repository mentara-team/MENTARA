import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopOnRouteChange() {
  const location = useLocation();

  useEffect(() => {
    // Ensure each navigation starts at the top.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

export function BackToTopButton({ threshold = 420 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = null;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        setVisible(window.scrollY > threshold);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          aria-label="Scroll to top"
          title="Back to top"
          onClick={scrollToTop}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-6 right-6 z-50"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <span
            className="glass-card w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10"
          >
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <ArrowUp className="w-5 h-5 text-white" />
            </span>
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
