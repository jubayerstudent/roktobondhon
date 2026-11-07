import React from 'react';
import {
  Language,
  BloodGroup,
  BargunaUpazilaId,
} from '../types/blood';
import { BARGUNA_UPAZILAS } from '../data/bargunaData';
import { ALL_BLOOD_GROUPS, BLOOD_COMPATIBILITY_MAP, toBnDigits } from '../utils/bloodLogic';
import { OfficialLogoDisplay, BloodDropSymbol } from './BrandLogo';
import {
  Search,
  HeartHandshake,
  ShieldCheck,
  Globe,
  Compass,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface HeroSectionProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  selectedBloodGroup: BloodGroup | 'ALL';
  selectedUpazila: BargunaUpazilaId | 'ALL';
  onQuickSearch: (group: BloodGroup | 'ALL', upazila: BargunaUpazilaId | 'ALL') => void;
  onOpenAiChat: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  lang,
  onToggleLang,
  selectedBloodGroup,
  selectedUpazila,
  onQuickSearch,
  onOpenAiChat,
}) => {
  const [heroGroup, setHeroGroup] = React.useState<BloodGroup | 'ALL'>(
    selectedBloodGroup
  );
  const [heroUpazila, setHeroUpazila] = React.useState<BargunaUpazilaId | 'ALL'>(
    selectedUpazila
  );

  React.useEffect(() => {
    setHeroGroup(selectedBloodGroup);
  }, [selectedBloodGroup]);

  React.useEffect(() => {
    setHeroUpazila(selectedUpazila);
  }, [selectedUpazila]);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickSearch(heroGroup, heroUpazila);
    const el = document.getElementById('find-donor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeCompatibility =
    heroGroup !== 'ALL' ? BLOOD_COMPATIBILITY_MAP[heroGroup] : null;

  return (
    <section
      id="top"
      className="relative bg-white border-b border-slate-200 overflow-hidden"
    >
      {/* Subtle Decorative Healthcare Gradient Wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-red-50/40 via-slate-50/20 to-transparent"
      />

      {/* Top Workspace / Regional & Language Utility Bar */}
      <div className="relative bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 rb-label-text">
          <div className="flex flex-wrap items-center gap-2 text-[#475569]">
            <span className="font-semibold text-[#B71C1C]">
              {lang === 'bn'
                ? 'প্রাথমিক সেবা অঞ্চল: বরগুনা জেলা (৬টি উপজেলা)'
                : 'Initial Launch Region: Barguna District (6 Upazilas)'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'bn'
                ? 'ভবিষ্যৎ সম্প্রসারণ: সমগ্র বাংলাদেশের ৬৪টি জেলা'
                : 'Future Roadmap: All 64 Districts of Bangladesh'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#64748B]">
              {lang === 'bn'
                ? 'প্রাথমিক সংস্করণ ও নমুনা প্রদর্শনী'
                : 'Stage 1: Foundation & Demonstration Preview'}
            </span>
          </div>

          {/* Interactive Language Switcher & AI Quick Trigger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAiChat}
              className="inline-flex items-center gap-1.5 rb-label-text font-semibold text-[#B71C1C] hover:text-[#E53935] underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E53935] shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'রক্তবন্ধন এআই স্বাস্থ্য সহায়ক'
                  : 'RoktoBondhon AI Assistant'}
              </span>
            </button>

            <div
              role="group"
              aria-label={lang === 'bn' ? 'ভাষা নির্বাচন' : 'Language Selector'}
              className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-lg"
            >
              <button
                type="button"
                onClick={() => onToggleLang('bn')}
                className={`px-3 py-1 rb-label-text font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'bn'
                    ? 'bg-white text-[#1E293B] shadow-2xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('en')}
                className={`px-3 py-1 rb-label-text font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white text-[#1E293B] shadow-2xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Hero 2-Column Split */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left Column: Brand Proposition, Official Logo Lockup & Primary Actions */}
          <div className="rb-animate-in lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 rb-support-text font-semibold text-[#B71C1C] mb-3.5">
                <Globe className="w-4 h-4 shrink-0 text-[#E53935]" />
                <span>
                  {lang === 'bn'
                    ? 'মানবিক ডিজিটাল রক্তদান নেটওয়ার্ক ও জরুরি রক্ত সহায়তা প্ল্যাটফর্ম'
                    : 'Humanitarian Digital Blood Donation & Emergency Assistance Platform'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#64748B]">
                  {lang === 'bn' ? 'বরগুনা জেলা সংস্করণ' : 'Barguna District Edition'}
                </span>
              </div>

              <h1 className="rb-hero-heading text-balance">
                {lang === 'bn' ? (
                  <>
                    এক ব্যাগ রক্ত,{' '}
                    <span className="text-[#E53935]">বাঁচাতে পারে একটি প্রাণ।</span>
                  </>
                ) : (
                  <>
                    One Bag of Blood{' '}
                    <span className="text-[#E53935]">Can Save a Human Life.</span>
                  </>
                )}
              </h1>

              <p className="mt-5 rb-body-text max-w-2xl">
                {lang === 'bn'
                  ? 'মুমূর্ষু রোগীর জীবন বাঁচাতে সঠিক সময়ে নিরাপদ রক্তের ব্যবস্থা করাই রক্তবন্ধন (RoktoBondhon)-এর মূল লক্ষ্য। বরগুনা জেলার ৬টি উপজেলার (বরগুনা সদর, আমতলী, বেতাগী, বামনা, পাথরঘাটা ও তালতলী) স্বেচ্ছাসেবী রক্তদাতা, রোগীর পরিবার, হাসপাতাল এবং তরুণ স্বেচ্ছাসেবকদের একটি বিশ্বস্ত ও গোপনীয়তা-সুরক্ষিত মানবিক সেতুবন্ধন।'
                  : 'RoktoBondhon connects voluntary blood donors, patient families, hospitals, and youth volunteers across all 6 Upazilas of Barguna District (Barguna Sadar, Amtali, Betagi, Bamna, Patharghata, and Taltali) through a trusted, privacy-protected digital network.'}
              </p>

              {/* Official Logo Showcase & Core Platform Purpose Card */}
              <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 shadow-2xs">
                <OfficialLogoDisplay size="sm" showTagline={false} className="shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BloodDropSymbol className="w-5 h-5 shrink-0" />
                    <h2 className="rb-card-heading font-bold text-[#1E293B]">
                      রক্তবন্ধন (RoktoBondhon)
                    </h2>
                  </div>
                  <p className="rb-support-text font-semibold text-[#B71C1C]">
                    {lang === 'bn'
                      ? 'মূলমন্ত্র: “এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।”'
                      : 'Official Motto: “এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।” (One bag of blood can save a life)'}
                  </p>
                  <p className="rb-support-text text-[#475569]">
                    {lang === 'bn'
                      ? 'শতভাগ স্বেচ্ছাসেবী ও অলাভজনক মানবিক উদ্যোগ · রক্তদাতার ব্যক্তিগত ফোন নম্বরের গোপনীয়তা সুরক্ষা · হাসপাতালভিত্তিক নিরাপদ রক্ত সঞ্চালন সমন্বয়'
                      : '100% voluntary & non-commercial initiative · Privacy-masked donor contacts · Hospital-verified blood coordination'}
                  </p>
                </div>
              </div>

              {/* Quick 3-Step Guide Strip Inside Hero */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-slate-200/90">
                  <div className="font-mono-num rb-label-text font-bold text-[#E53935]">
                    {lang === 'bn' ? 'ধাপ ০১' : '01.'}
                  </div>
                  <div className="rb-support-text font-bold text-[#1E293B] mt-1">
                    {lang === 'bn' ? 'রক্তদাতা খুঁজুন' : 'Find Blood Donors'}
                  </div>
                  <p className="rb-label-text text-[#475569] mt-1">
                    {lang === 'bn'
                      ? 'রক্তের গ্রুপ ও উপজেলা অনুযায়ী প্রস্তুত রক্তদাতা খুঁজুন।'
                      : 'Filter ready donors by blood group and Upazila.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/90">
                  <div className="font-mono-num rb-label-text font-bold text-[#E53935]">
                    {lang === 'bn' ? 'ধাপ ০২' : '02.'}
                  </div>
                  <div className="rb-support-text font-bold text-[#1E293B] mt-1">
                    {lang === 'bn' ? 'রক্তদাতা হিসেবে নিবন্ধন' : 'Register as a Donor'}
                  </div>
                  <p className="rb-label-text text-[#475569] mt-1">
                    {lang === 'bn'
                      ? 'যোগ্যতা যাচাই করে গোপনীয়তা সুরক্ষিত রেখে যুক্ত হোন।'
                      : 'Check eligibility and join with masked phone privacy.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/90">
                  <div className="font-mono-num rb-label-text font-bold text-[#E53935]">
                    {lang === 'bn' ? 'ধাপ ০৩' : '03.'}
                  </div>
                  <div className="rb-support-text font-bold text-[#1E293B] mt-1">
                    {lang === 'bn' ? 'জরুরি রক্তের অনুরোধ' : 'Emergency Requests'}
                  </div>
                  <p className="rb-label-text text-[#475569] mt-1">
                    {lang === 'bn'
                      ? 'হাসপাতালের নাম ও রক্তের গ্রুপ লিখে দ্রুত অনুরোধ জানান।'
                      : 'Post urgent hospital needs and get instant triage.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Primary CTA Row */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3.5">
              <a
                href="#find-donor"
                className="rb-btn-transition rb-btn-text inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white bg-[#E53935] hover:bg-[#B71C1C] rounded-xl shadow-xs whitespace-nowrap shrink-0"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'bn' ? 'রক্তদাতা খুঁজুন' : 'Find Blood Donor'}
                </span>
              </a>

              <a
                href="#become-donor"
                className="rb-btn-transition rb-btn-text inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[#1E293B] bg-white hover:bg-slate-50 border border-slate-300 rounded-xl whitespace-nowrap shrink-0"
              >
                <HeartHandshake className="w-4 h-4 text-[#E53935] shrink-0" />
                <span>
                  {lang === 'bn' ? 'রক্তদাতা হিসেবে নিবন্ধন করুন' : 'Become a Donor'}
                </span>
              </a>

              <a
                href="#emergency-request"
                className="rb-btn-transition rb-btn-text inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[#B71C1C] bg-red-50 hover:bg-red-100/80 border border-red-200/80 rounded-xl whitespace-nowrap shrink-0"
              >
                <AlertTriangle className="w-4 h-4 text-[#E53935] shrink-0" />
                <span>
                  {lang === 'bn' ? 'জরুরি রক্তের অনুরোধ' : 'Post Emergency Request'}
                </span>
              </a>
            </div>
          </div>

          {/* Right Column: Instant Barguna Donor Locator Card */}
          <div className="rb-animate-delay-1 lg:col-span-5 flex flex-col justify-between bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <span className="rb-label-text font-semibold text-[#E53935]">
                    {lang === 'bn'
                      ? 'তাৎক্ষণিক রক্তদাতা অনুসন্ধান'
                      : 'Instant Donor Finder'}
                  </span>
                  <h2 className="rb-subsection-heading font-bold text-[#1E293B] mt-0.5">
                    {lang === 'bn'
                      ? 'বরগুনা জেলা রক্তদাতা ডিরেক্টরি'
                      : 'Barguna District Blood Directory'}
                  </h2>
                </div>
                <BloodDropSymbol className="w-9 h-9 shrink-0" />
              </div>

              <form onSubmit={handleHeroSearchSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="hero-blood-group"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-2"
                  >
                    {lang === 'bn'
                      ? '১. রোগীর প্রয়োজনীয় রক্তের গ্রুপ নির্বাচন করুন'
                      : '1. Select Patient Required Blood Group'}
                  </label>
                  <div
                    id="hero-blood-group"
                    role="group"
                    aria-label={lang === 'bn' ? 'রক্তের গ্রুপ নির্বাচন' : 'Blood Group Selection'}
                    className="grid grid-cols-4 gap-2"
                  >
                    {ALL_BLOOD_GROUPS.map((group) => {
                      const active = heroGroup === group;
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() =>
                            setHeroGroup(active ? 'ALL' : group)
                          }
                          className={`rb-btn-transition py-2.5 px-3 text-sm sm:text-base font-bold rounded-lg border cursor-pointer font-mono-num ${
                            active
                              ? 'bg-[#E53935] text-white border-[#E53935] shadow-2xs'
                              : 'bg-white text-[#1E293B] border-slate-200 hover:border-[#E53935]'
                          }`}
                        >
                          {group}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="hero-upazila-select"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn'
                      ? '২. বরগুনা জেলার উপজেলা নির্বাচন করুন'
                      : '2. Select Upazila in Barguna District'}
                  </label>
                  <select
                    id="hero-upazila-select"
                    value={heroUpazila}
                    onChange={(e) =>
                      setHeroUpazila(e.target.value as BargunaUpazilaId | 'ALL')
                    }
                    className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                  >
                    <option value="ALL">
                      {lang === 'bn'
                        ? 'সকল উপজেলা (সমগ্র বরগুনা জেলা)'
                        : 'All Upazilas (Entire Barguna District)'}
                    </option>
                    {BARGUNA_UPAZILAS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {lang === 'bn'
                          ? `${u.nameBn} (${u.primaryHospitalBn})`
                          : `${u.nameEn} (${u.primaryHospitalEn})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Compatibility Preview inside Finder */}
                {activeCompatibility ? (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="rb-label-text font-semibold text-[#1E293B]">
                      {lang === 'bn'
                        ? `${heroGroup} গ্রুপের রোগীর জন্য গ্রহণযোগ্য রক্তের গ্রুপসমূহ:`
                        : `Compatible Donor Groups for ${heroGroup} Patient:`}
                    </div>
                    <div className="text-[#B71C1C] font-bold font-mono-num text-base">
                      {activeCompatibility.canReceiveFrom.join(' · ')}
                    </div>
                    <p className="rb-label-text text-[#475569]">
                      {lang === 'bn'
                        ? activeCompatibility.clinicalNoteBn
                        : activeCompatibility.clinicalNoteEn}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 rb-label-text text-[#475569]">
                    {lang === 'bn'
                      ? 'উপরের যেকোনো একটি রক্তের গ্রুপ নির্বাচন করলে রোগীর জন্য গ্রহণযোগ্য বিকল্প রক্তের গ্রুপগুলো সাথে সাথে দেখা যাবে।'
                      : 'Select any blood group above to view instant ABO/Rh compatible donor options.'}
                  </div>
                )}

                <button
                  type="submit"
                  className="rb-btn-transition rb-btn-text w-full py-3.5 px-5 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? 'রক্তদাতা খুঁজুন'
                      : 'Filter Donor Directory (Demo)'}
                  </span>
                </button>
              </form>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3 rb-label-text text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                {lang === 'bn'
                  ? 'নমুনা তথ্য দ্বারা প্রদর্শিত'
                  : 'Labeled demonstration data only'}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1E293B]">
                <Compass className="w-3.5 h-3.5 text-[#E53935] shrink-0" />
                {lang === 'bn' ? '৬টি উপজেলা সংযুক্ত' : '6 Upazilas Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Full-Width 6-Upazila Coverage Strip Below Hero Split */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="rb-support-text font-semibold text-[#1E293B]">
              {lang === 'bn'
                ? 'বরগুনা জেলার ৬টি উপজেলা নেটওয়ার্ক (যেকোনো উপজেলায় ক্লিক করে সরাসরি রক্তদাতা দেখুন)'
                : 'Barguna District 6-Upazila Coverage (Click any Upazila to filter donors)'}
            </h3>
            <span className="rb-label-text font-medium text-[#64748B] tabular-nums">
              {lang === 'bn'
                ? '৬টি উপজেলা · ৪২টি ইউনিয়ন · ৪টি পৌরসভা'
                : '6 Upazilas · 42 Unions · 4 Municipalities'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {BARGUNA_UPAZILAS.map((upazila, index) => {
              const isSelected = selectedUpazila === upazila.id;
              return (
                <button
                  key={upazila.id}
                  type="button"
                  onClick={() => {
                    onQuickSearch(selectedBloodGroup, upazila.id);
                    const el = document.getElementById('find-donor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`rb-card-hover text-left p-4 rounded-xl border cursor-pointer ${
                    isSelected
                      ? 'bg-red-50/70 border-[#E53935] text-[#1E293B]'
                      : 'bg-[#F8FAFC] hover:bg-white border-slate-200 text-[#1E293B]'
                  }`}
                >
                  <div className="rb-label-text font-medium text-[#64748B]">
                    {lang === 'bn'
                      ? `${toBnDigits(`0${index + 1}`)}. উপজেলা`
                      : `0${index + 1}. Upazila`}
                  </div>
                  <div className="rb-support-text font-bold text-[#1E293B] mt-0.5 whitespace-nowrap">
                    {lang === 'bn' ? upazila.nameBn : upazila.nameEn}
                  </div>
                  <div className="rb-label-text text-[#64748B] mt-1">
                    {lang === 'bn'
                      ? `${toBnDigits(upazila.unionsCount)}টি ইউনিয়ন`
                      : `${upazila.unionsCount} Unions`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
