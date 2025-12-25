import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Trophy, Users, CheckCircle2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const goDashboard = () => {
    if (user?.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user?.role === 'TEACHER') navigate('/teacher/dashboard');
    else navigate('/dashboard');
  };

  const highlights = [
    { icon: Brain, title: 'Smart Practice', desc: 'Topic-wise learning with structured progress.' },
    { icon: BookOpen, title: 'Question Bank', desc: 'MCQ + structured questions with uploads.' },
    { icon: Trophy, title: 'Results & Rankings', desc: 'Instant performance insights and leaderboards.' },
    { icon: Users, title: 'Teacher Evaluation', desc: 'Marks, remarks, and evaluated PDFs in one place.' },
  ];

  const bullets = [
    'Clean role-based dashboards for Admin, Teacher, Student',
    'Timed exams with autosave and submit flow',
    'Teacher grading that updates scores and analytics',
    'Designed for a premium, modern “wow” experience',
  ];

  const featuredPacks = [
    {
      title: 'Concept Sprint Packs',
      desc: 'Short, focused practice to master one chapter.',
      img: '/marketing/edukate/courses-1.jpg',
      meta: '10–15 mins • Smart review',
    },
    {
      title: 'Mock Exam Mode',
      desc: 'Real timer + autosave for exam-day confidence.',
      img: '/marketing/fox/bg_2.jpg',
      meta: 'Timed • Auto-submit',
    },
    {
      title: 'Teacher Evaluation',
      desc: 'Uploads, remarks, and marking in one flow.',
      img: '/marketing/edukate/feature.jpg',
      meta: 'PDF uploads • Rubrics',
    },
  ];

  return (
    <MarketingPageShell>
      <section className="relative px-6 py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full"
            >
              <span className="text-sm font-semibold text-purple-300">Future-ready learning platform</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-6 text-5xl md:text-6xl font-bold text-white leading-tight"
            >
              Mentara makes
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> exams feel effortless</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg text-gray-400 max-w-xl"
            >
              A professional-grade experience for students, teachers, and admins —
              built to look premium and work perfectly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              {isAuthenticated ? (
                <button type="button" onClick={goDashboard} className="btn-premium inline-flex items-center justify-center gap-2">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/join')} className="btn-premium inline-flex items-center justify-center gap-2">
                    Join Now <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10"
                  >
                    Login
                  </button>
                </>
              )}
            </motion.div>

            <div className="mt-10 grid gap-3">
              {bullets.map((b) => (
                <div key={b} className="flex items-start gap-3 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-300 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '3 Dashboards', value: 'Admin • Teacher • Student' },
                { label: 'Autosave', value: 'Refresh-safe exams' },
                { label: 'Question Bank', value: 'MCQ + Structured' },
                { label: 'Analytics', value: 'Instant insights' },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4">
                  <div className="text-xs text-gray-400">{s.label}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="glass-card p-6 border border-white/10">
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute -top-4 left-6"
              >
                <div className="relative overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/25 via-pink-500/20 to-blue-500/25" />
                  <motion.div
                    className="absolute -inset-y-2 -left-24 w-24 bg-white/20 blur-md"
                    animate={{ x: [0, 520] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative text-xs font-semibold text-white">Launching Soon • Early Access Open</div>
                </div>
              </motion.div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Product Tour</div>
                  <div className="text-sm text-gray-400 mt-1">Premium UI + real exam workflows, end-to-end.</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="mt-5 relative rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />
                <div className="relative aspect-video w-full">
                  <motion.div
                    className="absolute inset-0"
                    style={{ perspective: 1200 }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      whileHover={{ rotateX: 3, rotateY: -4, y: -6 }}
                      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                      className="absolute left-6 top-6 right-14 bottom-10 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <img
                        src="/marketing/edukate/header.jpg"
                        alt="Mentara hero"
                        className="w-full h-full object-cover opacity-95"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F] via-transparent to-transparent opacity-70" />
                    </motion.div>

                    <motion.div
                      whileHover={{ rotateX: 2, rotateY: 6, y: -4 }}
                      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                      className="absolute right-6 top-10 w-44 sm:w-52 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-black/30"
                      style={{ transform: 'translateZ(24px)', transformStyle: 'preserve-3d' }}
                    >
                      <img
                        src="/marketing/fox/bg_1.jpg"
                        alt="Learning dashboard preview"
                        className="w-full h-full object-cover opacity-90"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F] via-transparent to-transparent opacity-65" />
                    </motion.div>

                    <motion.div
                      whileHover={{ rotateX: -2, rotateY: -6, y: -3 }}
                      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                      className="absolute left-10 bottom-6 w-48 sm:w-56 aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-black/30"
                      style={{ transform: 'translateZ(18px)', transformStyle: 'preserve-3d' }}
                    >
                      <img
                        src="/marketing/edukate/courses-3.jpg"
                        alt="Practice preview"
                        className="w-full h-full object-cover opacity-90"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F] via-transparent to-transparent opacity-65" />
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {highlights.map((h) => (
                <div key={h.title} className="premium-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <h.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{h.title}</div>
                      <div className="text-sm text-gray-400">{h.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Built for every role</h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">A single platform, three premium experiences — each one clean, fast, and easy.</p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <div className="glass-card p-7">
              <div className="text-white font-bold text-xl">Student</div>
              <p className="mt-2 text-gray-400">Take exams, track results, and improve with confidence.</p>
              <div className="mt-6 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Timed tests</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Autosave</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Instant results</span>
              </div>
            </div>
            <div className="glass-card p-7">
              <div className="text-white font-bold text-xl">Teacher</div>
              <p className="mt-2 text-gray-400">Grade responses, upload evaluated PDFs, add remarks.</p>
              <div className="mt-6 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Marking</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Remarks</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Uploads</span>
              </div>
            </div>
            <div className="glass-card p-7">
              <div className="text-white font-bold text-xl">Admin</div>
              <p className="mt-2 text-gray-400">Create topics, questions, exams, manage everything cleanly.</p>
              <div className="mt-6 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">CRUD</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Question bank</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Featured learning packs</h2>
              <p className="mt-3 text-gray-400 max-w-2xl">
                Borrowed from modern edtech patterns: visually rich cards, clear value, and smooth interactions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10"
            >
              Explore all
            </button>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {featuredPacks.map((p) => (
              <motion.div
                key={p.title}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="premium-card overflow-hidden"
              >
                <div className="relative h-44 rounded-2xl overflow-hidden border border-white/10">
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover opacity-90" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F] via-transparent to-transparent opacity-80" />
                </div>
                <div className="mt-5">
                  <div className="text-white font-bold text-lg">{p.title}</div>
                  <div className="mt-2 text-gray-400">{p.desc}</div>
                  <div className="mt-4 text-xs text-gray-300 px-3 py-2 rounded-xl bg-white/5 border border-white/10 inline-flex">
                    {p.meta}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
