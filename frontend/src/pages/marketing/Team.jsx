import React from 'react';
import { motion } from 'framer-motion';
import { Code2, GraduationCap, PenTool, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Team() {
  const members = [
    {
      name: 'DJ Brothers',
      role: 'Founders & Builders',
      icon: Rocket,
      bio: 'Product vision, delivery, and quality — end to end.',
      photo: '/marketing/edukate/team-1.jpg',
    },
    {
      name: 'Engineering',
      role: 'Platform & Automation',
      icon: Code2,
      bio: 'Backend + frontend flows that stay reliable and fast.',
      photo: '/marketing/edukate/team-2.jpg',
    },
    {
      name: 'Content',
      role: 'Curriculum & Evaluation',
      icon: PenTool,
      bio: 'High-quality questions, grading standards, and guidance.',
      photo: '/marketing/edukate/team-3.jpg',
    },
  ];

  const values = [
    {
      title: 'Built for real schools',
      desc: 'Student practice, teacher evaluation, and admin control — all in one flow.',
      icon: GraduationCap,
    },
    {
      title: 'Integrity-first exams',
      desc: 'Attempts resume correctly and timing is preserved to prevent loopholes.',
      icon: ShieldCheck,
    },
    {
      title: 'Premium UX, not clutter',
      desc: 'Dark, glassy, fast — designed like modern SaaS that clients love.',
      icon: Sparkles,
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
              Our Team
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> — built to ship</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-gray-400 text-lg max-w-xl"
            >
              A small, focused team with one goal: a premium education product that clients instantly trust.
            </motion.p>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {values.map((v) => (
                <div key={v.title} className="glass-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-white font-bold">{v.title}</div>
                      <div className="mt-2 text-sm text-gray-400">{v.desc}</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <v.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 gap-3">
              <img
                src="/marketing/edukate/team-4.jpg"
                alt="Mentara team"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
              <img
                src="/marketing/fox/teacher-1.jpg"
                alt="Mentara educator"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
              <img
                src="/marketing/fox/teacher-2.jpg"
                alt="Mentara mentor"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
              <img
                src="/marketing/fox/teacher-3.jpg"
                alt="Mentara teaching"
                className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                loading="lazy"
              />
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Built with a product mindset: stable APIs, clean UX, and content quality.
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {members.map((m) => (
              <motion.div
                key={m.name}
                whileHover={{ y: -2, rotateX: 2, rotateY: -2 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="premium-card overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="relative">
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="h-44 w-full object-cover rounded-2xl border border-white/10"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="glass-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <m.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-bold">{m.name}</div>
                          <div className="text-sm text-gray-400">{m.role}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-gray-400">{m.bio}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 glass-card p-6">
            <div className="text-white font-bold text-lg">Why clients trust Mentara</div>
            <div className="mt-2 text-gray-400">
              A premium look is not enough — the product must feel stable, consistent, and ready to deploy.
            </div>
            <div className="mt-5 grid md:grid-cols-3 gap-4">
              {[
                { t: 'Consistent UI system', d: 'Same premium components across marketing + dashboards.' },
                { t: 'Reliable workflows', d: 'Admin → teacher → student experiences stay connected.' },
                { t: 'Performance mindset', d: 'Fast navigation, clean states, and practical analytics.' },
              ].map((x) => (
                <div key={x.t} className="premium-card">
                  <div className="text-white font-semibold">{x.t}</div>
                  <div className="mt-2 text-gray-400">{x.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
