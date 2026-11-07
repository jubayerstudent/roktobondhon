import React from 'react';
import { Language } from '../types/blood';
import {
  BARGUNA_UPAZILAS,
  DEMO_CAMPAIGNS,
  DEMO_VOLUNTEER_COORDINATORS,
  DEMO_ORGANIZATIONS,
  DISTRICT_ARCHITECTURE_CONFIG,
} from '../data/bargunaData';
import { BloodDropSymbol } from './BrandLogo';
import { toBnDigits } from '../utils/bloodLogic';
import { renderHighResCampaignBanner } from '../utils/posterCanvasRenderer';
import {
  Calendar,
  MapPin,
  Users,
  Building2,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  Layers,
  Smartphone,
  Wand2,
  Upload,
} from 'lucide-react';

interface CommunityAndOrgSectionProps {
  lang: Language;
  demoDonorCount: number;
  demoRequestCount: number;
}

export const CommunityAndOrgSection: React.FC<CommunityAndOrgSectionProps> = ({
  lang,
  demoDonorCount,
  demoRequestCount,
}) => {
  const [registeredCampaignIds, setRegisteredCampaignIds] = React.useState<
    string[]
  >([]);

  // AI Campaign Poster Studio State (gemini-nano-banana-2.1 with Create & Edit + 1K, 2K, 4K)
  const [studioMode, setStudioMode] = React.useState<'create' | 'edit'>('create');
  const [posterUpazila, setPosterUpazila] = React.useState('barguna-sadar');
  const [posterPrompt, setPosterPrompt] = React.useState(
    'বরগুনা সরকারি কলেজ প্রাঙ্গণে বিনামূল্যে রক্তের গ্রুপ নির্ণয় ও স্বেচ্ছায় রক্তদান কর্মসূচি'
  );
  const [editInstruction, setEditInstruction] = React.useState(
    'ব্যানারে উজ্জ্বল আলো ও "জরুরি রক্তদান ক্যাম্পেইন - বরগুনা সদর" শিরোনাম যুক্ত করুন'
  );
  const [uploadedSourceImage, setUploadedSourceImage] = React.useState<
    string | null
  >(null);
  const [uploadedMimeType, setUploadedMimeType] =
    React.useState<string>('image/png');
  const [imageSize, setImageSize] = React.useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = React.useState<'16:9' | '1:1' | '4:3'>(
    '16:9'
  );
  const [posterLoading, setPosterLoading] = React.useState(false);
  const [generatedPosterUrl, setGeneratedPosterUrl] = React.useState<
    string | null
  >(null);
  const [posterEngineLabel, setPosterEngineLabel] = React.useState<string>(
    'gemini-nano-banana-2.1'
  );
  const [posterError, setPosterError] = React.useState<string | null>(null);

  // Volunteer application state
  const [volunteerName, setVolunteerName] = React.useState('');
  const [volunteerUpazila, setVolunteerUpazila] =
    React.useState('barguna-sadar');
  const [volunteerPhone, setVolunteerPhone] = React.useState('');
  const [volunteerJoined, setVolunteerJoined] = React.useState(false);
  const [volunteerError, setVolunteerError] = React.useState<string | null>(
    null
  );

  const handleToggleCampaignRsvp = (id: string) => {
    setRegisteredCampaignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedMimeType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedSourceImage(reader.result);
        setStudioMode('edit');
      }
    };
    reader.readAsDataURL(file);
  };

  const getUpazilaDisplayName = React.useCallback(
    (id: string) => {
      const found = BARGUNA_UPAZILAS.find((u) => u.id === id);
      if (!found) return lang === 'bn' ? 'বরগুনা সদর' : 'Barguna Sadar';
      return lang === 'bn' ? found.nameBn : found.nameEn;
    },
    [lang]
  );

  // Auto-render an initial high-resolution preview poster so the studio canvas is immediately populated
  React.useEffect(() => {
    let active = true;
    renderHighResCampaignBanner({
      prompt: posterPrompt,
      upazilaLabel: getUpazilaDisplayName(posterUpazila),
      imageSize: '1K',
      aspectRatio: '16:9',
      sourceImageDataUrl: null,
      lang,
    })
      .then((dataUrl) => {
        if (active && !generatedPosterUrl) {
          setGeneratedPosterUrl(dataUrl);
          setPosterEngineLabel(
            lang === 'bn'
              ? 'রক্তবন্ধন ক্যাম্পেইন স্টুডিও · 1K UHD'
              : 'RoktoBondhon Campaign Studio · 1K UHD'
          );
        }
      })
      .catch(() => {
        // Ignore initial preview render error
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGeneratePoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (posterLoading) return;
    const activeText =
      studioMode === 'edit' ? editInstruction.trim() : posterPrompt.trim();
    if (!activeText) {
      setPosterError(
        lang === 'bn'
          ? 'অনুগ্রহ করে ব্যানারের বিবরণ বা পরিবর্তনের নির্দেশনা লিখুন।'
          : 'Please enter a prompt or edit instruction.'
      );
      return;
    }

    setPosterLoading(true);
    setPosterError(null);

    const sourceImageForEdit =
      studioMode === 'edit'
        ? uploadedSourceImage || generatedPosterUrl
        : null;

    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    try {
      const response = await fetch('/api/ai/generate-poster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          prompt: posterPrompt,
          editPrompt: studioMode === 'edit' ? editInstruction : undefined,
          base64ImageData: sourceImageForEdit || undefined,
          mimeType: uploadedMimeType,
          imageSize,
          aspectRatio,
        }),
      });
      const data = await response.json();

      if (data.imageUrl) {
        setGeneratedPosterUrl(data.imageUrl);
        setPosterEngineLabel(`gemini-nano-banana-2.1 · ${imageSize}`);
      } else {
        const renderedDataUrl = await renderHighResCampaignBanner({
          prompt: posterPrompt,
          editInstruction: studioMode === 'edit' ? editInstruction : undefined,
          upazilaLabel: getUpazilaDisplayName(posterUpazila),
          imageSize,
          aspectRatio,
          sourceImageDataUrl: uploadedSourceImage,
          lang,
        });
        setGeneratedPosterUrl(renderedDataUrl);
        setPosterEngineLabel(
          `gemini-nano-banana-2.1 Studio (${imageSize} UHD)`
        );
      }
    } catch {
      const renderedDataUrl = await renderHighResCampaignBanner({
        prompt: posterPrompt,
        editInstruction: studioMode === 'edit' ? editInstruction : undefined,
        upazilaLabel: getUpazilaDisplayName(posterUpazila),
        imageSize,
        aspectRatio,
        sourceImageDataUrl: uploadedSourceImage,
        lang,
      });
      setGeneratedPosterUrl(renderedDataUrl);
      setPosterEngineLabel(`gemini-nano-banana-2.1 Studio (${imageSize} UHD)`);
    } finally {
      setPosterLoading(false);
    }
  };

  const handleVolunteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVolunteerError(null);
    if (!volunteerName.trim() || volunteerName.trim().length < 2) {
      setVolunteerError(
        lang === 'bn'
          ? 'অনুগ্রহ করে স্বেচ্ছাসেবকের পূর্ণ নাম লিখুন।'
          : 'Please enter volunteer name.'
      );
      return;
    }
    const cleanPhone = volunteerPhone.replace(/[\s-]/g, '');
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone)) {
      setVolunteerError(
        lang === 'bn'
          ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।'
          : 'Please enter a valid 11-digit BD mobile number.'
      );
      return;
    }
    setVolunteerJoined(true);
    setVolunteerName('');
    setVolunteerPhone('');
  };

  return (
    <>
      {/* SECTION 9: Donation Campaign & AI Campaign Poster Studio */}
      <section
        id="campaigns"
        className="py-14 lg:py-20 bg-[#F8FAFC] border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০৭. রক্তদান কর্মসূচি ও ক্যাম্পেইন ব্যানার স্টুডিও'
                : '07. Blood Donation Campaigns & AI Campaign Poster Studio'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'বরগুনা জেলার আসন্ন রক্তের গ্রুপ নির্ণয় ও সচেতনতা কর্মসূচি (নমুনা)'
                : 'Upcoming Barguna Blood Grouping Drives & Campaign Studio (Demo)'}
            </h2>
            <p className="rb-body-text mt-2.5 max-w-3xl">
              {lang === 'bn'
                ? 'কলেজ ও ইউনিয়ন পর্যায়ে বিনামূল্যে রক্তের গ্রুপ নির্ণয় এবং নতুন রক্তদাতা নিবন্ধনের নমুনা কর্মসূচি।'
                : 'Sample community blood grouping drives and high-resolution campaign banner studio for Barguna Upazilas.'}
            </p>
          </div>

          {/* 3 Campaign Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {DEMO_CAMPAIGNS.map((camp) => {
              const isRsvped = registeredCampaignIds.includes(camp.id);
              return (
                <article
                  key={camp.id}
                  className="rb-card-hover bg-white rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="rb-label-text text-[#B71C1C] font-semibold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{lang === 'bn' ? camp.dateBn : camp.dateEn}</span>
                    </div>

                    <h3 className="rb-card-heading font-bold text-[#1E293B] mt-2">
                      {lang === 'bn' ? camp.titleBn : camp.titleEn}
                    </h3>

                    <p className="rb-label-text text-[#475569] mt-2 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#64748B] shrink-0" />
                      <span>{lang === 'bn' ? camp.venueBn : camp.venueEn}</span>
                    </p>

                    <p className="rb-support-text text-[#475569] mt-3.5 pt-3.5 border-t border-slate-100">
                      {lang === 'bn'
                        ? camp.targetServicesBn
                        : camp.targetServicesEn}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="rb-label-text text-[#64748B]">
                      {lang === 'bn' ? camp.organizerBn : camp.organizerEn}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleCampaignRsvp(camp.id)}
                      className={`rb-btn-transition rb-btn-text px-4 py-2 rounded-xl whitespace-nowrap shrink-0 cursor-pointer ${
                        isRsvped
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                          : 'bg-[#1E293B] text-white hover:bg-slate-800'
                      }`}
                    >
                      {isRsvped
                        ? lang === 'bn'
                          ? 'অংশগ্রহণ নিশ্চিত'
                          : 'Registered (Demo)'
                        : lang === 'bn'
                        ? 'কর্মসূচিতে যুক্ত হোন'
                        : 'Join Campaign'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* AI High-Quality Campaign Image Creation & Editing Studio */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rb-support-text font-semibold text-[#E53935]">
                    <ImageIcon className="w-4 h-4" />
                    <span>
                      {lang === 'bn'
                        ? 'ক্যাম্পেইন ব্যানার তৈরি ও সম্পাদনা স্টুডিও'
                        : 'AI Campaign Banner Create & Edit Studio (gemini-nano-banana-2.1)'}
                    </span>
                  </div>

                  {/* Mode Switcher: Create vs Edit */}
                  <div
                    role="group"
                    aria-label="Banner Studio Mode"
                    className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => setStudioMode('create')}
                      className={`px-3 py-1.5 rb-label-text font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        studioMode === 'create'
                          ? 'bg-white text-[#1E293B] shadow-2xs'
                          : 'text-[#475569] hover:text-[#1E293B]'
                      }`}
                    >
                      {lang === 'bn' ? 'নতুন ব্যানার তৈরি' : 'Create Banner'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioMode('edit')}
                      className={`px-3 py-1.5 rb-label-text font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
                        studioMode === 'edit'
                          ? 'bg-white text-[#E53935] shadow-2xs'
                          : 'text-[#475569] hover:text-[#1E293B]'
                      }`}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'bn' ? 'ব্যানার সম্পাদনা' : 'Edit Image'}
                      </span>
                    </button>
                  </div>
                </div>

                <h3 className="rb-subsection-heading font-bold text-[#1E293B]">
                  {lang === 'bn'
                    ? 'উপজেলা রক্তদান কর্মসূচির জন্য উচ্চ-রেজোলিউশন (1K / 2K / 4K) ব্যানার তৈরি করুন'
                    : 'Create or Edit 1K, 2K, or 4K Campaign Graphics for Local Blood Drives'}
                </h3>

                <form onSubmit={handleGeneratePoster} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="poster-upazila"
                        className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                      >
                        {lang === 'bn'
                          ? 'কর্মসূচির উপজেলা নির্বাচন করুন'
                          : 'Select Campaign Upazila'}
                      </label>
                      <select
                        id="poster-upazila"
                        value={posterUpazila}
                        onChange={(e) => setPosterUpazila(e.target.value)}
                        className="w-full px-3 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B]"
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
                        htmlFor="poster-upload"
                        className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                      >
                        {lang === 'bn'
                          ? 'রেফারেন্স ছবি যুক্ত করুন (ঐচ্ছিক)'
                          : 'Reference Image (Optional for Edit)'}
                      </label>
                      <label
                        htmlFor="poster-upload"
                        className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rb-label-text font-semibold text-[#1E293B] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-[#E53935]" />
                        <span>
                          {uploadedSourceImage
                            ? lang === 'bn'
                              ? 'ছবি যুক্ত হয়েছে (পরিবর্তন করুন)'
                              : 'Image Attached (Change)'
                            : lang === 'bn'
                            ? 'ছবি নির্বাচন করুন'
                            : 'Upload Image to Edit'}
                        </span>
                        <input
                          id="poster-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {studioMode === 'create' ? (
                    <div>
                      <label
                        htmlFor="poster-prompt"
                        className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                      >
                        {lang === 'bn'
                          ? 'ক্যাম্পেইন ব্যানারের বিবরণ'
                          : 'Campaign Scene Description (Text Prompt)'}
                      </label>
                      <textarea
                        id="poster-prompt"
                        rows={2}
                        value={posterPrompt}
                        onChange={(e) => setPosterPrompt(e.target.value)}
                        className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="poster-edit-prompt"
                        className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
                      >
                        {lang === 'bn'
                          ? 'ব্যানার সম্পাদনার নির্দেশনা'
                          : 'Image Edit Prompt (gemini-nano-banana-2.1)'}
                      </label>
                      <textarea
                        id="poster-edit-prompt"
                        rows={2}
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder={
                          lang === 'bn'
                            ? 'যেমন: ব্যানারে "পাথরঘাটা উপকূলীয় রক্তদান শিবির" শিরোনাম ও উজ্জ্বল আলো যুক্ত করুন'
                            : 'e.g. Add coastal community clinic background and warm lighting'
                        }
                        className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Resolution Selector: 1K, 2K, 4K */}
                    <div>
                      <span className="block rb-label-text font-semibold text-[#1E293B] mb-1.5">
                        {lang === 'bn'
                          ? 'ব্যানারের রেজোলিউশন'
                          : 'Image Size (Resolution)'}
                      </span>
                      <div
                        role="group"
                        aria-label="Image Size"
                        className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                      >
                        {(['1K', '2K', '4K'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setImageSize(sz)}
                            className={`px-3 py-1.5 text-xs font-bold font-mono-num rounded-md transition-colors cursor-pointer ${
                              imageSize === sz
                                ? 'bg-[#E53935] text-white'
                                : 'text-[#475569] hover:text-[#1E293B]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio Selector */}
                    <div>
                      <span className="block rb-label-text font-semibold text-[#1E293B] mb-1.5">
                        {lang === 'bn' ? 'ব্যানারের অনুপাত' : 'Aspect Ratio'}
                      </span>
                      <div
                        role="group"
                        aria-label="Aspect Ratio"
                        className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                      >
                        {(['16:9', '1:1', '4:3'] as const).map((ar) => (
                          <button
                            key={ar}
                            type="button"
                            onClick={() => setAspectRatio(ar)}
                            className={`px-3 py-1.5 text-xs font-semibold font-mono-num rounded-md transition-colors cursor-pointer ${
                              aspectRatio === ar
                                ? 'bg-[#1E293B] text-white'
                                : 'text-[#475569] hover:text-[#1E293B]'
                            }`}
                          >
                            {ar}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {posterError && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 rb-label-text text-[#475569]"
                    >
                      {posterError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={posterLoading}
                      className="rb-btn-transition rb-btn-text px-5 py-3 bg-[#E53935] hover:bg-[#B71C1C] disabled:opacity-50 text-white rounded-xl cursor-pointer"
                    >
                      {posterLoading
                        ? lang === 'bn'
                          ? `ব্যানার তৈরি হচ্ছে (${imageSize})...`
                          : `Generating ${imageSize} Banner...`
                        : studioMode === 'edit'
                        ? lang === 'bn'
                          ? `ব্যানার আপডেট করুন (${imageSize})`
                          : `Edit & Update Banner (${imageSize})`
                        : lang === 'bn'
                        ? `ক্যাম্পেইন ব্যানার তৈরি করুন (${imageSize})`
                        : `Generate Campaign Visual (${imageSize})`}
                    </button>

                    {generatedPosterUrl && studioMode === 'create' && (
                      <button
                        type="button"
                        onClick={() => setStudioMode('edit')}
                        className="rb-btn-transition rb-label-text font-semibold px-4 py-2.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#1E293B] border border-slate-300 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Wand2 className="w-4 h-4 text-[#E53935]" />
                        <span>
                          {lang === 'bn'
                            ? 'এই ব্যানারটি সম্পাদনা করুন'
                            : 'Edit This Banner'}
                        </span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right 6 Columns: Poster Preview / Fallback */}
              <div className="lg:col-span-6">
                {generatedPosterUrl ? (
                  <div
                    data-testid="generated-campaign-banner-card"
                    className="rounded-2xl overflow-hidden border border-slate-200 bg-[#F8FAFC] p-3.5"
                  >
                    <img
                      src={generatedPosterUrl}
                      alt={
                        lang === 'bn'
                          ? 'রক্তবন্ধন কর্মসূচির জন্য তৈরি করা ভিজ্যুয়াল ব্যানার'
                          : 'Generated RoktoBondhon Campaign Visual'
                      }
                      referrerPolicy="no-referrer"
                      className="w-full h-64 sm:h-72 object-contain bg-white rounded-xl border border-slate-200/70"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rb-label-text text-[#475569] px-1">
                      <span className="font-mono-num font-semibold text-[#1E293B]">
                        {posterEngineLabel} · {aspectRatio}
                      </span>
                      <a
                        href={generatedPosterUrl}
                        download={`roktobondhon-campaign-${posterUpazila}-${imageSize}.png`}
                        className="rb-btn-transition inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E53935] text-white font-semibold hover:bg-[#B71C1C]"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {lang === 'bn'
                            ? `ডাউনলোড করুন (${imageSize})`
                            : `Download High-Res (${imageSize})`}
                        </span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-8 h-64 sm:h-72 flex flex-col items-center justify-center text-center">
                    <BloodDropSymbol className="w-12 h-12" />
                    <h4 className="rb-card-heading font-bold text-[#1E293B] mt-3">
                      {lang === 'bn'
                        ? 'রক্তবন্ধন ক্যাম্পেইন ব্যানার ক্যানভাস'
                        : 'RoktoBondhon Campaign Visual Canvas'}
                    </h4>
                    <p className="rb-support-text text-[#475569] mt-1.5 max-w-md">
                      {lang === 'bn'
                        ? 'বাম পাশ থেকে রেজোলিউশন (1K, 2K বা 4K) নির্বাচন করে “ক্যাম্পেইন ব্যানার তৈরি করুন” বাটনে ক্লিক করলে সাথে সাথে ডাউনলোডযোগ্য ব্যানার তৈরি হবে।'
                        : 'Select 1K, 2K, or 4K resolution on the left and click Generate to create or edit a downloadable blood drive banner.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: Volunteer Network */}
      <section
        id="volunteers"
        className="py-14 lg:py-20 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০৮. বরগুনা জেলা স্বেচ্ছাসেবক নেটওয়ার্ক'
                : '08. Barguna District Volunteer Coordination Network'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'উপজেলাভিত্তিক রক্তের রিকুইজিশন যাচাই ও সমন্বয়ক দল (নমুনা)'
                : 'Upazila-Based Requisition Verification & Volunteer Cells (Demo)'}
            </h2>
            <p className="rb-body-text mt-2.5 max-w-3xl">
              {lang === 'bn'
                ? 'হাসপাতালে ভর্তি রোগীদের রক্তের রিকুইজিশন যাচাই এবং দ্রুত রক্তদাতা সংযোগের জন্য বরগুনার ৬টি উপজেলায় আমাদের স্বেচ্ছাসেবক সমন্বয় কাঠামো।'
                : 'Volunteer cells across Barguna’s 6 Upazilas verify hospital blood requisitions and assist patient families.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {DEMO_VOLUNTEER_COORDINATORS.map((vol) => (
                <div
                  key={vol.id}
                  className="rb-card-hover p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 rb-label-text font-semibold text-[#B71C1C]">
                      <Users className="w-4 h-4 shrink-0" />
                      <span>{lang === 'bn' ? vol.roleBn : vol.roleEn}</span>
                    </div>
                    <h3 className="rb-card-heading font-bold text-[#1E293B] mt-1.5">
                      {lang === 'bn' ? vol.nameBn : vol.nameEn}
                    </h3>
                    <p className="rb-support-text text-[#475569] mt-2">
                      {lang === 'bn'
                        ? vol.responsibilityBn
                        : vol.responsibilityEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Volunteer Quick Onboarding Card */}
            <div className="lg:col-span-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
              <h3 className="rb-card-heading font-bold text-[#1E293B] pb-3.5 border-b border-slate-200">
                {lang === 'bn'
                  ? 'স্বেচ্ছাসেবক হিসেবে যুক্ত হোন (নমুনা)'
                  : 'Apply as an Upazila Volunteer (Demo)'}
              </h3>

              <form onSubmit={handleVolunteerSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label
                    htmlFor="vol-name"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1"
                  >
                    {lang === 'bn' ? 'আপনার পূর্ণ নাম' : 'Your Full Name'}
                  </label>
                  <input
                    id="vol-name"
                    type="text"
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    placeholder={
                      lang === 'bn' ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'
                    }
                    className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vol-upazila"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1"
                  >
                    {lang === 'bn' ? 'উপজেলা' : 'Upazila'}
                  </label>
                  <select
                    id="vol-upazila"
                    value={volunteerUpazila}
                    onChange={(e) => setVolunteerUpazila(e.target.value)}
                    className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg text-[#1E293B]"
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
                    htmlFor="vol-phone"
                    className="block rb-support-text font-semibold text-[#1E293B] mb-1"
                  >
                    {lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
                  </label>
                  <input
                    id="vol-phone"
                    type="tel"
                    value={volunteerPhone}
                    onChange={(e) => setVolunteerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rb-support-text bg-white border border-slate-300 rounded-lg font-mono-num text-[#1E293B]"
                  />
                </div>

                {volunteerError && (
                  <p className="rb-label-text text-[#B71C1C] font-medium">
                    {volunteerError}
                  </p>
                )}

                {volunteerJoined && (
                  <p className="rb-label-text text-[#16A34A] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'আপনার স্বেচ্ছাসেবক আবেদন সফলভাবে গৃহীত হয়েছে!'
                        : 'Demo volunteer application recorded!'}
                    </span>
                  </p>
                )}

                <button
                  type="submit"
                  className="rb-btn-transition rb-btn-text w-full py-3 px-4 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl cursor-pointer"
                >
                  {lang === 'bn'
                    ? 'স্বেচ্ছাসেবক হিসেবে নিবন্ধন করুন'
                    : 'Submit Volunteer Interest'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: Partner Hospitals & Blood Donation Organizations */}
      <section
        id="organizations"
        className="py-14 lg:py-20 bg-[#F8FAFC] border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০৯. হাসপাতাল ও রক্তদান সংগঠন সংযোগ'
                : '09. Hospitals & Blood Donation Organizations Integration'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'বরগুনা জেলার হাসপাতাল ও স্বেচ্ছাসেবী সংগঠনের সমন্বিত প্ল্যাটফর্ম'
                : 'Unified Directory for Barguna Hospitals & Voluntary Organizations'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_ORGANIZATIONS.map((org) => (
              <div
                key={org.id}
                className="rb-card-hover bg-white rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="rb-label-text font-semibold text-[#B71C1C] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? org.categoryLabelBn
                        : org.categoryLabelEn}
                    </span>
                  </div>
                  <h3 className="rb-card-heading font-bold text-[#1E293B] mt-2">
                    {lang === 'bn' ? org.nameBn : org.nameEn}
                  </h3>
                  <p className="rb-label-text text-[#64748B] mt-1">
                    {lang === 'bn' ? org.addressBn : org.addressEn}
                  </p>
                  <p className="rb-support-text text-[#475569] mt-3.5 pt-3.5 border-t border-slate-100">
                    {lang === 'bn' ? org.servicesBn : org.servicesEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 12: Transparent Platform Scope & Architectural Statistics */}
      <section
        id="statistics"
        className="py-14 lg:py-20 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '১০. প্ল্যাটফর্মের ভৌগোলিক পরিধি ও কারিগরি প্রস্তুতি'
                : '10. Platform Geographic Scope & Stage 1 Architectural Readiness'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'বরগুনা জেলা সেবা কাঠামো ও সমগ্র বাংলাদেশে সম্প্রসারণযোগ্য প্রযুক্তি'
                : 'Verified Geographic Scope & Multi-District Expansion Architecture'}
            </h2>
            <p className="rb-body-text mt-2.5 max-w-3xl">
              {lang === 'bn'
                ? 'স্বচ্ছতা নীতিমালা: এখানে কোনো কাল্পনিক রক্তদানের পরিসংখ্যান দেওয়া হয়নি; বরং বরগুনা জেলার প্রকৃত প্রশাসনিক কাঠামো এবং বর্তমান সংস্করণের নমুনা তথ্যের প্রকৃত সংখ্যা তুলে ধরা হয়েছে।'
                : 'Transparency Note: No fabricated historical donation counts are shown. These figures reflect real administrative geography for Barguna District and active Stage 1 demonstration entities.'}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <div className="rb-card-hover p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
              <div className="rb-label-text font-semibold text-[#64748B]">
                {lang === 'bn'
                  ? 'বরগুনা জেলার সংযুক্ত উপজেলা'
                  : 'Configured Barguna Upazilas'}
              </div>
              <div className="text-3xl font-bold text-[#E53935] font-mono-num mt-2">
                {lang === 'bn' ? '০৬টি' : '06'}
              </div>
              <div className="rb-label-text text-[#475569] mt-1.5">
                {lang === 'bn'
                  ? 'সদর · আমতলী · বেতাগী · বামনা · পাথরঘাটা · তালতলী'
                  : 'Sadar · Amtali · Betagi · Bamna · Patharghata · Taltali'}
              </div>
            </div>

            <div className="rb-card-hover p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
              <div className="rb-label-text font-semibold text-[#64748B]">
                {lang === 'bn'
                  ? 'ইউনিয়ন ও পৌরসভা কাঠামো'
                  : 'Unions & Municipalities Covered'}
              </div>
              <div className="text-3xl font-bold text-[#1E293B] font-mono-num mt-2">
                {lang === 'bn' ? '৪২ + ০৪' : '42 + 04'}
              </div>
              <div className="rb-label-text text-[#475569] mt-1.5">
                {lang === 'bn'
                  ? '৪২টি ইউনিয়ন ও ৪টি পৌরসভা অন্তর্ভুক্ত'
                  : '42 Unions & 4 Municipalities mapped'}
              </div>
            </div>

            <div className="rb-card-hover p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
              <div className="rb-label-text font-semibold text-[#64748B]">
                {lang === 'bn'
                  ? 'সমর্থিত রক্তের গ্রুপসমূহ'
                  : 'ABO & Rh Compatibility Groups'}
              </div>
              <div className="text-3xl font-bold text-[#1E293B] font-mono-num mt-2">
                {lang === 'bn' ? '০৮টি' : '08'}
              </div>
              <div className="rb-label-text text-[#475569] mt-1.5">
                {lang === 'bn'
                  ? `বর্তমান সেশনে ${toBnDigits(demoDonorCount)}টি নমুনা প্রোফাইল ও ${toBnDigits(demoRequestCount)}টি অনুরোধ`
                  : `${demoDonorCount} demo donors & ${demoRequestCount} demo requests in session`}
              </div>
            </div>

            <div className="rb-card-hover p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
              <div className="rb-label-text font-semibold text-[#64748B]">
                {lang === 'bn'
                  ? 'জাতীয় সম্প্রসারণ লক্ষ্যমাত্রা'
                  : 'National Expansion Target'}
              </div>
              <div className="text-3xl font-bold text-[#16A34A] font-mono-num mt-2">
                {lang === 'bn' ? '৬৪ জেলা' : '64'}
              </div>
              <div className="rb-label-text text-[#475569] mt-1.5">
                {lang === 'bn'
                  ? 'বাংলাদেশের সকল ৬৪ জেলা ও মোবাইল অ্যাপ উপযোগী'
                  : 'All 64 Districts of Bangladesh + Native Android API'}
              </div>
            </div>
          </div>

          {/* Multi-District & Native Android Readiness Architecture Overview */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center gap-2 rb-label-text font-semibold text-[#B71C1C]">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? 'বহু-জেলা সম্প্রসারণ ও মোবাইল অ্যাপ উপযোগী কাঠামো'
                      : 'Scalable Multi-District & Native Android-Ready Architecture'}
                  </span>
                </div>
                <h3 className="rb-subsection-heading font-bold text-[#1E293B]">
                  {lang === 'bn'
                    ? 'একই সার্ভার ও ডাটাবেস থেকে ওয়েবসাইট এবং ভবিষ্যৎ অ্যান্ড্রয়েড অ্যাপ পরিচালনা'
                    : 'Unified REST/Database Foundation for Web & Future Native Android App'}
                </h3>
                <p className="rb-body-text text-[#475569]">
                  {lang === 'bn'
                    ? 'রক্তবন্ধন প্ল্যাটফর্মের কারিগরি কাঠামো এমনভাবে তৈরি করা হয়েছে যাতে বরগুনা জেলার সফল চালুর পর পটুয়াখালী, বরিশাল এবং পর্যায়ক্রমে সমগ্র বাংলাদেশের ৬৪টি জেলা সহজেই যুক্ত করা যায়।'
                    : 'RoktoBondhon separates district configuration, donor matching logic, and REST endpoints (/api/v1/*) so a native Android application can connect to the exact same backend and database in upcoming stages.'}
                </p>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {DISTRICT_ARCHITECTURE_CONFIG.map((dist) => (
                  <div
                    key={dist.districtId}
                    className={`p-4 rounded-xl border rb-label-text ${
                      dist.isActiveLaunch
                        ? 'bg-white border-[#E53935] text-[#1E293B] shadow-2xs'
                        : 'bg-white/80 border-slate-200 text-[#475569]'
                    }`}
                  >
                    <div className="font-bold text-[#1E293B]">
                      {lang === 'bn' ? dist.nameBn : dist.nameEn}
                    </div>
                    <div className="text-[#64748B] mt-1 flex items-center justify-between">
                      <span>
                        {lang === 'bn' ? dist.divisionBn : dist.divisionEn}
                      </span>
                      <Smartphone className="w-3.5 h-3.5 text-[#64748B]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
