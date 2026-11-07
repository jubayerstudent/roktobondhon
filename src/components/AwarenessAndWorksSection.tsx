import React from 'react';
import { Language, BloodGroup } from '../types/blood';
import {
  ALL_BLOOD_GROUPS,
  BLOOD_COMPATIBILITY_MAP,
} from '../utils/bloodLogic';
import { Check, ArrowRight } from 'lucide-react';

interface AwarenessAndWorksSectionProps {
  lang: Language;
  onSelectBloodGroupForSearch: (group: BloodGroup) => void;
}

export const AwarenessAndWorksSection: React.FC<
  AwarenessAndWorksSectionProps
> = ({ lang, onSelectBloodGroupForSearch }) => {
  const [selectedMatrixGroup, setSelectedMatrixGroup] =
    React.useState<BloodGroup>('O-');

  const matrixInfo = BLOOD_COMPATIBILITY_MAP[selectedMatrixGroup];

  const howItWorksSteps = [
    {
      num: '০১.',
      numEn: '01.',
      titleBn: 'রক্তদাতা ও স্বেচ্ছাসেবক নিবন্ধন',
      titleEn: 'Donor & Volunteer Registration',
      descBn:
        'বরগুনা জেলার ৬টি উপজেলার স্বেচ্ছাসেবী রক্তদাতাগণ তাঁদের রক্তের গ্রুপ, ইউনিয়ন ও সর্বশেষ রক্তদানের তারিখসহ নিরাপদ প্রোফাইল তৈরি করেন।',
      descEn:
        'Donors across Barguna’s 6 Upazilas register with their blood group, union location, and 90-day recovery timeline.',
    },
    {
      num: '০২.',
      numEn: '02.',
      titleBn: 'উপজেলা ও রক্তের গ্রুপ অনুযায়ী অনুসন্ধান',
      titleEn: 'Smart Upazila & Compatibility Matching',
      descBn:
        'রোগীর রক্তের গ্রুপ ও হাসপাতালের অবস্থান অনুযায়ী নিকটবর্তী প্রস্তুত রক্তদাতা এবং সামঞ্জস্যপূর্ণ বিকল্প গ্রুপগুলো তাৎক্ষণিক খুঁজে পাওয়া যায়।',
      descEn:
        'Patients or hospital coordinators filter available donors by Upazila and ABO/Rh compatibility in seconds.',
    },
    {
      num: '০৩.',
      numEn: '03.',
      titleBn: 'রিকুইজিশন যাচাই ও নিরাপদ যোগাযোগ',
      titleEn: 'Requisition Verification & Privacy-Safe Contact',
      descBn:
        'রক্তদাতার ব্যক্তিগত ফোন নম্বর প্রকাশ্যে না রেখে হাসপাতালের যাচাইকৃত রিকুইজিশন ও স্বেচ্ছাসেবক সমন্বয় কেন্দ্রের মাধ্যমে নিরাপদ যোগাযোগ স্থাপন করা হয়।',
      descEn:
        'Donor phone numbers stay protected while verified hospital requests trigger direct coordination.',
    },
    {
      num: '০৪.',
      numEn: '04.',
      titleBn: 'হাসপাতালে ক্রস-ম্যাচিং ও ৯০ দিনের বিরতি',
      titleEn: 'Hospital Cross-Matching & 90-Day Recovery Tracking',
      descBn:
        'হাসপাতালের ল্যাবে রক্তের স্ক্রিনিং ও ক্রস-ম্যাচিং শেষে রক্তদান সম্পন্ন হয় এবং রক্তদাতার প্রোফাইল স্বয়ংক্রিয়ভাবে ৯০ দিনের বিশ্রামে যুক্ত হয়।',
      descEn:
        'Following clinical cross-matching and transfusion, the donor profile automatically enters a 90-day rest period.',
    },
  ];

  return (
    <>
      {/* SECTION 6: Blood Donation Awareness */}
      <section
        id="awareness"
        className="py-14 lg:py-20 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০৪. রক্তদান সচেতনতা ও চিকিৎসা নির্দেশিকা'
                : '04. Blood Donation Awareness & Clinical Guidelines'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'নিরাপদ রক্তদান সম্পর্কে জরুরি স্বাস্থ্য তথ্য'
                : 'Essential Medical Facts About Safe Blood Donation'}
            </h2>
            <p className="rb-body-text mt-2.5 max-w-3xl">
              {lang === 'bn'
                ? 'সঠিক স্বাস্থ্যবিধি মেনে রক্তদান করলে রক্তদাতার শরীরের কোনো ক্ষতি হয় না; বরং এটি একজন মুমূর্ষু রোগীর জীবন বাঁচাতে অপরিহার্য ভূমিকা রাখে।'
                : 'Donating blood under standard clinical protocols is completely safe for healthy adults and saves lives during critical emergencies.'}
            </p>
          </div>

          {/* Asymmetric Bento Grid for Clinical Awareness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Span 2: Why Donate & Physiological Recovery */}
            <div className="lg:col-span-2 bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
              <div>
                <span className="rb-label-text font-semibold text-[#B71C1C]">
                  {lang === 'bn'
                    ? 'চিকিৎসা বিজ্ঞান ও মানবিক গুরুত্ব'
                    : 'Clinical Science & Humanitarian Impact'}
                </span>
                <h3 className="rb-subsection-heading font-bold text-[#1E293B] mt-1">
                  {lang === 'bn'
                    ? 'এক ব্যাগ (৩৫০–৪৫০ মি.লি.) রক্তদানে শরীরের কোনো ক্ষতি হয় না'
                    : 'Donating 350–450 mL of Whole Blood Is Safe and Regenerative'}
                </h3>
                <p className="rb-body-text mt-3">
                  {lang === 'bn'
                    ? 'একজন সুস্থ প্রাপ্তবয়স্ক মানুষের শরীরে প্রায় ৫ থেকে ৬ লিটার রক্ত থাকে। রক্তদানের পর ২৪ থেকে ৪৮ ঘণ্টার মধ্যে শরীরের প্লাজমা বা তরল অংশ পূরণ হয়ে যায় এবং ৪ থেকে ৮ সপ্তাহের মধ্যে লোহিত রক্তকণিকা সম্পূর্ণ স্বাভাবিক মাত্রায় ফিরে আসে। তাই প্রতি ৩ থেকে ৪ মাস (৯০–১২০ দিন) অন্তর নিরাপদে রক্তদান করা যায়।'
                    : 'A healthy adult carries 5 to 6 liters of blood. After donating one unit, plasma volume restores within 24–48 hours and red blood cells replenish completely within 4–8 weeks, allowing safe donation every 90 to 120 days.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
                <div>
                  <div className="rb-label-text text-[#64748B]">
                    {lang === 'bn'
                      ? 'প্লাজমা পুনরুদ্ধার সময়'
                      : 'Plasma Volume Recovery'}
                  </div>
                  <div className="rb-card-heading font-bold text-[#1E293B] font-mono-num mt-0.5">
                    {lang === 'bn' ? '২৪–৪৮ ঘণ্টা' : '24–48 Hours'}
                  </div>
                </div>
                <div>
                  <div className="rb-label-text text-[#64748B]">
                    {lang === 'bn'
                      ? 'নিরাপদ বিরতি কাল'
                      : 'Safe Donation Interval'}
                  </div>
                  <div className="rb-card-heading font-bold text-[#E53935] font-mono-num mt-0.5">
                    {lang === 'bn' ? '৯০–১২০ দিন' : '90–120 Days'}
                  </div>
                </div>
                <div>
                  <div className="rb-label-text text-[#64748B]">
                    {lang === 'bn'
                      ? 'আবশ্যিক ল্যাব পরীক্ষা'
                      : 'Mandatory Lab Screening'}
                  </div>
                  <div className="rb-support-text font-bold text-[#1E293B] mt-1">
                    HBV · HCV · HIV · Syphilis · Malaria
                  </div>
                </div>
              </div>
            </div>

            {/* Span 1: Pre & Post Donation Checklist */}
            <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs">
              <h3 className="rb-card-heading font-bold text-[#1E293B] pb-3.5 border-b border-slate-200">
                {lang === 'bn'
                  ? 'রক্তদানের পূর্ব ও পরবর্তী করণীয়'
                  : 'Pre- & Post-Donation Checklist'}
              </h3>
              <ul className="mt-4 space-y-3.5 rb-support-text text-[#475569]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    {lang === 'bn'
                      ? 'রক্তদানের আগের রাতে অন্তত ৬–৮ ঘণ্টা পর্যাপ্ত ঘুম নিশ্চিত করুন।'
                      : 'Get at least 6–8 hours of restful sleep the night before donating.'}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    {lang === 'bn'
                      ? 'খালি পেটে রক্ত দেবেন না; হালকা খাবার এবং পর্যাপ্ত পানি বা ডাবের পানি পান করুন।'
                      : 'Never donate on an empty stomach; eat a balanced meal and hydrate well.'}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    {lang === 'bn'
                      ? 'রক্তদানের পর অন্তত ১০–১৫ মিনিট বিশ্রাম নিন এবং পরবর্তী ২৪ ঘণ্টা ভারী কাজ এড়িয়ে চলুন।'
                      : 'Rest for 10–15 minutes after donation and avoid heavy lifting for 24 hours.'}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    {lang === 'bn'
                      ? 'রক্ত সঞ্চালনের পূর্বে অবশ্যই অনুমোদিত হাসপাতাল বা ব্লাড ব্যাংকে ক্রস-ম্যাচিং সম্পন্ন করুন।'
                      : 'Always complete blood grouping and cross-matching at an accredited hospital lab.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: How RoktoBondhon Works */}
      <section
        id="how-it-works"
        className="py-14 lg:py-20 bg-[#F8FAFC] border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০৫. রক্তবন্ধন কীভাবে কাজ করে'
                : '05. How RoktoBondhon Works'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? '৪টি সহজ ধাপে নিরাপদ ও দ্রুত রক্তের সমন্বয়'
                : 'Four Structured Steps From Request to Safe Transfusion'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {howItWorksSteps.map((step) => (
              <div
                key={step.numEn}
                className="rb-card-hover bg-white rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="rb-support-text font-bold font-mono-num text-[#E53935]">
                    {lang === 'bn' ? step.num : step.numEn}
                  </div>
                  <h3 className="rb-card-heading font-bold text-[#1E293B] mt-2">
                    {lang === 'bn' ? step.titleBn : step.titleEn}
                  </h3>
                  <p className="rb-support-text text-[#475569] mt-2.5">
                    {lang === 'bn' ? step.descBn : step.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: Interactive Blood Group Information & Compatibility Matrix */}
      <section
        id="blood-groups"
        className="py-14 lg:py-20 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০৬. রক্তের গ্রুপ ও সামঞ্জস্যতা চার্ট'
                : '06. Interactive Blood Group Compatibility Matrix'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'কোন গ্রুপের রক্ত কাকে দেওয়া যাবে এবং কার কাছ থেকে নেওয়া যাবে'
                : 'Check Who Can Donate To and Receive From Each Blood Group'}
            </h2>
            <p className="rb-body-text mt-2.5 max-w-3xl">
              {lang === 'bn'
                ? 'নিচের যেকোনো একটি রক্তের গ্রুপ নির্বাচন করে লোহিত রক্তকণিকা ও প্লাজমা সামঞ্জস্যতা জেনে নিন।'
                : 'Select any blood group below to inspect red blood cell and plasma compatibility.'}
            </p>
          </div>

          {/* Group Selector Buttons */}
          <div
            role="group"
            aria-label={
              lang === 'bn'
                ? 'সামঞ্জস্যতা পরীক্ষার রক্তের গ্রুপ'
                : 'Select Blood Group for Compatibility'
            }
            className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 mb-8"
          >
            {ALL_BLOOD_GROUPS.map((group) => {
              const active = selectedMatrixGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedMatrixGroup(group)}
                  className={`rb-btn-transition py-3 px-4 rounded-xl border text-base font-bold font-mono-num cursor-pointer ${
                    active
                      ? 'bg-[#E53935] text-white border-[#E53935] shadow-2xs'
                      : 'bg-[#F8FAFC] text-[#1E293B] border-slate-200 hover:border-[#E53935]'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>

          {/* Selected Blood Group Detail Panel */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-2.5">
                <div className="rb-label-text font-semibold text-[#B71C1C]">
                  {lang === 'bn'
                    ? 'নির্বাচিত রক্তের গ্রুপ'
                    : 'Selected Blood Group'}
                </div>
                <div className="rb-section-heading font-bold text-[#1E293B]">
                  {lang === 'bn'
                    ? matrixInfo.nameBn
                    : `Blood Group ${matrixInfo.group}`}
                </div>
                <p className="rb-body-text text-[#475569]">
                  {lang === 'bn'
                    ? matrixInfo.clinicalNoteBn
                    : matrixInfo.clinicalNoteEn}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectBloodGroupForSearch(matrixInfo.group);
                      const el = document.getElementById('find-donor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="rb-btn-transition rb-btn-text inline-flex items-center gap-1.5 text-[#E53935] hover:text-[#B71C1C] cursor-pointer"
                  >
                    <span>
                      {lang === 'bn'
                        ? `বরগুনায় ${matrixInfo.group} গ্রুপের রক্তদাতা দেখুন`
                        : `Browse ${matrixInfo.group} Demo Donors in Barguna`}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="rb-label-text font-semibold text-[#64748B]">
                    {lang === 'bn'
                      ? 'যাদেরকে রক্ত দিতে পারবেন'
                      : 'Can Donate Red Cells To'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matrixInfo.canDonateTo.map((g) => (
                      <span
                        key={g}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-[#B71C1C] font-bold font-mono-num text-sm"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="rb-label-text font-semibold text-[#64748B]">
                    {lang === 'bn'
                      ? 'যাদের কাছ থেকে রক্ত নিতে পারবেন'
                      : 'Can Receive Red Cells From'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matrixInfo.canReceiveFrom.map((g) => (
                      <span
                        key={g}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-[#1E293B] font-bold font-mono-num text-sm"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="rb-label-text font-semibold text-[#64748B]">
                    {lang === 'bn'
                      ? 'যাদেরকে প্লাজমা দিতে পারবেন'
                      : 'Compatible Plasma Recipients'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matrixInfo.plasmaCanDonateTo.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-[#475569] font-semibold font-mono-num text-xs"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
