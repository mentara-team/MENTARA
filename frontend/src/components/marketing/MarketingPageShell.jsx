import React from 'react';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';

export default function MarketingPageShell({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0B0F] overflow-hidden">
      <MarketingNav />
      <div className="pt-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 animated-gradient opacity-15" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A0B0F_70%)]" />
          <div className="absolute inset-0 bg-[url('/marketing/edukate/bg-image.jpg')] bg-cover bg-center opacity-[0.06]" />
          <img
            src="/marketing/edukate/overlay-top.png"
            alt=""
            aria-hidden="true"
            className="absolute top-0 left-0 w-full opacity-20 mix-blend-soft-light"
            loading="lazy"
          />
          <img
            src="/marketing/edukate/overlay-bottom.png"
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-full opacity-20 mix-blend-soft-light"
            loading="lazy"
          />
        </div>
        <div className="relative z-10">{children}</div>
      </div>
      <MarketingFooter />
    </div>
  );
}
