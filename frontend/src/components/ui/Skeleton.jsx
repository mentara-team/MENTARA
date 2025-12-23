import React from 'react';

export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-shimmer rounded-xl bg-surface/60 border border-elevated/50 ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
