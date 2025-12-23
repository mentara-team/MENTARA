import React from 'react';

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  icon,
}) {
  return (
    <div className="card-elevated text-center">
      {icon ? (
        <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-surface flex items-center justify-center border border-elevated/50">
          {icon}
        </div>
      ) : null}
      <div className="text-lg font-bold text-text">{title}</div>
      {description ? <div className="mt-1 text-sm text-text-secondary">{description}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
