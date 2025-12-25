import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquare, Send, X } from 'lucide-react';

const DEFAULT_WHATSAPP_NUMBER = '919999999999';

function WhatsAppIcon({ className }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19.11 17.66c-.28-.14-1.64-.81-1.9-.9-.25-.09-.44-.14-.62.14-.19.28-.72.9-.88 1.08-.16.19-.32.21-.6.07-.28-.14-1.16-.43-2.2-1.36-.81-.72-1.36-1.61-1.52-1.88-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.19-.28.28-.46.09-.19.05-.35-.02-.5-.07-.14-.62-1.49-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.19 0-.5.07-.76.35-.26.28-1 1-1 2.44 0 1.44 1.03 2.83 1.17 3.03.14.19 2.04 3.11 4.95 4.36.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z" />
      <path d="M16 3C9.38 3 4 8.38 4 15c0 2.08.55 4.1 1.6 5.89L4 29l8.32-1.55C13.53 27.81 14.76 28 16 28c6.62 0 12-5.38 12-13S22.62 3 16 3zm0 22.72c-1.16 0-2.3-.2-3.38-.59l-.48-.17-4.94.92.93-4.8-.2-.5A10.6 10.6 0 0 1 5.28 15C5.28 9.1 10.1 4.28 16 4.28S26.72 9.1 26.72 15 21.9 25.72 16 25.72z" />
    </svg>
  );
}

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

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  const initial = useMemo(
    () => [
      {
        id: 'm1',
        from: 'bot',
        text: 'Hi! I\'m Mentara Assistant. What do you want to explore?',
      },
      {
        id: 'm2',
        from: 'bot',
        text: 'Quick options: Demo • Pricing • WhatsApp • Features',
      },
    ],
    []
  );

  const [messages, setMessages] = useState(initial);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  const reply = (userText) => {
    const lower = userText.toLowerCase();

    if (lower.includes('whatsapp') || lower.includes('what') || lower.includes('wa.me')) {
      return {
        text: 'Sure — tap “WhatsApp” below and we\'ll connect instantly.',
      };
    }

    if (lower.includes('price') || lower.includes('pricing') || lower.includes('plan')) {
      return {
        text: 'We can tailor Mentara for a freelancer demo or an institute rollout. Tell me: student count + subjects + timeline.',
      };
    }

    if (lower.includes('demo') || lower.includes('call') || lower.includes('meet')) {
      return {
        text: 'Great. Share your preferred time window and which dashboards to highlight (Admin/Teacher/Student).',
      };
    }

    if (lower.includes('feature') || lower.includes('modules') || lower.includes('dashboard')) {
      return {
        text: 'Mentara includes role dashboards, question bank, timed exams with autosave, teacher evaluation, and analytics/leaderboards.',
      };
    }

    return {
      text: 'Got it. Share a bit more (your goal + audience), and I\'ll suggest the best Mentara flow to showcase.',
    };
  };

  const send = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, from: 'user', text: trimmed },
      { id: `b-${Date.now()}-r`, from: 'bot', text: reply(trimmed).text },
    ]);
    setInput('');
  };

  const quick = (label) => {
    if (label === 'WhatsApp') {
      window.open(makeWhatsAppUrl('Hi Mentara team! I want a demo / early access.'), '_blank', 'noopener,noreferrer');
      return;
    }
    send(label);
  };

  const openWhatsApp = () => {
    window.open(makeWhatsAppUrl('Hi Mentara team! I want deals + a demo / early access.'), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[85] flex flex-col gap-3">
        <motion.button
          type="button"
          onClick={openWhatsApp}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="glass-card w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center"
          aria-label="WhatsApp us"
          title="WhatsApp"
        >
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
            <WhatsAppIcon className="w-6 h-6 text-white" />
          </span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="glass-card w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center"
          aria-label="Chat with us"
          title="Chat"
        >
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-[5.25rem] z-[95] w-[min(380px,calc(100vw-3rem))]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold leading-tight">Chat with Mentara</div>
                  <div className="text-xs text-gray-400">Fast answers • Demo help • WhatsApp</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div ref={listRef} className="max-h-[320px] overflow-auto px-4 py-3 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        m.from === 'user'
                          ? 'max-w-[85%] rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-gray-100'
                          : 'max-w-[85%] rounded-2xl px-4 py-3 bg-black/30 border border-white/10 text-gray-200'
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {['Demo', 'Pricing', 'Features', 'WhatsApp'].map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => quick(x)}
                      className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-200"
                    >
                      {x}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') send(input);
                      }}
                      className="input-mentara"
                      placeholder="Type a message..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => send(input)}
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                    aria-label="Send"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>

                <a
                  href={makeWhatsAppUrl('Hi Mentara team! I want to connect on WhatsApp.')}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                >
                  <WhatsAppIcon className="w-4 h-4" /> Connect on WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
