import React from 'react';
import {
  Language,
  BloodGroup,
  BargunaUpazilaId,
  EmergencyBloodRequest,
} from '../types/blood';
import { BARGUNA_UPAZILAS } from '../data/bargunaData';
import {
  ALL_BLOOD_GROUPS,
  BLOOD_COMPATIBILITY_MAP,
  validateEmergencyRequest,
  maskBangladeshPhone,
  toBnDigits,
} from '../utils/bloodLogic';
import {
  AlertTriangle,
  Zap,
  PlusCircle,
  CheckCircle2,
  Hospital,
} from 'lucide-react';

interface EmergencyRequestSectionProps {
  lang: Language;
  requests: EmergencyBloodRequest[];
  onAddRequest: (newReq: EmergencyBloodRequest) => void;
  onSelectGroupForSearch: (group: BloodGroup, upazila: BargunaUpazilaId) => void;
}

export const EmergencyRequestSection: React.FC<EmergencyRequestSectionProps> = ({
  lang,
  requests,
  onAddRequest,
  onSelectGroupForSearch,
}) => {
  const [patientName, setPatientName] = React.useState('');
  const [bloodGroup, setBloodGroup] = React.useState<BloodGroup>('O+');
  const [bagsNeeded, setBagsNeeded] = React.useState<number>(1);
  const [upazilaId, setUpazilaId] =
    React.useState<BargunaUpazilaId>('barguna-sadar');
  const [hospitalName, setHospitalName] = React.useState(
    'বরগুনা ২৫০ শয্যা জেনারেল হাসপাতাল'
  );
  const [urgency, setUrgency] = React.useState<
    'critical' | 'urgent' | 'scheduled'
  >('critical');
  const [reason, setReason] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);

  // Low-latency AI response state (gemini-3.1-flash-lite)
  const [fastTriageLoading, setFastTriageLoading] = React.useState(false);
  const [fastTriageOutput, setFastTriageOutput] = React.useState<string | null>(
    null
  );
  const [fastTriageLatencyMs, setFastTriageLatencyMs] = React.useState<
    number | null
  >(null);

  const handleUpazilaChange = (newUpazila: BargunaUpazilaId) => {
    setUpazilaId(newUpazila);
    const info = BARGUNA_UPAZILAS.find((u) => u.id === newUpazila);
    if (info) {
      setHospitalName(
        lang === 'bn' ? info.primaryHospitalBn : info.primaryHospitalEn
      );
    }
  };

  const triggerFastAiTriage = async (
    targetGroup: BloodGroup,
    targetUpazila: BargunaUpazilaId,
    targetBags: number,
    targetCondition: string
  ) => {
    if (fastTriageLoading) return;
    setFastTriageLoading(true);
    const startTime = performance.now();
    try {
      const uInfo = BARGUNA_UPAZILAS.find((u) => u.id === targetUpazila);
      const response = await fetch('/api/ai/fast-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: targetGroup,
          upazila: lang === 'bn' ? uInfo?.nameBn : uInfo?.nameEn,
          bags: targetBags,
          condition:
            targetCondition ||
            (lang === 'bn' ? 'জরুরি রক্তের প্রয়োজন' : 'Urgent transfusion'),
          lang,
        }),
      });
      const data = await response.json();
      const elapsed = Math.round(performance.now() - startTime);
      setFastTriageLatencyMs(elapsed);
      if (data.guidance) {
        setFastTriageOutput(data.guidance);
      } else if (data.fallbackGuidance) {
        setFastTriageOutput(data.fallbackGuidance);
      } else {
        setFastTriageOutput(
          lang === 'bn'
            ? `গ্রহণযোগ্য গ্রুপ: ${BLOOD_COMPATIBILITY_MAP[
                targetGroup
              ].canReceiveFrom.join(
                ', '
              )}। দ্রুত হাসপাতালের ব্লাড ব্যাংকে ক্রস-ম্যাচিং সম্পন্ন করুন।`
            : `Compatible groups: ${BLOOD_COMPATIBILITY_MAP[
                targetGroup
              ].canReceiveFrom.join(
                ', '
              )}. Complete cross-matching at the hospital lab prior to transfusion.`
        );
      }
    } catch {
      const elapsed = Math.round(performance.now() - startTime);
      setFastTriageLatencyMs(elapsed);
      setFastTriageOutput(
        lang === 'bn'
          ? `গ্রহণযোগ্য গ্রুপ: ${BLOOD_COMPATIBILITY_MAP[
              targetGroup
            ].canReceiveFrom.join(
              ', '
            )}। দ্রুত হাসপাতালের ব্লাড ব্যাংকে ক্রস-ম্যাচিং সম্পন্ন করুন।`
          : `Compatible groups: ${BLOOD_COMPATIBILITY_MAP[
              targetGroup
            ].canReceiveFrom.join(
              ', '
            )}. Complete cross-matching at the hospital lab prior to transfusion.`
      );
    } finally {
      setFastTriageLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validation = validateEmergencyRequest({
      patientName,
      bloodGroup,
      bagsNeeded,
      upazilaId,
      hospitalName,
      contactPhone,
    });

    if (!validation.valid) {
      setFormError(lang === 'bn' ? validation.errorBn! : validation.errorEn!);
      return;
    }

    const newReq: EmergencyBloodRequest = {
      id: `req-${Date.now()}`,
      patientName: patientName.trim(),
      bloodGroup,
      bagsNeeded,
      upazilaId,
      hospitalName: hospitalName.trim(),
      urgency,
      reasonBn:
        reason.trim() || 'জরুরি চিকিৎসার জন্য রক্তের প্রয়োজন (নমুনা অনুরোধ)',
      reasonEn:
        reason.trim() || 'Urgent medical requirement (User submitted demo)',
      contactPhone: maskBangladeshPhone(contactPhone.trim(), lang),
      postedTimeBn: 'এইমাত্র যুক্ত (নমুনা প্রিভিউ)',
      postedTimeEn: 'Just posted (Session Preview)',
      isDemoRecord: true,
    };

    onAddRequest(newReq);
    setFormSuccess(
      lang === 'bn'
        ? 'আপনার জরুরি রক্তের অনুরোধটি সফলভাবে নমুনা বোর্ডে যুক্ত হয়েছে এবং নিচে তাৎক্ষণিক পরামর্শ তৈরি হচ্ছে।'
        : 'Your emergency blood request has been added to the demonstration board and instant AI triage guidance is being generated.'
    );
    triggerFastAiTriage(bloodGroup, upazilaId, bagsNeeded, reason);
    setPatientName('');
    setReason('');
    setContactPhone('');
  };

  const getUpazilaLabel = (id: BargunaUpazilaId) => {
    const found = BARGUNA_UPAZILAS.find((u) => u.id === id);
    if (!found) return id;
    return lang === 'bn' ? found.nameBn : found.nameEn;
  };

  return (
    <section
      id="emergency-request"
      className="py-14 lg:py-20 bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="rb-support-text font-semibold text-[#E53935]">
            {lang === 'bn'
              ? '০২. জরুরি রক্তের অনুরোধ ও তাৎক্ষণিক স্বাস্থ্য পরামর্শ'
              : '02. Emergency Blood Requests & Low-Latency AI Triage'}
          </div>
          <h2 className="rb-section-heading mt-1 text-balance">
            {lang === 'bn'
              ? 'মুমূর্ষু রোগীর জন্য দ্রুত রক্তের অনুরোধ ও রক্তদাতা সমন্বয়'
              : 'Rapid Emergency Blood Request & Donor Coordination'}
          </h2>
          <p className="rb-body-text mt-2.5 max-w-3xl">
            {lang === 'bn'
              ? 'হাসপাতালে ভর্তি রোগীর জরুরি রক্তের প্রয়োজন হলে নিচের ফর্মটি পূরণ করে অনুরোধ জমা দিন অথবা বিকল্প রক্তের গ্রুপ ও করণীয় জানতে তাৎক্ষণিক পরামর্শ দেখুন।'
              : 'Submit an urgent blood request for Barguna District hospitals or trigger low-latency emergency triage powered by gemini-3.1-flash-lite.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Active Emergency Requests Board + Low-Latency Triage Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <h3 className="rb-subsection-heading font-bold text-[#1E293B]">
                {lang === 'bn'
                  ? 'চলমান জরুরি রক্তের অনুরোধ বোর্ড (নমুনা)'
                  : 'Active Emergency Blood Requests Board (Demo)'}
              </h3>
              <span className="rb-label-text font-semibold text-[#64748B]">
                {lang === 'bn'
                  ? `মোট ${toBnDigits(requests.length)}টি অনুরোধ`
                  : `${requests.length} Active Request(s)`}
              </span>
            </div>

            <div className="space-y-4">
              {requests.map((req) => (
                <article
                  key={req.id}
                  className="rb-card-hover p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#E53935] text-white flex flex-col items-center justify-center shrink-0 shadow-2xs px-1">
                      <span className="rb-card-heading font-bold font-mono-num text-white">
                        {req.bloodGroup}
                      </span>
                      <span className="rb-label-text font-medium tabular-nums text-white">
                        {lang === 'bn'
                          ? `${toBnDigits(req.bagsNeeded)} ব্যাগ`
                          : `${req.bagsNeeded} Bag(s)`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 rb-label-text">
                        <span className="font-bold text-[#B71C1C] inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {req.urgency === 'critical'
                            ? lang === 'bn'
                              ? 'অতি জরুরি'
                              : 'Critical Emergency'
                            : lang === 'bn'
                            ? 'জরুরি প্রয়োজন'
                            : 'Urgent Need'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#1E293B] font-semibold">
                          {getUpazilaLabel(req.upazilaId)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#64748B]">
                          {lang === 'bn' ? req.postedTimeBn : req.postedTimeEn}
                        </span>
                      </div>

                      <h4 className="rb-card-heading font-bold text-[#1E293B]">
                        {req.patientName}
                      </h4>

                      <p className="rb-support-text text-[#475569] flex items-center gap-1.5">
                        <Hospital className="w-4 h-4 text-[#64748B] shrink-0" />
                        <span>{req.hospitalName}</span>
                      </p>

                      <p className="rb-label-text text-[#475569]">
                        {lang === 'bn' ? req.reasonBn : req.reasonEn} ·{' '}
                        <span className="font-mono-num font-semibold text-[#1E293B]">
                          {req.contactPhone}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectGroupForSearch(req.bloodGroup, req.upazilaId);
                        const el = document.getElementById('find-donor');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="rb-btn-transition rb-btn-text px-4 py-2.5 text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl whitespace-nowrap cursor-pointer"
                    >
                      {lang === 'bn'
                        ? 'বিস্তারিত দেখুন'
                        : 'Find Matching Donors'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        triggerFastAiTriage(
                          req.bloodGroup,
                          req.upazilaId,
                          req.bagsNeeded,
                          lang === 'bn' ? req.reasonBn : req.reasonEn
                        )
                      }
                      className="rb-btn-transition rb-label-text font-semibold px-3.5 py-2 text-[#B71C1C] bg-white hover:bg-red-50 border border-slate-200 rounded-xl inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#E53935]" />
                      <span>
                        {lang === 'bn' ? 'তাৎক্ষণিক পরামর্শ' : 'Instant AI Triage'}
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Low-Latency Response Box (gemini-3.1-flash-lite) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#E53935]" />
                  <h4 className="rb-support-text font-bold text-[#1E293B]">
                    {lang === 'bn'
                      ? 'তাৎক্ষণিক জরুরি রক্ত সহায়তা নির্দেশিকা (এআই ট্রায়াজ)'
                      : 'Low-Latency Emergency Blood Triage'}
                  </h4>
                </div>
                {fastTriageLatencyMs !== null && (
                  <span className="rb-label-text text-[#64748B]">
                    {lang === 'bn'
                      ? `${toBnDigits(fastTriageLatencyMs)} মি.সে. · তাৎক্ষণিক নির্দেশনা`
                      : `${fastTriageLatencyMs} ms · Instant Triage`}
                  </span>
                )}
              </div>

              {fastTriageLoading ? (
                <div className="space-y-2 py-2" role="status" aria-live="polite">
                  <p className="rb-label-text font-medium text-[#475569]">
                    {lang === 'bn'
                      ? 'তাৎক্ষণিক জরুরি নির্দেশনা প্রস্তুত হচ্ছে...'
                      : 'Generating low-latency emergency response via gemini-3.1-flash-lite...'}
                  </p>
                  <div className="h-3 w-3/4 bg-slate-200/80 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-200/80 rounded animate-pulse" />
                </div>
              ) : fastTriageOutput ? (
                <div className="rb-support-text text-[#1E293B] whitespace-pre-line bg-white p-4 rounded-xl border border-slate-200 mt-2">
                  {fastTriageOutput}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                  <p className="rb-support-text text-[#475569]">
                    {lang === 'bn'
                      ? 'উপরের যেকোনো অনুরোধের “তাৎক্ষণিক পরামর্শ” বাটনে ক্লিক করে জরুরি মুহূর্তে করণীয় ও বিকল্প রক্তের গ্রুপ জেনে নিন।'
                      : 'Click "Instant AI Triage" on any request above or test a fast response below.'}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      triggerFastAiTriage(
                        bloodGroup,
                        upazilaId,
                        bagsNeeded,
                        lang === 'bn'
                          ? 'জরুরি রক্ত সঞ্চালন'
                          : 'Emergency transfusion'
                      )
                    }
                    className="rb-btn-transition rb-btn-text px-4 py-2.5 text-white bg-[#E53935] hover:bg-[#B71C1C] rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === 'bn'
                      ? 'দ্রুত পরামর্শ দেখুন'
                      : 'Get Instant Triage Advice'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Emergency Request Submission Form */}
          <div className="lg:col-span-5 bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
              <PlusCircle className="w-5 h-5 text-[#E53935]" />
              <h3 className="rb-subsection-heading font-bold text-[#1E293B]">
                {lang === 'bn'
                  ? 'নতুন জরুরি রক্তের অনুরোধ পাঠান'
                  : 'Post a New Emergency Blood Request'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="req-patient-name"
                  className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                >
                  {lang === 'bn'
                    ? 'রোগীর নাম ও সংক্ষিপ্ত বিবরণ *'
                    : 'Patient Name / Description *'}
                </label>
                <input
                  id="req-patient-name"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'যেমন: আব্দুল করিম (জরুরি অস্ত্রোপচার / থ্যালাসেমিয়া)'
                      : 'e.g. Abdul Karim (Surgery / Thalassemia)'
                  }
                  className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="req-blood-group"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn' ? 'রক্তের গ্রুপ *' : 'Blood Group *'}
                  </label>
                  <select
                    id="req-blood-group"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] font-bold focus:outline-none focus:border-[#E53935]"
                  >
                    {ALL_BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="req-bags"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn' ? 'রক্তের পরিমাণ (ব্যাগ) *' : 'Bags Needed *'}
                  </label>
                  <input
                    id="req-bags"
                    type="number"
                    min={1}
                    max={10}
                    value={bagsNeeded}
                    onChange={(e) => setBagsNeeded(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] font-mono-num focus:outline-none focus:border-[#E53935]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="req-upazila"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn' ? 'উপজেলা (বরগুনা) *' : 'Upazila (Barguna) *'}
                  </label>
                  <select
                    id="req-upazila"
                    value={upazilaId}
                    onChange={(e) =>
                      handleUpazilaChange(e.target.value as BargunaUpazilaId)
                    }
                    className="w-full px-3 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
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
                    htmlFor="req-urgency"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                  >
                    {lang === 'bn' ? 'জরুরি মাত্রা' : 'Urgency Level'}
                  </label>
                  <select
                    id="req-urgency"
                    value={urgency}
                    onChange={(e) =>
                      setUrgency(
                        e.target.value as 'critical' | 'urgent' | 'scheduled'
                      )
                    }
                    className="w-full px-3 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                  >
                    <option value="critical">
                      {lang === 'bn'
                        ? 'অতি জরুরি (আজই প্রয়োজন)'
                        : 'Critical (Needed Today)'}
                    </option>
                    <option value="urgent">
                      {lang === 'bn'
                        ? 'জরুরি (২৪ ঘণ্টার মধ্যে)'
                        : 'Urgent (Within 24h)'}
                    </option>
                    <option value="scheduled">
                      {lang === 'bn'
                        ? 'নির্ধারিত অস্ত্রোপচার'
                        : 'Scheduled Procedure'}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="req-hospital"
                  className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                >
                  {lang === 'bn'
                    ? 'হাসপাতাল বা ক্লিনিকের নাম *'
                    : 'Hospital / Clinic Name *'}
                </label>
                <input
                  id="req-hospital"
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                />
              </div>

              <div>
                <label
                  htmlFor="req-phone"
                  className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                >
                  {lang === 'bn'
                    ? 'রোগীর স্বজনের মোবাইল নম্বর (১১ ডিজিট) *'
                    : 'Attendant Mobile Number (11-digit BD) *'}
                </label>
                <input
                  id="req-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] font-mono-num focus:outline-none focus:border-[#E53935]"
                />
              </div>

              <div>
                <label
                  htmlFor="req-reason"
                  className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                >
                  {lang === 'bn'
                    ? 'রোগীর শারীরিক অবস্থা ও অতিরিক্ত তথ্য (ঐচ্ছিক)'
                    : 'Medical Reason & Notes (Optional)'}
                </label>
                <input
                  id="req-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'যেমন: হিমোগ্লোবিন ৬.৫, জরুরি প্রসূতি অস্ত্রোপচার'
                      : 'e.g. Hemoglobin 6.5 g/dL, C-section'
                  }
                  className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                />
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 rb-label-text font-medium text-[#B71C1C]"
                >
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 rb-label-text font-medium text-[#16A34A] flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="rb-btn-transition rb-btn-text w-full py-3.5 px-5 bg-[#E53935] hover:bg-[#B71C1C] text-white rounded-xl shadow-2xs cursor-pointer"
              >
                {lang === 'bn'
                  ? 'অনুরোধ জমা দিন'
                  : 'Submit Emergency Request (Demo)'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
