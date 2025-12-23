import React from 'react';
import { Link } from 'react-router-dom';

export default function TeacherNav({ active = 'dashboard' }) {
  const item = (key, href, label) => {
    const isActive = active === key;
    return (
      <Link
        to={href}
        className={
          isActive
            ? 'px-4 py-2 rounded-xl text-sm font-semibold bg-elevated text-text'
            : 'px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:text-text hover:bg-surface transition-colors'
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="hidden md:flex items-center gap-2 bg-surface/40 border border-elevated/50 rounded-2xl p-1">
      {item('dashboard', '/teacher/dashboard', 'Dashboard')}
      {item('exams', '/teacher/exams', 'Exams')}
    </nav>
  );
}
