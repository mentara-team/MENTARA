import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquare, Phone, Send, X } from 'lucide-react';

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

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="glass-card w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center"
          aria-label="Chat with us"
          title="Chat with us"
        >
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
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
            className="fixed bottom-6 left-6 z-[70] w-[min(380px,calc(100vw-3rem))]"
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
                  <Phone className="w-4 h-4" /> Connect on WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
