import React from 'react';

export const OFFICIAL_LOGO_PATH =
  '/assets/aistudio/RoktoBondhon_Blood_Donation_Logo_e425e45b.png';

interface BloodDropIconProps {
  className?: string;
}

/**
 * Vector recreation of the official RoktoBondhon blood-drop with white heart,
 * ECG lifeline pulse, and caring hands for crisp rendering at small icon sizes.
 */
export const BloodDropSymbol: React.FC<BloodDropIconProps> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="rbDropGrad"
        x1="14"
        y1="4"
        x2="50"
        y2="60"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#E53935" />
        <stop offset="100%" stopColor="#B71C1C" />
      </linearGradient>
    </defs>
    {/* Outer dynamic red swooshes inspired by the official logo */}
    <path
      d="M14 40C8 46 11 54 24 57C16 54 14 47 17 42"
      stroke="#E53935"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M50 32C56 38 53 50 34 58C45 52 50 42 48 35"
      stroke="#B71C1C"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Primary Blood Drop */}
    <path
      d="M32 5C32 5 14 26.5 14 40.5C14 50.4411 22.0589 58.5 32 58.5C41.9411 58.5 50 50.4411 50 40.5C50 26.5 32 5 32 5Z"
      fill="url(#rbDropGrad)"
    />
    {/* Glossy left highlight */}
    <path
      d="M29 13C23.5 21.5 18.5 30.5 18 39C19.8 33.5 24.5 24 29 13Z"
      fill="#FFFFFF"
      fillOpacity="0.35"
    />
    {/* Inner White Heart */}
    <path
      d="M32 45.5C32 45.5 21.5 38.8 21.5 32C21.5 28.6 24.1 26 27.3 26C29.3 26 31 27.1 32 28.6C33 27.1 34.7 26 36.7 26C39.9 26 42.5 28.6 42.5 32C42.5 38.8 32 45.5 32 45.5Z"
      fill="#FFFFFF"
    />
    {/* Red ECG Lifeline inside Heart */}
    <path
      d="M23.5 33.5H27.5L29.2 29.8L31.8 37.8L34.1 28.8L35.8 33.5H40.5"
      stroke="#E53935"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Caring White Hands cradling the heart */}
    <path
      d="M19.5 34.5C19.5 41.5 25 46.5 30.5 52V56.5M44.5 34.5C44.5 41.5 39 46.5 33.5 52V56.5"
      stroke="#FFFFFF"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

interface OfficialLogoCardProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

/**
 * Displays the official uploaded RoktoBondhon logo image on a clean white background
 * without distortion or stretching, alongside crisp Bengali/English typography fallback.
 */
export const OfficialLogoDisplay: React.FC<OfficialLogoCardProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const [imgError, setImgError] = React.useState(false);

  const sizeClasses = {
    sm: 'w-20 h-20 sm:w-22 sm:h-22',
    md: 'w-32 h-32',
    lg: 'w-44 h-44 sm:w-52 sm:h-52',
  }[size];

  return (
    <div
      className={`inline-flex flex-col items-center justify-center bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs ${className}`}
    >
      {!imgError ? (
        <img
          src={OFFICIAL_LOGO_PATH}
          alt="রক্তবন্ধন (RoktoBondhon) অফিশিয়াল লোগো — এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onError={() => setImgError(true)}
          className={`${sizeClasses} object-contain object-center select-none`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-2">
          <BloodDropSymbol className="w-16 h-16" />
          <span className="mt-2 text-2xl font-bold text-[#E53935] font-bn">
            রক্তবন্ধন
          </span>
          <span className="text-xs font-semibold tracking-wider text-slate-900 font-en">
            RoktoBondhon
          </span>
        </div>
      )}
      {showTagline && (
        <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-700 text-center font-bn">
          এক ব্যাগ রক্ত, বাঁচাতে পারে একটি প্রাণ।
        </p>
      )}
    </div>
  );
};
