import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'mentara_launch_popup_dismissed_session_v4';
const DEFAULT_WHATSAPP_NUMBER = '919999999999';

function getWhatsappNumber() {
  const fromEnv = (import.meta?.env?.VITE_WHATSAPP_NUMBER || '').trim();
  const digits = (fromEnv || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
  return digits || DEFAULT_WHATSAPP_NUMBER;
}

function makeWhatsAppUrl(message) {
  const n = getWhatsappNumber();
  const text = encodeURIComponent(message);
  return `https://wa.me/${n}?text=${text}`;
}

export default function LaunchBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const dismissed = useMemo(() => {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Show only when landing on the homepage.
    if (location.pathname !== '/') return;
    if (dismissed) return;

    const t = window.setTimeout(() => setOpen(true), 180);
    return () => window.clearTimeout(t);
  }, [dismissed, location.pathname]);

  const close = () => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close popup"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-4xl"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="glass-card border border-white/10 overflow-hidden max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/15" />
                <div className="relative px-5 sm:px-6 py-5 flex items-start gap-4 overflow-y-auto">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-200">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
                      Early‑Bird Offer • Limited slots
                    </div>
                    <div className="mt-2 text-white font-bold text-xl sm:text-2xl">Launch Offer • Early Access</div>
                    <div className="mt-1 text-gray-300 text-sm sm:text-base">
                      Try Mentara early: a premium demo experience built for institutes and freelancers — fast setup, paper-ready workflow, and clean dashboards.
                    </div>

                    <div className="mt-4 grid sm:grid-cols-3 gap-3">
                      {[
                        { k: 'Bonus', v: 'Free setup call' },
                        { k: 'Deal', v: 'Pilot-friendly pricing' },
                        { k: 'Delivery', v: 'Fast rollout support' },
                      ].map((x) => (
                        <div key={x.k} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <div className="text-xs text-gray-400">{x.k}</div>
                          <div className="mt-1 text-white font-semibold">{x.v}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          navigate('/join');
                        }}
                        className="btn-premium inline-flex items-center gap-2"
                      >
                        Claim Early Access <ArrowRight className="w-4 h-4" />
                      </button>
                      <a
                        href={makeWhatsAppUrl('Hi Mentara team! I saw the launch offer popup. I want deals + a demo / early access.')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary inline-flex items-center gap-2"
                        onClick={close}
                      >
                        WhatsApp Us <Phone className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={close}
                        className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10"
                      >
                        Not now
                      </button>
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                      You can close this popup anytime. It won’t show again after dismissal.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={close}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                    aria-label="Dismiss"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
