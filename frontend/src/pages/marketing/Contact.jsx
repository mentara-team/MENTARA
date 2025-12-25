import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const faqs = useMemo(
    () => [
      {
        q: 'Can you demo Mentara for a client presentation?',
        a: 'Yes. We can run a guided walkthrough focused on your target audience (student/teacher/admin) with feature highlights.',
      },
      {
        q: 'Is it safe against refresh/restart during exams?',
        a: 'Yes. Attempts resume correctly and timing is preserved to protect exam integrity.',
      },
      {
        q: 'Can you customize branding for an institute?',
        a: 'Yes. We can adapt copy, colors, and landing assets while keeping the premium product UI intact.',
      },
    ],
    []
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      // Static marketing form: keep it client-side for now.
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Thanks! We will contact you soon.');
      setForm({ name: '', email: '', message: '' });
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketingPageShell>
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Contact
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> Mentara</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-gray-400 text-lg max-w-xl"
            >
              Want a demo or a pilot rollout? Send a message — we’ll respond quickly.
            </motion.p>

            <div className="mt-8 grid gap-4">
              <InfoRow icon={Mail} title="Email" value="support@mentara.com" />
              <InfoRow icon={Phone} title="Phone" value="+91 00000 00000" />
              <InfoRow icon={MapPin} title="Location" value="India" />
            </div>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Response time</div>
                    <div className="mt-1 text-white font-bold">&lt; 24 hours</div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-400">Fast replies for pilots, demos, and rollout questions.</div>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Book a demo</div>
                    <div className="mt-1 text-white font-bold">15–30 min</div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-400">We’ll show the exact dashboards your client cares about.</div>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Integrity</div>
                    <div className="mt-1 text-white font-bold">Exam-safe</div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-400">Attempts resume reliably without timer resets.</div>
              </div>
            </div>

            <div className="mt-6 glass-card p-6">
              <div className="grid grid-cols-2 gap-3">
                <img
                  src="/marketing/edukate/page-header.jpg"
                  alt="Mentara support"
                  className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                  loading="lazy"
                />
                <img
                  src="/marketing/fox/bg_2.jpg"
                  alt="Mentara demo"
                  className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Prefer WhatsApp/Meet? Mention it in your message and we’ll coordinate.
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <div className="text-white font-bold text-xl">Send us a message</div>
            <div className="text-sm text-gray-400 mt-2">We’ll reply with next steps and a demo plan.</div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <div>
                <label className="text-sm text-gray-300">Name</label>
                <input
                  className="input-mentara mt-2"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  required
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Email</label>
                <input
                  type="email"
                  className="input-mentara mt-2"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Message</label>
                <textarea
                  className="input-mentara mt-2 min-h-[140px]"
                  value={form.message}
                  onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                  required
                  placeholder="Tell us what you want to showcase to your client..."
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="btn-premium inline-flex items-center justify-center gap-2"
              >
                {sending ? 'Sending...' : 'Send Message'} <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-8">
              <div className="text-white font-bold">Quick FAQ</div>
              <div className="mt-3 grid gap-3">
                {faqs.map((f) => (
                  <div key={f.q} className="premium-card">
                    <div className="text-white font-semibold">{f.q}</div>
                    <div className="mt-2 text-gray-400">{f.a}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                This form is static right now (client-side). If you want, I can wire it to a backend endpoint or a hosted form later.
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function InfoRow({ icon: Icon, title, value }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-sm text-gray-400">{title}</div>
          <div className="text-white font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
