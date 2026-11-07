import React from 'react';
import { Language } from '../types/blood';

interface HeaderProps {
  lang: Language;
  onEmergencyClick: () => void;
}

/**
 * Follows the strict 3-zone Top Bar Contract:
 * Zone 1: Single text element wordmark ("রক্তবন্ধন · RoktoBondhon")
 * Zone 2: 5 concise single-line navigation links
 * Zone 3: 1 primary action button ("জরুরি রক্তের অনুরোধ" / "Request Emergency Blood")
 */
export const Header: React.FC<HeaderProps> = ({ lang, onEmergencyClick }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4 lg:gap-8 px-3 sm:px-6 lg:px-8 py-3">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="rb-card-heading font-bold text-[#B71C1C] hover:text-[#E53935] transition-colors whitespace-nowrap shrink-0"
        >
          {lang === 'bn' ? (
            <>
              রক্তবন্ধন
              <span className="hidden min-[400px]:inline"> · RoktoBondhon</span>
            </>
          ) : (
            <>
              RoktoBondhon
              <span className="hidden min-[400px]:inline"> · রক্তবন্ধন</span>
            </>
          )}
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label={lang === 'bn' ? 'প্রধান নেভিগেশন মেনু' : 'Primary Navigation'}
          className="hidden md:flex items-center gap-4 lg:gap-7 rb-support-text font-semibold text-[#1E293B]"
        >
          <a
            href="#find-donor"
            className="py-1 text-[#1E293B] hover:text-[#E53935] hover:underline underline-offset-4 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'bn' ? 'রক্তদাতা খুঁজুন' : 'Find Donor'}
          </a>
          <a
            href="#emergency-request"
            className="py-1 text-[#1E293B] hover:text-[#E53935] hover:underline underline-offset-4 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'bn' ? 'জরুরি রক্তের অনুরোধ' : 'Emergency Blood'}
          </a>
          <a
            href="#become-donor"
            className="py-1 text-[#1E293B] hover:text-[#E53935] hover:underline underline-offset-4 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'bn' ? 'রক্তদাতা হোন' : 'Become a Donor'}
          </a>
          <a
            href="#blood-groups"
            className="py-1 text-[#1E293B] hover:text-[#E53935] hover:underline underline-offset-4 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'bn' ? 'রক্তের গ্রুপ' : 'Blood Groups'}
          </a>
          <a
            href="#campaigns"
            className="py-1 text-[#1E293B] hover:text-[#E53935] hover:underline underline-offset-4 decoration-2 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'bn' ? 'রক্তদান কর্মসূচি' : 'Campaigns'}
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEmergencyClick}
            className="rb-btn-transition rb-btn-text px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-white bg-[#E53935] hover:bg-[#B71C1C] rounded-xl shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            {lang === 'bn' ? 'জরুরি রক্তের অনুরোধ' : 'Request Emergency Blood'}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar (visible below 768px so mobile users can reach all 5 sections easily) */}
      <nav
        aria-label={lang === 'bn' ? 'মোবাইল নেভিগেশন মেনু' : 'Mobile Navigation'}
        className="md:hidden border-t border-slate-100 bg-[#F8FAFC]/95 px-3 py-2 flex flex-wrap items-center justify-center sm:justify-between gap-x-2 gap-y-1 rb-label-text font-semibold text-[#1E293B]"
      >
        <a
          href="#find-donor"
          className="text-[#1E293B] hover:text-[#E53935] whitespace-nowrap py-0.5 px-1"
        >
          {lang === 'bn' ? 'রক্তদাতা খুঁজুন' : 'Find Donor'}
        </a>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <a
          href="#emergency-request"
          className="text-[#1E293B] hover:text-[#E53935] whitespace-nowrap py-0.5 px-1"
        >
          {lang === 'bn' ? 'জরুরি অনুরোধ' : 'Emergency'}
        </a>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <a
          href="#become-donor"
          className="text-[#1E293B] hover:text-[#E53935] whitespace-nowrap py-0.5 px-1"
        >
          {lang === 'bn' ? 'রক্তদাতা হোন' : 'Become Donor'}
        </a>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <a
          href="#blood-groups"
          className="text-[#1E293B] hover:text-[#E53935] whitespace-nowrap py-0.5 px-1"
        >
          {lang === 'bn' ? 'রক্তের গ্রুপ' : 'Groups'}
        </a>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <a
          href="#campaigns"
          className="text-[#1E293B] hover:text-[#E53935] whitespace-nowrap py-0.5 px-1"
        >
          {lang === 'bn' ? 'কর্মসূচি' : 'Campaigns'}
        </a>
      </nav>
    </header>
  );
};
