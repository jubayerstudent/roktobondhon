import React from 'react';
import {
  Language,
  BloodGroup,
  BargunaUpazilaId,
  DemoDonor,
} from '../types/blood';
import { BARGUNA_UPAZILAS } from '../data/bargunaData';
import {
  ALL_BLOOD_GROUPS,
  checkDonorEligibility,
  maskBangladeshPhone,
  validateDonorRegistration,
  toBnDigits,
} from '../utils/bloodLogic';
import {
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface BecomeDonorSectionProps {
  lang: Language;
  onRegisterDemoDonor: (donor: DemoDonor) => void;
}

export const BecomeDonorSection: React.FC<BecomeDonorSectionProps> = ({
  lang,
  onRegisterDemoDonor,
}) => {
  // Interactive Eligibility Calculator State
  const [age, setAge] = React.useState<number>(24);
  const [weightKg, setWeightKg] = React.useState<number>(58);
  const [daysSinceLastDonation, setDaysSinceLastDonation] =
    React.useState<number>(120);
  const [hasRecentIllness, setHasRecentIllness] = React.useState<boolean>(false);

  // Donor Onboarding Demo Form State
  const [fullName, setFullName] = React.useState('');
  const [bloodGroup, setBloodGroup] = React.useState<BloodGroup>('O+');
  const [upazilaId, setUpazilaId] =
    React.useState<BargunaUpazilaId>('barguna-sadar');
  const [areaName, setAreaName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [contactMode, setContactMode] = React.useState<
    'mediated_callback' | 'direct_on_approval'
  >('mediated_callback');
  const [consentPublicDirectory, setConsentPublicDirectory] =
    React.useState(true);
  const [consentContactWorkflow, setConsentContactWorkflow] =
    React.useState(true);
  const [consentVoluntaryNoPayment, setConsentVoluntaryNoPayment] =
    React.useState(true);
  const [submitMessage, setSubmitMessage] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const eligibility = React.useMemo(
    () =>
      checkDonorEligibility({
        age,
        weightKg,
        daysSinceLastDonation,
        hasRecentSurgeryOrIllness: hasRecentIllness,
      }),
    [age, weightKg, daysSinceLastDonation, hasRecentIllness]
  );

  const handleDonorSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);

    const validation = validateDonorRegistration({
      fullName,
      bloodGroup,
      upazilaId,
      areaName,
      phone,
      consentPublicDirectory,
      consentContactWorkflow,
      consentVoluntaryNoPayment,
    });

    if (!validation.valid) {
      setSubmitMessage({
        type: 'error',
        text: lang === 'bn' ? validation.errorBn! : validation.errorEn!,
      });
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const masked = maskBangladeshPhone(cleanPhone, lang);
    const newDemoDonor: DemoDonor = {
      id: `demo-donor-${Date.now()}`,
      code: `RB-NEW-${Math.floor(100 + Math.random() * 899)}`,
      nameBn: fullName.trim(),
      nameEn: fullName.trim(),
      bloodGroup,
      upazilaId,
      locationBn: areaName.trim(),
      locationEn: areaName.trim(),
      isAvailable: eligibility.eligible,
      lastDonationDaysAgo: daysSinceLastDonation,
      totalDonations: 1,
      maskedPhone: masked,
      verifiedByOrgBn:
        contactMode === 'mediated_callback'
          ? 'পদ্ধতি ক: সমন্বয়কারী কলব্যাক সুরক্ষিত (নমুনা)'
          : 'পদ্ধতি খ: ২৪ ঘণ্টা অনুমোদনভিত্তিক (নমুনা)',
      verifiedByOrgEn:
        contactMode === 'mediated_callback'
          ? 'Mode A: Mediated Callback Protected (Sample)'
          : 'Mode B: 24h Approval-Based Share (Sample)',
      isDemoRecord: true,
    };

    onRegisterDemoDonor(newDemoDonor);
    setSubmitMessage({
      type: 'success',
      text:
        lang === 'bn'
          ? 'অভিনন্দন! আপনার নমুনা রক্তদাতা প্রোফাইলটি (গোপনীয় নম্বর ও ৩টি সম্মতি সুরক্ষিত রেখে) বরগুনা জেলা ডিরেক্টরিতে যুক্ত হয়েছে। উপরে “রক্তদাতা খুঁজুন” অংশে এটি দেখতে পাবেন।'
          : 'Success! Your demonstration donor profile (with masked phone privacy and 3 verified consents) has been added to the Barguna District directory above.',
    });
    setFullName('');
    setAreaName('');
    setPhone('');
  };

  return (
    <section
      id="become-donor"
      className="py-14 lg:py-20 bg-[#F8FAFC] border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="rb-support-text font-semibold text-[#E53935]">
            {lang === 'bn'
              ? '০৩. স্বেচ্ছায় রক্তদাতা নিবন্ধন ও যোগ্যতা যাচাই'
              : '03. Voluntary Donor Onboarding & Clinical Eligibility Check'}
          </div>
          <h2 className="rb-section-heading mt-1 text-balance">
            {lang === 'bn'
              ? 'রক্তবন্ধন নেটওয়ার্কে স্বেচ্ছাসেবী রক্তদাতা হিসেবে যুক্ত হোন'
              : 'Join the RoktoBondhon Voluntary Blood Donor Network'}
          </h2>
          <p className="rb-body-text mt-2.5 max-w-3xl">
            {lang === 'bn'
              ? 'রক্তদান এক মহৎ মানবিক দায়িত্ব। প্রথমে নিচের ক্যালকুলেটরে আপনার বয়স, ওজন ও সর্বশেষ রক্তদানের বিরতি যাচাই করুন এবং গোপনীয়তা-সুরক্ষিত নিবন্ধন ফর্মটি পূরণ করুন।'
              : 'Verify your clinical donation readiness using our 90-day interval calculator and preview the donor registration workflow.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left 5 Columns: Interactive Clinical Eligibility Checker */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 flex flex-col justify-between shadow-2xs">
            <div>
              <h3 className="rb-subsection-heading font-bold text-[#1E293B] pb-4 border-b border-slate-200">
                {lang === 'bn'
                  ? 'রক্তদানের প্রাথমিক যোগ্যতা যাচাই'
                  : 'Clinical Blood Donation Eligibility Calculator'}
              </h3>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex justify-between rb-support-text font-semibold text-[#1E293B] mb-1.5">
                    <label htmlFor="elig-age">
                      {lang === 'bn'
                        ? 'আপনার বয়স (১৮–৬০ বছর)'
                        : 'Your Age (18–60 years)'}
                    </label>
                    <span className="font-bold text-[#E53935] tabular-nums">
                      {lang === 'bn' ? `${toBnDigits(age)} বছর` : `${age} yrs`}
                    </span>
                  </div>
                  <input
                    id="elig-age"
                    type="range"
                    min={15}
                    max={68}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full accent-[#E53935] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between rb-support-text font-semibold text-[#1E293B] mb-1.5">
                    <label htmlFor="elig-weight">
                      {lang === 'bn'
                        ? 'শারীরিক ওজন (কমপক্ষে ৪৮ কেজি)'
                        : 'Body Weight (Min 48 kg)'}
                    </label>
                    <span className="font-bold text-[#E53935] tabular-nums">
                      {lang === 'bn' ? `${toBnDigits(weightKg)} কেজি` : `${weightKg} kg`}
                    </span>
                  </div>
                  <input
                    id="elig-weight"
                    type="range"
                    min={38}
                    max={110}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full accent-[#E53935] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between rb-support-text font-semibold text-[#1E293B] mb-1.5">
                    <label htmlFor="elig-days">
                      {lang === 'bn'
                        ? 'সর্বশেষ রক্তদানের পর অতিবাহিত দিন (কমপক্ষে ৯০ দিন)'
                        : 'Days Since Last Donation (Min 90 days)'}
                    </label>
                    <span className="font-bold text-[#E53935] tabular-nums">
                      {lang === 'bn'
                        ? `${toBnDigits(daysSinceLastDonation)} দিন`
                        : `${daysSinceLastDonation} days`}
                    </span>
                  </div>
                  <input
                    id="elig-days"
                    type="range"
                    min={0}
                    max={240}
                    step={5}
                    value={daysSinceLastDonation}
                    onChange={(e) =>
                      setDaysSinceLastDonation(Number(e.target.value))
                    }
                    className="w-full accent-[#E53935] cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-2.5 rb-label-text font-semibold text-[#1E293B] pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasRecentIllness}
                    onChange={(e) => setHasRecentIllness(e.target.checked)}
                    className="w-4 h-4 accent-[#E53935] rounded"
                  />
                  <span>
                    {lang === 'bn'
                      ? 'গত ৬ মাসে বড় কোনো অস্ত্রোপচার বা তীব্র অসুস্থতা হয়েছে'
                      : 'Had major surgery or acute infection in the past 6 months'}
                  </span>
                </label>
              </div>
            </div>

            {/* Eligibility Result Box */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              {eligibility.eligible ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="rb-support-text font-bold text-[#16A34A] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'আপনি বর্তমানে রক্তদানের জন্য প্রাথমিকভাবে উপযুক্ত!'
                        : 'You meet the primary clinical criteria to donate blood!'}
                    </span>
                  </div>
                  <p className="rb-label-text text-[#475569]">
                    {lang === 'bn'
                      ? 'রক্তদানের পূর্বে হাসপাতালে রক্তচাপ, নাড়ির গতি ও হিমোগ্লোবিন মাত্রা (কমপক্ষে ১২.৫ g/dL) পরীক্ষা করে নিন।'
                      : 'A standard pre-donation check (blood pressure, pulse, hemoglobin ≥ 12.5 g/dL) will be conducted at the hospital.'}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="rb-support-text font-bold text-[#B71C1C] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'বর্তমানে রক্তদান সাময়িকভাবে স্থগিত রাখা প্রয়োজন:'
                        : 'Temporary Deferral Recommended:'}
                    </span>
                  </div>
                  <ul className="list-disc list-inside rb-label-text text-[#475569] space-y-1">
                    {(lang === 'bn'
                      ? eligibility.reasonsBn
                      : eligibility.reasonsEn
                    ).map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right 7 Columns: Donor Registration Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#E53935]" />
                <h3 className="rb-subsection-heading font-bold text-[#1E293B]">
                  {lang === 'bn'
                    ? 'স্বেচ্ছাসেবী রক্তদাতা নিবন্ধন ফর্ম (নমুনা)'
                    : 'Voluntary Donor Onboarding Form (Demo Preview)'}
                </h3>
              </div>
              <span className="rb-label-text font-semibold text-[#64748B]">
                {lang === 'bn' ? 'বরগুনা জেলা' : 'Barguna District'}
              </span>
            </div>

            <form
              onSubmit={handleDonorSignup}
              className="mt-5 space-y-4"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="donor-name"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn'
                      ? 'রক্তদাতার পূর্ণ নাম *'
                      : 'Donor Full Name *'}
                  </label>
                  <input
                    id="donor-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={
                      lang === 'bn'
                        ? 'যেমন: মাহমুদুল হাসান'
                        : 'e.g. Mahmudul Hasan (Demo)'
                    }
                    className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="donor-group"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn' ? 'রক্তের গ্রুপ *' : 'Blood Group *'}
                  </label>
                  <select
                    id="donor-group"
                    value={bloodGroup}
                    onChange={(e) =>
                      setBloodGroup(e.target.value as BloodGroup)
                    }
                    className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] font-bold focus:outline-none focus:border-[#E53935]"
                  >
                    {ALL_BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="donor-upazila"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn'
                      ? 'উপজেলা নির্বাচন করুন (বরগুনা) *'
                      : 'Select Upazila (Barguna) *'}
                  </label>
                  <select
                    id="donor-upazila"
                    value={upazilaId}
                    onChange={(e) =>
                      setUpazilaId(e.target.value as BargunaUpazilaId)
                    }
                    className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                  >
                    {BARGUNA_UPAZILAS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {lang === 'bn' ? u.nameBn : u.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="donor-area"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn'
                      ? 'ইউনিয়ন / পৌরসভা ও এলাকার নাম *'
                      : 'Union / Municipality & Locality *'}
                  </label>
                  <input
                    id="donor-area"
                    type="text"
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    placeholder={
                      lang === 'bn'
                        ? 'যেমন: বরগুনা পৌরসভা, ৭ নং ওয়ার্ড'
                        : 'e.g. Ward 7, Barguna Municipality'
                    }
                    className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="donor-phone"
                  className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                >
                  {lang === 'bn'
                    ? 'মোবাইল নম্বর (গোপনীয়তা সুরক্ষার জন্য সংরক্ষিত থাকবে) *'
                    : 'Mobile Number (Automatically masked for privacy) *'}
                </label>
                <input
                  id="donor-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01711223344"
                  className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] font-mono-num focus:outline-none focus:border-[#E53935]"
                />
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-t-0 border-b border-slate-200/80">
                  <div className="flex items-center gap-2 rb-label-text font-bold text-[#1E293B]">
                    <Shield className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'যোগাযোগের মাধ্যম ও ৩টি আবশ্যিক সম্মতি'
                        : 'Contact Mediation Mode & 3 Mandatory Consents (v1.0)'}
                    </span>
                  </div>
                  <select
                    aria-label={
                      lang === 'bn'
                        ? 'যোগাযোগের মাধ্যম নির্বাচন'
                        : 'Contact Preference Mode'
                    }
                    value={contactMode}
                    onChange={(e) =>
                      setContactMode(
                        e.target.value as
                          | 'mediated_callback'
                          | 'direct_on_approval'
                      )
                    }
                    className="px-3 py-1.5 rb-label-text font-semibold bg-white border border-slate-300 rounded-lg text-[#1E293B]"
                  >
                    <option value="mediated_callback">
                      {lang === 'bn'
                        ? 'পদ্ধতি ক: সমন্বয়কারী কলব্যাক (ডিফল্ট)'
                        : 'Mode A: Mediated Callback (Default)'}
                    </option>
                    <option value="direct_on_approval">
                      {lang === 'bn'
                        ? 'পদ্ধতি খ: অনুমোদন সাপেক্ষে ২৪ ঘণ্টা যোগাযোগ'
                        : 'Mode B: 24h Direct Share on Approval'}
                    </option>
                  </select>
                </div>

                <label className="flex items-start gap-2.5 rb-label-text text-[#475569] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentPublicDirectory}
                    onChange={(e) =>
                      setConsentPublicDirectory(e.target.checked)
                    }
                    className="mt-1 accent-[#E53935]"
                  />
                  <span>
                    {lang === 'bn'
                      ? '১. ডিরেক্টরি প্রকাশনা সম্মতি: আমার রক্তের গ্রুপ, উপজেলা এবং আংশিক গোপন করা ফোন নম্বর ডিরেক্টরিতে প্রদর্শনে সম্মতি দিচ্ছি।'
                      : '1. Public Directory Consent: Display my blood group, Upazila, and masked phone in the directory.'}
                  </span>
                </label>

                <label className="flex items-start gap-2.5 rb-label-text text-[#475569] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentContactWorkflow}
                    onChange={(e) =>
                      setConsentContactWorkflow(e.target.checked)
                    }
                    className="mt-1 accent-[#E53935]"
                  />
                  <span>
                    {lang === 'bn'
                      ? '২. গোপনীয় যোগাযোগ ও প্রত্যাহার নীতিমালা: যাচাইকৃত জরুরি অনুরোধে যোগাযোগের সম্মতি দিচ্ছি। সম্মতি প্রত্যাহার করলে ভবিষ্যতের সকল যোগাযোগ তাৎক্ষণিক বন্ধ হবে (তবে পূর্বে অনুমোদিত অবস্থায় কেউ নম্বর সংরক্ষণ করে থাকলে তা প্রযুক্তিগতভাবে মুছে ফেলা সম্ভব নয়; তাই সমন্বয়কারী কলব্যাক পদ্ধতি ডিফল্ট রাখা হয়েছে)।'
                      : '2. Contact Mediation & Revocation Policy: I consent to verified emergency contact. Withdrawing consent immediately blocks all future reads (note: numbers already viewed/copied during a prior 24h Mode B window cannot be retroactively erased from a viewer device, which is why Mode A callback is default).'}
                  </span>
                </label>

                <label className="flex items-start gap-2.5 rb-label-text text-[#475569] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentVoluntaryNoPayment}
                    onChange={(e) =>
                      setConsentVoluntaryNoPayment(e.target.checked)
                    }
                    className="mt-1 accent-[#E53935]"
                  />
                  <span>
                    {lang === 'bn'
                      ? '৩. শতভাগ স্বেচ্ছাসেবী ও স্বাস্থ্যবিধি অঙ্গীকার: রক্তদানের বিনিময়ে কখনো আর্থিক লেনদেন করব না এবং হাসপাতালের ল্যাবে ক্রস-ম্যাচিং ছাড়া রক্ত সঞ্চালন হবে না।'
                      : '3. 100% Voluntary & Clinical Pledge: I will never request or accept payment for blood donation, and hospital lab cross-matching is mandatory.'}
                  </span>
                </label>
              </div>

              {submitMessage && (
                <div
                  role={submitMessage.type === 'error' ? 'alert' : 'status'}
                  className={`p-3.5 rounded-xl rb-label-text font-medium ${
                    submitMessage.type === 'error'
                      ? 'bg-red-50 border border-red-200 text-[#B71C1C]'
                      : 'bg-emerald-50 border border-emerald-200 text-[#16A34A]'
                  }`}
                >
                  {submitMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="rb-btn-transition rb-btn-text w-full py-3.5 px-5 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl shadow-2xs cursor-pointer"
              >
                {lang === 'bn'
                  ? 'রক্তদাতা হিসেবে নিবন্ধন করুন'
                  : 'Register as Demonstration Donor'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
