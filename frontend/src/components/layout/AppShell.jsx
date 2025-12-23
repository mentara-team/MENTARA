import React from 'react';
import { Link } from 'react-router-dom';

const AppShell = ({
  brandHref = '/',
  brandIcon,
  brandTitle = 'Mentara',
  brandSubtitle,
  nav,
  right,
  children,
  headerClassName = '',
  mainClassName = '',
}) => {
  return (
    <div className="min-h-screen bg-bg">
      <header className={`glass border-b border-elevated/50 sticky top-0 z-40 backdrop-blur-xl ${headerClassName}`.trim()}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={brandHref} className="flex items-center gap-3">
            {brandIcon}
            <div>
              <div className="text-xl font-bold text-gradient">{brandTitle}</div>
              {brandSubtitle ? <div className="text-sm text-text-secondary">{brandSubtitle}</div> : null}
            </div>
          </Link>

          {nav ? nav : null}

          {right ? <div className="flex items-center gap-3">{right}</div> : <div />}
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-6 py-8 ${mainClassName}`.trim()}>
        {children}
      </main>
    </div>
  );
};

export default AppShell;
