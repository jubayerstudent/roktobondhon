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
  BLOOD_COMPATIBILITY_MAP,
  filterDonors,
  toBnDigits,
} from '../utils/bloodLogic';
import {
  Search,
  Filter,
  PhoneCall,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface FindDonorSectionProps {
  lang: Language;
  donors: DemoDonor[];
  selectedBloodGroup: BloodGroup | 'ALL';
  selectedUpazila: BargunaUpazilaId | 'ALL';
  onChangeBloodGroup: (group: BloodGroup | 'ALL') => void;
  onChangeUpazila: (upazila: BargunaUpazilaId | 'ALL') => void;
}

export const FindDonorSection: React.FC<FindDonorSectionProps> = ({
  lang,
  donors,
  selectedBloodGroup,
  selectedUpazila,
  onChangeBloodGroup,
  onChangeUpazila,
}) => {
  const [onlyAvailable, setOnlyAvailable] = React.useState<boolean>(false);
  const [includeCompatible, setIncludeCompatible] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [requestedDonorIds, setRequestedDonorIds] = React.useState<string[]>(
    []
  );

  const toggleContactRequest = (id: string) => {
    setRequestedDonorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  React.useEffect(() => {
    if (selectedBloodGroup === 'ALL') {
      setIncludeCompatible(false);
    }
  }, [selectedBloodGroup]);

  const filteredDonors = React.useMemo(
    () =>
      filterDonors(donors, {
        bloodGroup: selectedBloodGroup,
        upazilaId: selectedUpazila,
        onlyAvailable,
        includeCompatibleDonors: includeCompatible,
        searchQuery,
      }),
    [
      donors,
      selectedBloodGroup,
      selectedUpazila,
      onlyAvailable,
      includeCompatible,
      searchQuery,
    ]
  );

  const handleResetFilters = () => {
    onChangeBloodGroup('ALL');
    onChangeUpazila('ALL');
    setOnlyAvailable(false);
    setIncludeCompatible(false);
    setSearchQuery('');
  };

  const getUpazilaName = (id: BargunaUpazilaId) => {
    const found = BARGUNA_UPAZILAS.find((u) => u.id === id);
    if (!found) return id;
    return lang === 'bn' ? found.nameBn : found.nameEn;
  };

  return (
    <section
      id="find-donor"
      className="py-14 lg:py-20 bg-[#F8FAFC] border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="rb-support-text font-semibold text-[#E53935]">
              {lang === 'bn'
                ? '০১. রক্তদাতা অনুসন্ধান ডিরেক্টরি (নমুনা প্রদর্শনী)'
                : '01. Blood Donor Search Directory (Demonstration)'}
            </div>
            <h2 className="rb-section-heading mt-1 text-balance">
              {lang === 'bn'
                ? 'বরগুনা জেলার উপজেলাভিত্তিক রক্তদাতা খুঁজুন'
                : 'Find Blood Donors Across Barguna Upazilas'}
            </h2>
            <p className="rb-body-text mt-2.5 max-w-2xl">
              {lang === 'bn'
                ? 'জরুরি মুহূর্তে রোগীর রক্তের গ্রুপ ও অবস্থান অনুযায়ী নিকটবর্তী প্রস্তুত রক্তদাতা খুঁজে নিন। এখানে প্রদর্শিত প্রোফাইলগুলো প্ল্যাটফর্মের কার্যপ্রণালী প্রদর্শনের জন্য নমুনা হিসেবে যুক্ত করা হয়েছে এবং রক্তদাতাদের ব্যক্তিগত ফোন নম্বর গোপনীয়তা সুরক্ষার আওতায় রাখা হয়েছে।'
                : 'All donor profiles displayed below are clearly labeled demonstration records created to preview RoktoBondhon search and matching workflows.'}
            </p>
          </div>

          <div className="flex items-center gap-3 rb-label-text shrink-0">
            <span className="font-semibold text-[#1E293B]">
              {lang === 'bn'
                ? `প্রদর্শিত ফলাফল: ${toBnDigits(filteredDonors.length)}টি নমুনা প্রোফাইল`
                : `Showing: ${filteredDonors.length} demo profile(s)`}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rb-btn-transition inline-flex items-center gap-1 text-[#B71C1C] hover:text-[#E53935] font-semibold underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সকল ফিল্টার মুছুন' : 'Reset Filters'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Filter Control Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 mb-8 space-y-5 shadow-2xs">
          {/* Blood Group Segmented Selector */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="rb-support-text font-semibold text-[#1E293B] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#E53935]" />
                {lang === 'bn'
                  ? 'রক্তের গ্রুপ অনুযায়ী নির্বাচন করুন:'
                  : 'Filter by Blood Group:'}
              </span>
              {selectedBloodGroup !== 'ALL' && (
                <span className="rb-label-text text-[#475569] font-medium">
                  {lang === 'bn'
                    ? `${selectedBloodGroup} গ্রুপের রোগী রক্ত নিতে পারবেন: ${BLOOD_COMPATIBILITY_MAP[
                        selectedBloodGroup
                      ].canReceiveFrom.join(', ')}`
                    : `${selectedBloodGroup} recipient can receive from: ${BLOOD_COMPATIBILITY_MAP[
                        selectedBloodGroup
                      ].canReceiveFrom.join(', ')}`}
                </span>
              )}
            </div>

            <div
              role="group"
              aria-label={
                lang === 'bn' ? 'রক্তের গ্রুপ ফিল্টার' : 'Blood Group Filter'
              }
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                onClick={() => onChangeBloodGroup('ALL')}
                className={`rb-btn-transition rb-btn-text px-4 py-2 rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedBloodGroup === 'ALL'
                    ? 'bg-[#1E293B] text-white border-[#1E293B]'
                    : 'bg-[#F8FAFC] text-[#1E293B] border-slate-200 hover:border-slate-400'
                }`}
              >
                {lang === 'bn' ? 'সকল রক্তের গ্রুপ' : 'All Groups'}
              </button>
              {ALL_BLOOD_GROUPS.map((group) => {
                const active = selectedBloodGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => onChangeBloodGroup(group)}
                    className={`rb-btn-transition px-3.5 py-2 text-sm sm:text-base font-bold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer font-mono-num ${
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
          </div>

          {/* Upazila, Search Query & Smart Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-100 items-end">
            <div className="md:col-span-4">
              <label
                htmlFor="directory-upazila"
                className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
              >
                {lang === 'bn'
                  ? 'বরগুনা জেলার উপজেলা নির্বাচন করুন'
                  : 'Barguna District Upazila'}
              </label>
              <select
                id="directory-upazila"
                value={selectedUpazila}
                onChange={(e) =>
                  onChangeUpazila(e.target.value as BargunaUpazilaId | 'ALL')
                }
                className="w-full px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
              >
                <option value="ALL">
                  {lang === 'bn'
                    ? 'সকল উপজেলা (৬টি উপজেলা)'
                    : 'All Upazilas (6 Upazilas)'}
                </option>
                {BARGUNA_UPAZILAS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {lang === 'bn' ? u.nameBn : u.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="directory-search"
                className="block rb-support-text font-semibold text-[#1E293B] mb-1.5"
              >
                {lang === 'bn'
                  ? 'এলাকা, কোড বা নাম দিয়ে খুঁজুন'
                  : 'Search by Location, Code, or Name'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="directory-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'যেমন: কলেজ রোড, পাথরঘাটা, RB-BRG...'
                      : 'e.g. College Road, Patharghata, RB-BRG...'
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-lg text-[#1E293B] focus:outline-none focus:border-[#E53935]"
                />
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3">
              <label className="inline-flex items-center gap-2 rb-label-text font-semibold text-[#1E293B] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-4 h-4 accent-[#E53935] rounded"
                />
                <span>
                  {lang === 'bn'
                    ? 'শুধুমাত্র রক্তদানে প্রস্তুত (৯০+ দিন)'
                    : 'Available Now Only (90+ Days)'}
                </span>
              </label>

              <label className="inline-flex items-center gap-2 rb-label-text font-semibold text-[#1E293B] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCompatible}
                  disabled={selectedBloodGroup === 'ALL'}
                  onChange={(e) => setIncludeCompatible(e.target.checked)}
                  className="w-4 h-4 accent-[#E53935] rounded disabled:opacity-40"
                />
                <span
                  className={
                    selectedBloodGroup === 'ALL' ? 'text-[#64748B]' : ''
                  }
                >
                  {lang === 'bn'
                    ? 'সামঞ্জস্যপূর্ণ বিকল্প গ্রুপসহ'
                    : 'Include Compatible Groups'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Donor Cards Grid */}
        {filteredDonors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="rb-card-heading font-bold text-[#1E293B]">
              {lang === 'bn'
                ? 'নির্বাচিত শর্তে কোনো নমুনা রক্তদাতা প্রোফাইল পাওয়া যায়নি।'
                : 'No demonstration donors match the selected filters.'}
            </p>
            <p className="rb-body-text mt-1.5">
              {lang === 'bn'
                ? '“সামঞ্জস্যপূর্ণ বিকল্প গ্রুপসহ” অপশনটি চালু করুন অথবা সকল উপজেলা নির্বাচন করে পুনরায় দেখুন।'
                : 'Try enabling "Include Compatible Groups" or resetting the Upazila filter.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rb-btn-transition rb-btn-text mt-4 px-5 py-2.5 text-white bg-[#E53935] hover:bg-[#B71C1C] rounded-xl cursor-pointer"
            >
              {lang === 'bn'
                ? 'সকল নমুনা প্রোফাইল দেখুন'
                : 'Show All Demo Profiles'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredDonors.map((donor) => {
              const isContactRequested = requestedDonorIds.includes(donor.id);
              return (
                <article
                  key={donor.id}
                  className="rb-card-hover bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Unboxed Metadata Kicker & Blood Group Display */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="rb-label-text text-[#64748B] font-mono-num">
                          <span>{donor.code}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{lang === 'bn' ? 'নমুনা' : 'DEMO'}</span>
                        </div>
                        <h3 className="rb-card-heading font-bold text-[#1E293B] mt-1">
                          {lang === 'bn' ? donor.nameBn : donor.nameEn}
                        </h3>
                      </div>

                      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-[#E53935] font-mono-num">
                          {donor.bloodGroup}
                        </span>
                      </div>
                    </div>

                    {/* Availability Status with Explicit Icon + Text */}
                    <div className="mt-3 flex items-center gap-1.5 rb-label-text font-semibold">
                      {donor.isAvailable ? (
                        <span className="inline-flex items-center gap-1.5 text-[#16A34A]">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            {lang === 'bn'
                              ? 'রক্তদানের জন্য প্রস্তুত'
                              : 'Ready to Donate (Available)'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#F59E0B]">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>
                            {lang === 'bn'
                              ? `বিরতি চলমান (${toBnDigits(90 - donor.lastDonationDaysAgo)} দিন বাকি)`
                              : `In Recovery (${90 - donor.lastDonationDaysAgo}d remaining)`}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Details List */}
                    <dl className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 rb-label-text text-[#475569]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#64748B]">
                          {lang === 'bn' ? 'উপজেলা:' : 'Upazila:'}
                        </dt>
                        <dd className="font-semibold text-[#1E293B] text-right">
                          {getUpazilaName(donor.upazilaId)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#64748B]">
                          {lang === 'bn' ? 'এলাকা:' : 'Location:'}
                        </dt>
                        <dd className="text-right font-medium text-[#475569]">
                          {lang === 'bn' ? donor.locationBn : donor.locationEn}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#64748B]">
                          {lang === 'bn' ? 'সর্বশেষ রক্তদান:' : 'Last Donation:'}
                        </dt>
                        <dd className="text-right font-medium text-[#475569]">
                          {lang === 'bn'
                            ? `${toBnDigits(donor.lastDonationDaysAgo)} দিন আগে · মোট ${toBnDigits(donor.totalDonations)} বার`
                            : `${donor.lastDonationDaysAgo}d ago · ${donor.totalDonations} times`}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#64748B]">
                          {lang === 'bn' ? 'গোপনীয় নম্বর:' : 'Privacy Phone:'}
                        </dt>
                        <dd className="font-mono-num text-[#1E293B] font-medium text-right">
                          {donor.maskedPhone}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#64748B]">
                          {lang === 'bn' ? 'সমন্বয়ক ইউনিট:' : 'Verified By:'}
                        </dt>
                        <dd className="text-right text-[#475569]">
                          {lang === 'bn'
                            ? donor.verifiedByOrgBn
                            : donor.verifiedByOrgEn}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100">
                    {isContactRequested ? (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 rb-label-text text-[#475569]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#16A34A]">
                            {lang === 'bn'
                              ? 'যোগাযোগের অনুরোধ নথিভুক্ত হয়েছে'
                              : 'Demo Contact Request Logged'}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleContactRequest(donor.id)}
                            className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] underline cursor-pointer shrink-0"
                          >
                            {lang === 'bn' ? 'বাতিল' : 'Undo'}
                          </button>
                        </div>
                        <p className="text-[#475569] mt-1">
                          {lang === 'bn'
                            ? 'স্বেচ্ছাসেবক যাচাই ও রক্তদাতার সম্মতির পর নিরাপদ কলব্যাকের মাধ্যমে যোগাযোগ সম্পন্ন হবে।'
                            : 'Verified volunteer review and donor consent mediation will connect you safely.'}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleContactRequest(donor.id)}
                        className="rb-btn-transition rb-btn-text w-full py-2.5 px-4 text-[#B71C1C] bg-red-50 hover:bg-[#E53935] hover:text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4 shrink-0" />
                        <span>
                          {lang === 'bn'
                            ? 'যোগাযোগ করুন (নমুনা)'
                            : 'Request Donor Contact (Demo)'}
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
