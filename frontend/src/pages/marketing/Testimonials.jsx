import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Quote, ShieldCheck, Star, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Testimonials() {
  const navigate = useNavigate();

  const quotes = [
    {
      name: 'Student',
      role: 'IB DP Year 2',
      text: 'The UI feels premium. Taking tests is smooth, and the review makes mistakes obvious.',
      metric: '+18% accuracy',
      photo: '/marketing/edukate/testimonial-1.jpg',
    },
    {
      name: 'Teacher',
      role: 'Evaluator',
      text: 'Grading is clean. Uploading evaluated PDFs and leaving remarks is fast and organized.',
      metric: '2× faster review',
      photo: '/marketing/fox/teacher-2.jpg',
    },
    {
      name: 'Admin',
      role: 'Coordinator',
      text: 'Creating topics, questions, and exams is straightforward — no confusion, no clutter.',
      metric: 'Cleaner operations',
      photo: '/marketing/fox/bg_3.jpg',
    },
    {
      name: 'Student',
      role: 'Top Performer',
      text: 'Leaderboards + analytics keep me motivated. It feels like a professional app.',
      metric: '7-day streak',
      photo: '/marketing/edukate/testimonial-2.jpg',
    },
    {
      name: 'Teacher',
      role: 'Mentor',
      text: 'Students actually read feedback because it’s presented so cleanly.',
      metric: 'More engagement',
      photo: '/marketing/fox/teacher-1.jpg',
    },
    {
      name: 'Admin',
      role: 'Operations',
      text: 'It’s easy to manage the system and keep everything consistent.',
      metric: 'Fewer errors',
      photo: '/marketing/fox/bg_2.jpg',
    },
  ];

  const proof = [
    {
      title: 'Premium feel, real outcomes',
      desc: 'Social proof that looks like a product case-study section — not random quotes.',
      icon: Trophy,
    },
    {
      title: 'Integrity-first trust',
      desc: 'Attempts resume reliably; the platform avoids “refresh loopholes”.',
      icon: ShieldCheck,
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
              Testimonials
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> that build trust</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-gray-400 text-lg max-w-xl"
            >
              Social proof that looks premium. Replace names and metrics later — the layout is already product-ready.
            </motion.p>
            <div className="mt-8 flex items-center gap-2 text-gray-300">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" />
              ))}
              <span className="text-sm text-gray-400">Rated 5/5 by early users</span>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {proof.map((p) => (
                <div key={p.title} className="glass-card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-white font-bold">{p.title}</div>
                      <div className="mt-2 text-sm text-gray-400">{p.desc}</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <p.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className="btn-premium" onClick={() => navigate('/join')}>
                Get Started <ArrowRight className="w-4 h-4 inline-block ml-2" />
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/contact')}>
                Book a Demo
              </button>
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 gap-3">
              <img
                src="/marketing/edukate/testimonial-1.jpg"
                alt="Learner"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
              <img
                src="/marketing/edukate/testimonial-2.jpg"
                alt="Student success"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
              <img
                src="/marketing/fox/teacher-1.jpg"
                alt="Teacher"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
              <img
                src="/marketing/fox/teacher-2.jpg"
                alt="Mentor"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
            </div>
            <div className="mt-4 text-sm text-gray-400">Real photos from Edukate/Fox templates; swap anytime.</div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((q, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2, rotateX: 2, rotateY: -2 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="premium-card"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={q.photo}
                    alt={q.role}
                    className="w-12 h-12 rounded-xl border border-white/10 object-cover"
                    loading="lazy"
                  />
                  <div>
                    <div className="text-white font-bold">{q.name}</div>
                    <div className="text-sm text-gray-400">{q.role}</div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Quote className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="mt-4 text-gray-300">“{q.text}”</div>

              <div className="mt-5 flex items-center justify-between">
                <div className="text-xs text-gray-500">Outcome</div>
                <div className="text-white font-semibold">{q.metric}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto mt-10 glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-white font-bold text-lg">Want this exact “wow” section for your client?</div>
              <div className="mt-1 text-gray-400">We can tailor copy + proof blocks to your institute and subjects.</div>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-premium" onClick={() => navigate('/contact')}>
                Contact
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/join')}>
                Join
              </button>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
