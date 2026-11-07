import React from 'react';
import { Language } from '../types/blood';
import { BARGUNA_UPAZILAS } from '../data/bargunaData';
import { toBnDigits } from '../utils/bloodLogic';
import { OfficialLogoDisplay, BloodDropSymbol } from './BrandLogo';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="bg-white border-t border-slate-200 text-[#475569] pb-12 sm:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Col 1-5: Official Brand Identity & Motto */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-4">
              <OfficialLogoDisplay size="sm" showTagline={false} />
              <div>
                <div className="flex items-center gap-2">
                  <BloodDropSymbol className="w-5 h-5" />
                  <span className="rb-card-heading font-bold text-[#1E293B]">
                    রক্তবন্ধন (RoktoBondhon)
                  </span>
                </div>
                <p className="rb-support-text font-semibold text-[#E53935] mt-0.5">
                  এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।
                </p>
                <p className="rb-label-text text-[#64748B] mt-1">
                  {lang === 'bn'
                    ? 'প্রাথমিক সেবা অঞ্চল: বরগুনা জেলা, বাংলাদেশ · লক্ষ্য: সমগ্র ৬৪ জেলা'
                    : 'Initial Launch: Barguna District, Bangladesh · Vision: All 64 Districts'}
                </p>
              </div>
            </div>

            <p className="rb-support-text text-[#475569] max-w-md">
              {lang === 'bn'
                ? 'রক্তবন্ধন একটি আধুনিক, জেলাভিত্তিক ডিজিটাল রক্তদান ব্যবস্থাপনা ও জরুরি রক্ত সহায়তা প্ল্যাটফর্ম। রক্তদানের বিনিময়ে কখনো কোনো আর্থিক লেনদেন করবেন না; রক্তদান সম্পূর্ণ স্বেচ্ছাসেবী ও মানবিক সেবা।'
                : 'RoktoBondhon is a district-based digital blood donation management and emergency assistance platform. Voluntary blood donation is 100% free and non-commercial.'}
            </p>
          </div>

          {/* Col 6-8: Quick Platform Sections */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="rb-support-text font-bold text-[#1E293B]">
              {lang === 'bn' ? 'গুরুত্বপূর্ণ লিংকসমূহ' : 'Platform Navigation'}
            </h3>
            <ul className="space-y-2 rb-support-text text-[#475569]">
              <li>
                <a
                  href="#find-donor"
                  className="hover:text-[#E53935] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn' ? 'রক্তদাতা খুঁজুন' : 'Find Blood Donor'}
                </a>
              </li>
              <li>
                <a
                  href="#emergency-request"
                  className="hover:text-[#E53935] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn'
                    ? 'জরুরি রক্তের অনুরোধ'
                    : 'Emergency Blood Request'}
                </a>
              </li>
              <li>
                <a
                  href="#become-donor"
                  className="hover:text-[#E53935] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn'
                    ? 'রক্তদাতা হিসেবে নিবন্ধন করুন'
                    : 'Become a Donor'}
                </a>
              </li>
              <li>
                <a
                  href="#awareness"
                  className="hover:text-[#E53935] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn'
                    ? 'রক্তদান সচেতনতা ও নির্দেশিকা'
                    : 'Blood Donation Awareness'}
                </a>
              </li>
              <li>
                <a
                  href="#blood-groups"
                  className="hover:text-[#E53935] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn'
                    ? 'রক্তের গ্রুপ সামঞ্জস্যতা চার্ট'
                    : 'Blood Group Compatibility'}
                </a>
              </li>
              <li>
                <a
                  href="#campaigns"
                  className="hover:text-[#E53935] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === 'bn'
                    ? 'রক্তদান কর্মসূচি ও সংগঠন'
                    : 'Campaigns & Organizations'}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 9-12: Barguna District Upazilas Coverage */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="rb-support-text font-bold text-[#1E293B]">
              {lang === 'bn'
                ? 'বরগুনা জেলার ৬টি উপজেলা নেটওয়ার্ক'
                : 'Barguna District 6 Upazila Coverage'}
            </h3>
            <ul className="grid grid-cols-2 gap-2 rb-label-text">
              {BARGUNA_UPAZILAS.map((u, idx) => (
                <li key={u.id} className="text-[#475569]">
                  <span className="text-[#64748B]">
                    {lang === 'bn' ? `${toBnDigits(`0${idx + 1}`)}. ` : `0${idx + 1}. `}
                  </span>
                  <span className="font-semibold text-[#1E293B]">
                    {lang === 'bn' ? u.nameBn : u.nameEn}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-3 mt-3 border-t border-slate-100 rb-label-text text-[#64748B] space-y-1.5">
              <div className="font-medium text-[#1E293B]">
                {lang === 'bn'
                  ? 'জাতীয় জরুরি সেবা হটলাইন: ৯৯৯ · স্বাস্থ্য বাতায়ন: ১৬২৬৩'
                  : 'National Emergency Hotline: 999 · Health Call Center: 16263'}
              </div>
              <div>
                {lang === 'bn'
                  ? 'প্রাথমিক সংস্করণ: এখানে প্রদর্শিত সকল রক্তদাতা ও অনুরোধের তথ্য নমুনা হিসেবে যুক্ত করা হয়েছে।'
                  : 'Stage 1 Foundation Build: All donor and request records are labeled demonstration content.'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 rb-label-text text-[#64748B]">
          <p>
            © {lang === 'bn' ? toBnDigits(new Date().getFullYear()) : new Date().getFullYear()} রক্তবন্ধন (RoktoBondhon) ·{' '}
            {lang === 'bn'
              ? 'সর্বস্বত্ব সংরক্ষিত · এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।'
              : 'All rights reserved · One bag of blood can save a life.'}
          </p>
          <p>
            {lang === 'bn'
              ? 'বরগুনা জেলা থেকে সমগ্র বাংলাদেশের ৬৪টি জেলার পথে'
              : 'Launching in Barguna District · Scaling to All 64 Districts of Bangladesh'}
          </p>
        </div>
      </div>
    </footer>
  );
};
