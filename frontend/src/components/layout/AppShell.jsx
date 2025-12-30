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
  containerClassName = 'max-w-7xl',
}) => {
  const logoSrc = '/branding/mentara-logo-transparent.png';
  const resolvedBrandIcon = brandIcon ?? (
    <div className="w-11 h-11 flex items-center justify-center">
      <img
        src={logoSrc}
        alt="Mentara logo"
        className="h-9 w-auto object-contain drop-shadow-sm"
        draggable="false"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className={`glass border-b border-elevated/50 sticky top-0 z-40 backdrop-blur-xl ${headerClassName}`.trim()}>
        <div
          className={`${containerClassName} mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.trim()}
        >
          <Link to={brandHref} className="flex items-center gap-3 w-full sm:w-auto">
            {resolvedBrandIcon}
            <div>
              <div className="text-xl font-bold text-gradient">{brandTitle}</div>
              {brandSubtitle ? <div className="text-sm text-text-secondary">{brandSubtitle}</div> : null}
            </div>
          </Link>

          {nav ? nav : null}

          {right ? <div className="flex items-center gap-3 w-full sm:w-auto justify-end">{right}</div> : <div />}
        </div>
      </header>

      <main className={`${containerClassName} mx-auto px-4 sm:px-6 py-8 ${mainClassName}`.trim()}>
        {children}
      </main>

      <footer className={`${containerClassName} mx-auto px-4 sm:px-6 pb-10 text-xs text-text-secondary`.trim()}>
        © {new Date().getFullYear()} Mentara™. All rights reserved.
      </footer>
    </div>
  );
};

export default AppShell;
