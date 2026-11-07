import React from 'react';
import { Language } from '../types/blood';
import { BloodDropSymbol } from './BrandLogo';
import { MessageSquareHeart, X, Send, Zap, Cpu, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

interface AiAssistantModalProps {
  lang: Language;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  lang,
  isOpen,
  onToggleOpen,
}) => {
  const [mode, setMode] = React.useState<'fast' | 'general' | 'complex'>(
    'general'
  );
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text:
        lang === 'bn'
          ? 'আসসালামু আলাইকুম! আমি রক্তবন্ধন (RoktoBondhon)-এর স্বাস্থ্য ও রক্তদান সহায়ক। বরগুনা জেলায় রক্তের গ্রুপের সামঞ্জস্যতা, রক্তদানের যোগ্যতা বা জরুরি রক্ত সঞ্চালনের প্রস্তুতি সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।'
          : 'Hello! I am the RoktoBondhon AI Blood & Medical Coordination Assistant. Ask me anything about blood group compatibility, donor eligibility, or emergency transfusion preparation in Barguna District.',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  React.useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'welcome-msg'
          ? {
              ...m,
              text:
                lang === 'bn'
                  ? 'আসসালামু আলাইকুম! আমি রক্তবন্ধন (RoktoBondhon)-এর স্বাস্থ্য ও রক্তদান সহায়ক। বরগুনা জেলায় রক্তের গ্রুপের সামঞ্জস্যতা, রক্তদানের যোগ্যতা বা জরুরি রক্ত সঞ্চালনের প্রস্তুতি সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।'
                  : 'Hello! I am the RoktoBondhon AI Blood & Medical Coordination Assistant. Ask me anything about blood group compatibility, donor eligibility, or emergency transfusion preparation in Barguna District.',
            }
          : m
      )
    );
  }, [lang]);

  const threadEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          mode,
          lang,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text:
              lang === 'bn'
                ? 'রক্তবন্ধন স্বাস্থ্য নির্দেশিকা: স্বেচ্ছায় রক্তদাতার বয়স ১৮–৬০ বছর, ওজন কমপক্ষে ৪৮ কেজি, হিমোগ্লোবিন কমপক্ষে ১২.৫ g/dL এবং সর্বশেষ রক্তদানের পর অন্তত ৯০ দিন বিরতি থাকা আবশ্যক। রক্ত সঞ্চালনের পূর্বে অবশ্যই হাসপাতালের ল্যাবে ক্রস-ম্যাচিং সম্পন্ন করুন।'
                : 'RoktoBondhon Clinical Guidance: Voluntary donors must be 18–60 years old, weigh at least 48 kg, and wait at least 90 days between whole blood donations.',
            modelUsed: mode,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            text: data.reply || '',
            modelUsed: data.model,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text:
            lang === 'bn'
              ? 'নেটওয়ার্ক সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।'
              : 'Network error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Compact Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label={
              lang === 'bn'
                ? 'রক্তবন্ধন এআই স্বাস্থ্য সহায়ক খুলুন'
                : 'Open RoktoBondhon AI Chatbot'
            }
            className="rb-btn-transition rb-label-text font-semibold inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#B71C1C] text-white shadow-md cursor-pointer border border-slate-700"
          >
            <MessageSquareHeart className="w-4 h-4 text-[#E53935] shrink-0" />
            <span>
              {lang === 'bn' ? 'রক্তবন্ধন এআই সহায়ক' : 'AI Assistant'}
            </span>
          </button>
        </div>
      )}

      {/* Chat Dialog Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={
            lang === 'bn'
              ? 'রক্তবন্ধন এআই স্বাস্থ্য সহায়ক চ্যাট'
              : 'RoktoBondhon Multi-Turn AI Chat'
          }
          className="rb-animate-in fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[78vh]"
        >
          {/* Header */}
          <div className="p-4 bg-[#1E293B] text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <BloodDropSymbol className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="rb-support-text font-bold text-white">
                  {lang === 'bn'
                    ? 'রক্তবন্ধন এআই স্বাস্থ্য সহায়ক'
                    : 'RoktoBondhon AI Assistant'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {lang === 'bn'
                    ? 'রক্তের গ্রুপ সামঞ্জস্যতা ও রক্তদান পরামর্শ'
                    : 'Multi-turn blood & clinical coordination chat'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleOpen}
              aria-label={lang === 'bn' ? 'চ্যাট বন্ধ করুন' : 'Close chat'}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Model Tier Selector */}
          <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between gap-2">
            <span className="rb-label-text font-semibold text-[#1E293B]">
              {lang === 'bn' ? 'পরামর্শের ধরন:' : 'AI Model Mode:'}
            </span>
            <div
              role="group"
              aria-label="Gemini Model Selector"
              className="inline-flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setMode('fast')}
                title="gemini-3.1-flash-lite"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 cursor-pointer ${
                  mode === 'fast'
                    ? 'bg-white text-[#E53935] shadow-2xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>{lang === 'bn' ? 'দ্রুত' : 'Fast'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('general')}
                title="gemini-3.8-flash"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 cursor-pointer ${
                  mode === 'general'
                    ? 'bg-white text-[#1E293B] shadow-2xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{lang === 'bn' ? 'সাধারণ' : 'General'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('complex')}
                title="gemini-4-argon"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 cursor-pointer ${
                  mode === 'complex'
                    ? 'bg-white text-[#B71C1C] shadow-2xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>{lang === 'bn' ? 'বিস্তারিত' : 'Deep'}</span>
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-white min-h-[240px] max-h-[340px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 rb-support-text whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-[#E53935] text-white'
                      : 'bg-[#F8FAFC] text-[#1E293B] border border-slate-200'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'model' && (
                  <span className="text-[11px] text-[#64748B] mt-0.5 px-1">
                    {lang === 'bn'
                      ? 'রক্তবন্ধন স্বাস্থ্য নির্দেশিকা'
                      : 'RoktoBondhon Clinical Guidance'}
                  </span>
                )}
              </div>
            ))}
            {loading && (
              <div className="rb-label-text text-[#64748B] italic px-2">
                {lang === 'bn'
                  ? 'রক্তবন্ধন এআই উত্তর প্রস্তুত করছে...'
                  : 'RoktoBondhon AI is thinking...'}
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Quick Suggestion Prompts */}
          <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                sendMessage(
                  lang === 'bn'
                    ? 'O- রক্তের গ্রুপকে কেন সার্বজনীন দাতা বলা হয়?'
                    : 'Why is O- considered the universal red cell donor?'
                )
              }
              className="rb-label-text text-[#1E293B] bg-white hover:border-[#E53935] border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'bn'
                ? 'O- সার্বজনীন দাতা কেন?'
                : 'Why is O- universal donor?'}
            </button>
            <button
              type="button"
              onClick={() =>
                sendMessage(
                  lang === 'bn'
                    ? 'বরগুনা সদর হাসপাতালে রক্তদানের পূর্বে কী কী পরীক্ষা করা হয়?'
                    : 'What screening tests are done before blood transfusion in Barguna?'
                )
              }
              className="rb-label-text text-[#1E293B] bg-white hover:border-[#E53935] border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'bn'
                ? 'রক্তদানের পূর্বে ল্যাব পরীক্ষা'
                : 'Pre-transfusion lab tests'}
            </button>
            <button
              type="button"
              onClick={() =>
                sendMessage(
                  lang === 'bn'
                    ? 'রক্তদানের প্রাথমিক যোগ্যতা ও বয়স-ওজনের শর্ত কী কী?'
                    : 'What are the age and weight requirements for donating blood?'
                )
              }
              className="rb-label-text text-[#1E293B] bg-white hover:border-[#E53935] border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'bn'
                ? 'রক্তদানের যোগ্যতা কী কী?'
                : 'Donor eligibility rules'}
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'রক্তদান বা গ্রুপ সামঞ্জস্যতা সম্পর্কে প্রশ্ন লিখুন...'
                  : 'Ask about blood compatibility or donation...'
              }
              className="flex-1 px-3.5 py-2.5 rb-support-text bg-[#F8FAFC] border border-slate-300 rounded-xl text-[#1E293B] focus:outline-none focus:border-[#E53935]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={lang === 'bn' ? 'বার্তা পাঠান' : 'Send message'}
              className="rb-btn-transition px-4 py-2.5 bg-[#E53935] hover:bg-[#B71C1C] disabled:opacity-40 text-white rounded-xl cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
