import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Crown, Radar, Sparkles } from 'lucide-react';
import MarketingPageShell from '../../components/marketing/MarketingPageShell';

export default function Results() {
  const stats = [
    { label: 'Accuracy', value: '92%', icon: Radar },
    { label: 'Speed', value: '1.4x', icon: Sparkles },
    { label: 'Rank', value: '#12', icon: Crown },
    { label: 'Insights', value: 'Real-time', icon: BarChart3 },
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
              Result & Analytics
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> that feel instant</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-gray-400 text-lg max-w-xl"
            >
              Show your client a platform that looks like modern fintech — but for education.
              Clean cards, clear insights, and fast performance.
            </motion.p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="glass-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-sm">{s.label}</div>
                      <div className="text-white font-bold text-2xl mt-1">{s.value}</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <s.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <img
              src="/marketing/edukate/feature.jpg"
              alt="Mentara analytics preview"
              className="w-full rounded-2xl border border-white/10 object-cover"
              loading="lazy"
            />
            <div className="mt-5 grid gap-3">
              <div className="premium-card">
                <div className="text-white font-semibold">Topic-wise performance</div>
                <div className="mt-3 grid gap-2">
                  <Bar label="Mechanics" value={78} />
                  <Bar label="Waves" value={64} />
                  <Bar label="Electricity" value={88} />
                </div>
              </div>
              <div className="premium-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Achievement snapshot</div>
                    <div className="mt-1 text-sm text-gray-400">Streaks, mastery, and rank—gamified but clean.</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { k: 'Streak', v: '7 days' },
                    { k: 'Mastery', v: 'Level 4' },
                    { k: 'Rank', v: '#12' },
                  ].map((x) => (
                    <div key={x.k} className="glass-card p-4">
                      <div className="text-xs text-gray-400">{x.k}</div>
                      <div className="mt-1 text-white font-bold">{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="premium-card">
                <div className="text-white font-semibold">Leaderboard momentum</div>
                <div className="mt-3 grid grid-cols-5 gap-2 items-end">
                  {[30, 42, 50, 68, 82].map((v, i) => (
                    <div key={i} className="rounded-xl bg-gradient-to-t from-purple-500 to-pink-500" style={{ height: `${v}px` }} />
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">Weekly improvement trend (demo)</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function Bar({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 progress-bar">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
