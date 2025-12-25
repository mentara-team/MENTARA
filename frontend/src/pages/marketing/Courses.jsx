import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Layers, NotebookPen, Timer, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Courses() {
  const navigate = useNavigate();

  const cards = [
    {
      icon: Layers,
      title: 'Topic Packs',
      desc: 'Focused sets to master one concept at a time.',
      tags: ['Practice', 'Confidence', 'Progress'],
      img: '/marketing/edukate/courses-2.jpg',
    },
    {
      icon: Timer,
      title: 'Mock Exams',
      desc: 'Timed tests that simulate real exam pressure.',
      tags: ['Timed', 'Auto-submit', 'Review'],
      img: '/marketing/fox/bg_3.jpg',
    },
    {
      icon: NotebookPen,
      title: 'Structured Answers',
      desc: 'Upload answers, get teacher evaluation and remarks.',
      tags: ['Uploads', 'Teacher grading', 'PDF'],
      img: '/marketing/edukate/feature.jpg',
    },
    {
      icon: BookOpen,
      title: 'Question Bank',
      desc: 'MCQ and structured questions in a clean library.',
      tags: ['Library', 'Searchable', 'Organized'],
      img: '/marketing/edukate/courses-5.jpg',
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
              Courses & Practice
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> built for results</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-gray-400 text-lg max-w-xl"
            >
              Present your product as a premium learning suite: topic practice, mocks,
              teacher evaluation, and a polished question library.
            </motion.p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
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
            </div>
          </div>

          <div className="glass-card p-6">
            <img
              src="/marketing/edukate/courses-6.jpg"
              alt="Mentara course library"
              className="w-full rounded-2xl border border-white/10 object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">What you can offer</h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">Use these as course “tiles” to impress clients and students instantly.</p>
          </div>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((c) => (
              <motion.div
                key={c.title}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="premium-card overflow-hidden"
              >
                <div className="relative h-36 rounded-2xl overflow-hidden border border-white/10">
                  <img src={c.img} alt={c.title} className="w-full h-full object-cover opacity-90" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F] via-transparent to-transparent opacity-80" />
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border border-white/10">
                    <c.icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-white font-bold text-lg">{c.title}</div>
                  <div className="mt-2 text-gray-400">{c.desc}</div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                        {t}
                      </span>
                    ))}
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
