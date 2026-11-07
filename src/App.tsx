import React from 'react';
import {
  Language,
  BloodGroup,
  BargunaUpazilaId,
  DemoDonor,
  EmergencyBloodRequest,
} from './types/blood';
import {
  DEMO_DONORS,
  INITIAL_DEMO_EMERGENCY_REQUESTS,
} from './data/bargunaData';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FindDonorSection } from './components/FindDonorSection';
import { EmergencyRequestSection } from './components/EmergencyRequestSection';
import { BecomeDonorSection } from './components/BecomeDonorSection';
import { AwarenessAndWorksSection } from './components/AwarenessAndWorksSection';
import { CommunityAndOrgSection } from './components/CommunityAndOrgSection';
import { AiAssistantModal } from './components/AiAssistantModal';
import { Footer } from './components/Footer';

export default function App() {
  // Default language is Bengali ('bn') per project specification, with English ('en') switch
  const [lang, setLang] = React.useState<Language>('bn');

  // Shared state for demonstration donors and emergency requests
  const [donors, setDonors] = React.useState<DemoDonor[]>(DEMO_DONORS);
  const [emergencyRequests, setEmergencyRequests] = React.useState<
    EmergencyBloodRequest[]
  >(INITIAL_DEMO_EMERGENCY_REQUESTS);

  // Directory filter state
  const [selectedBloodGroup, setSelectedBloodGroup] = React.useState<
    BloodGroup | 'ALL'
  >('ALL');
  const [selectedUpazila, setSelectedUpazila] = React.useState<
    BargunaUpazilaId | 'ALL'
  >('ALL');

  // Multi-turn Gemini AI Chat Modal state
  const [isAiChatOpen, setIsAiChatOpen] = React.useState<boolean>(false);

  const handleQuickSearch = (
    group: BloodGroup | 'ALL',
    upazila: BargunaUpazilaId | 'ALL'
  ) => {
    setSelectedBloodGroup(group);
    setSelectedUpazila(upazila);
  };

  const handleAddEmergencyRequest = (newReq: EmergencyBloodRequest) => {
    setEmergencyRequests((prev) => [newReq, ...prev]);
  };

  const handleRegisterDemoDonor = (newDonor: DemoDonor) => {
    setDonors((prev) => [newDonor, ...prev]);
  };

  const scrollToEmergency = () => {
    const el = document.getElementById('emergency-request');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E293B] ${
        lang === 'bn' ? 'font-bn' : 'font-en'
      }`}
    >
      {/* 1. Header and Navigation (Strict 3-Zone Top Bar Contract) */}
      <Header lang={lang} onEmergencyClick={scrollToEmergency} />

      <main className="flex-1">
        {/* 2. Hero Section (With Official Logo, Barguna 6-Upazila Coverage & Language Toggle) */}
        <HeroSection
          lang={lang}
          onToggleLang={setLang}
          selectedBloodGroup={selectedBloodGroup}
          selectedUpazila={selectedUpazila}
          onQuickSearch={handleQuickSearch}
          onOpenAiChat={() => setIsAiChatOpen(true)}
        />

        {/* 3. Find Blood Donor */}
        <FindDonorSection
          lang={lang}
          donors={donors}
          selectedBloodGroup={selectedBloodGroup}
          selectedUpazila={selectedUpazila}
          onChangeBloodGroup={setSelectedBloodGroup}
          onChangeUpazila={setSelectedUpazila}
        />

        {/* 4. Emergency Blood Request (+ Low-Latency AI Triage via gemini-3.1-flash-lite) */}
        <EmergencyRequestSection
          lang={lang}
          requests={emergencyRequests}
          onAddRequest={handleAddEmergencyRequest}
          onSelectGroupForSearch={(group, upazila) => {
            setSelectedBloodGroup(group);
            setSelectedUpazila(upazila);
          }}
        />

        {/* 5. Become a Donor */}
        <BecomeDonorSection
          lang={lang}
          onRegisterDemoDonor={handleRegisterDemoDonor}
        />

        {/* 6. Blood Donation Awareness, 7. How RoktoBondhon Works, 8. Blood Group Information */}
        <AwarenessAndWorksSection
          lang={lang}
          onSelectBloodGroupForSearch={(group) => setSelectedBloodGroup(group)}
        />

        {/* 9. Donation Campaign (+ gemini-3-pro-image-preview Studio), 10. Volunteer Network, 11. Organization Section, 12. Statistics Section */}
        <CommunityAndOrgSection
          lang={lang}
          demoDonorCount={donors.length}
          demoRequestCount={emergencyRequests.length}
        />
      </main>

      {/* 13. Professional Footer */}
      <Footer lang={lang} />

      {/* Multi-Turn Gemini AI Chatbot (gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite) */}
      <AiAssistantModal
        lang={lang}
        isOpen={isAiChatOpen}
        onToggleOpen={() => setIsAiChatOpen((prev) => !prev)}
      />
    </div>
  );
}
