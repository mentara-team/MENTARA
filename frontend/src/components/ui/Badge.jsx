import React from 'react';

const tones = {
  neutral: 'bg-surface/60 border-elevated/50 text-text-secondary',
  primary: 'bg-primary/10 border-primary/30 text-primary',
  accent: 'bg-accent/10 border-accent/30 text-accent',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  danger: 'bg-danger/10 border-danger/30 text-danger',
};

export default function Badge({ children, tone = 'neutral', className = '' }) {
  const toneClass = tones[tone] || tones.neutral;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${toneClass} ${className}`.trim()}>
      {children}
    </span>
  );
}
