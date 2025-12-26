import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Instagram, Linkedin, Mail, Phone, Youtube } from 'lucide-react';

const WHATSAPP_NUMBER = (import.meta?.env?.VITE_WHATSAPP_NUMBER || '919999999999').replace(/\D/g, '');
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi Mentara team! I want a demo / early access.')}`;

const SOCIAL = {
  instagram: (import.meta?.env?.VITE_SOCIAL_INSTAGRAM || 'https://instagram.com').trim(),
  linkedin: (import.meta?.env?.VITE_SOCIAL_LINKEDIN || 'https://linkedin.com').trim(),
  youtube: (import.meta?.env?.VITE_SOCIAL_YOUTUBE || 'https://youtube.com').trim(),
  github: (import.meta?.env?.VITE_SOCIAL_GITHUB || 'https://github.com').trim(),
};

export default function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src="/branding/mentara-logo-transparent.png"
                  alt="Mentara logo"
                  className="h-10 w-auto object-contain drop-shadow-sm"
                  draggable="false"
                />
              </div>
              <div className="text-xl font-bold text-white">Mentara</div>
            </div>
            <p className="text-gray-400 mt-3 max-w-xl">
              A premium exam practice platform for students, teachers, and admins —
              designed to feel effortless and look world-class.
            </p>

            <div className="mt-6 grid gap-2 text-sm">
              <a className="text-gray-300 hover:text-white inline-flex items-center gap-2" href="mailto:support@mentara.com">
                <Mail className="w-4 h-4" /> support@mentara.com
              </a>
              <a className="text-gray-300 hover:text-white inline-flex items-center gap-2" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                <Phone className="w-4 h-4" /> WhatsApp: +{WHATSAPP_NUMBER}
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a
                href={SOCIAL.linkedin}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <Linkedin className="w-5 h-5 text-white" />
              </a>
              <a
                href={SOCIAL.youtube}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                aria-label="YouTube"
                title="YouTube"
              >
                <Youtube className="w-5 h-5 text-white" />
              </a>
              <a
                href={SOCIAL.github}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                aria-label="GitHub"
                title="GitHub"
              >
                <Github className="w-5 h-5 text-white" />
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-6">© {new Date().getFullYear()} Mentara™. All rights reserved.</p>
          </div>

          <div>
            <div className="text-sm font-semibold text-white">Pages</div>
            <div className="mt-4 grid gap-2 text-sm">
              <Link className="text-gray-400 hover:text-white" to="/about">About</Link>
              <Link className="text-gray-400 hover:text-white" to="/courses">Courses</Link>
              <Link className="text-gray-400 hover:text-white" to="/results">Result</Link>
              <Link className="text-gray-400 hover:text-white" to="/team">Team</Link>
              <Link className="text-gray-400 hover:text-white" to="/testimonials">Testimonials</Link>
              <Link className="text-gray-400 hover:text-white" to="/contact">Contact</Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white">Product</div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="text-gray-400">3 role dashboards</div>
              <div className="text-gray-400">Timed exams + autosave</div>
              <div className="text-gray-400">Teacher evaluation</div>
              <div className="text-gray-400">Analytics + leaderboards</div>

              <div className="mt-4 text-sm font-semibold text-white">Get Started</div>
              <Link className="text-gray-400 hover:text-white" to="/join">Join Now</Link>
              <Link className="text-gray-400 hover:text-white" to="/login">Login</Link>
              <Link className="text-gray-400 hover:text-white" to="/signup">Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
