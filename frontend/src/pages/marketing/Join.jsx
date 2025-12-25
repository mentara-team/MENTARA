import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ClipboardList, GraduationCap, Rocket, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Join() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Student',
      icon: GraduationCap,
      desc: 'Practice, take exams, view results, and improve fast.',
      cta: 'Create Student Account',
      onClick: () => navigate('/signup'),
    },
    {
      title: 'Teacher',
      icon: Users,
      desc: 'Grade attempts, upload evaluated PDFs, and guide students.',
      cta: 'Login as Teacher',
      onClick: () => navigate('/login'),
    },
    {
      title: 'Admin',
      icon: ShieldCheck,
      desc: 'Manage topics, questions, exams, users, and everything else.',
      cta: 'Login as Admin',
      onClick: () => navigate('/login'),
    },
  ];

  const steps = [
    {
      title: 'Choose your role',
      desc: 'Student, Teacher, or Admin — the UI adapts automatically.',
      icon: Users,
    },
    {
      title: 'Start with a guided flow',
      desc: 'Clean onboarding: topics → practice → exams → analytics.',
      icon: ClipboardList,
    },
    {
      title: 'Level up with gamified progress',
      desc: 'Streaks, mastery and leaderboards—kept premium, not childish.',
      icon: Sparkles,
    },
  ];

  const benefits = [
    {
      title: 'Exam integrity by design',
      desc: 'Attempts resume properly. Timers don’t “reset” on refresh.',
      icon: ShieldCheck,
    },
    {
      title: 'Premium speed & clarity',
      desc: 'A “fintech-clean” UI that feels fast, smooth, and reliable.',
      icon: Rocket,
    },
    {
      title: 'Built for real workflows',
      desc: 'Teacher evaluation and admin control stay organized end-to-end.',
      icon: GraduationCap,
    },
  ];

  return (
    <MarketingPageShell>
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Join Now
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> and enter the future</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-gray-400 text-lg max-w-xl"
            >
              Pick your role and jump in. Mentara is designed to look like a product your client instantly trusts.
            </motion.p>

            <div className="mt-8 glass-card p-6">
              <div className="grid grid-cols-2 gap-3">
                <img
                  src="/marketing/edukate/header.jpg"
                  alt="Mentara onboarding"
                  className="h-48 w-full rounded-2xl border border-white/10 object-cover"
                  loading="lazy"
                />
                <img
                  src="/marketing/fox/bg_1.jpg"
                  alt="Mentara classroom"
                  className="h-48 w-full rounded-2xl border border-white/10 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                A modern edtech product experience: dark premium UI + real content + smooth motion.
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {steps.map((s) => (
                <div key={s.title} className="premium-card">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <s.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{s.title}</div>
                      <div className="mt-1 text-gray-400">{s.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            {cards.map((c) => (
              <motion.div
                key={c.title}
                whileHover={{ y: -2, rotateX: 2, rotateY: -2 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="premium-card"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <c.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-xl">{c.title}</div>
                    <div className="mt-2 text-gray-400">{c.desc}</div>
                    <button
                      type="button"
                      onClick={c.onClick}
                      className="mt-5 btn-premium inline-flex items-center gap-2"
                    >
                      {c.cta} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="glass-card p-6">
              <div className="text-white font-bold text-lg">What you get</div>
              <div className="mt-1 text-sm text-gray-400">A complete product feel — not just a template UI.</div>
              <div className="mt-5 grid gap-4">
                {benefits.map((b) => (
                  <div key={b.title} className="premium-card">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <b.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{b.title}</div>
                        <div className="mt-1 text-gray-400">{b.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/contact')}
                  className="btn-premium"
                >
                  Book a Demo
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/courses')}
                  className="btn-secondary"
                >
                  Explore Packs
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
