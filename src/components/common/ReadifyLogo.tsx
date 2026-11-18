export function ReadifyLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Readify Logo"
    >
      <defs>
        <linearGradient id="readifyGrad" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="readifyPageL" x1="14" y1="22" x2="32" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="readifyPageR" x1="32" y1="22" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#readifyGrad)" />
      <path d="M32 13L48 21.5L32 29.5L16 21.5L32 13Z" fill="#ffffff" fillOpacity="0.22" />
      <path
        d="M15 24.5C15 23.4 16.1 22.6 17.2 23.1L31.5 29.8V48.5L16.8 41.6C15.7 41.1 15 40 15 38.8V24.5Z"
        fill="url(#readifyPageL)"
      />
      <path
        d="M49 24.5C49 23.4 47.9 22.6 46.8 23.1L32.5 29.8V48.5L47.2 41.6C48.3 41.1 49 40 49 38.8V24.5Z"
        fill="url(#readifyPageR)"
      />
      <path d="M32 16.5L35 21.5L32 26.5L29 21.5L32 16.5Z" fill="#fde047" />
      <path
        d="M19.5 29.5L27.5 33.2M19.5 34.5L27.5 38.2"
        stroke="#2563eb"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <path
        d="M44.5 29.5L36.5 33.2M44.5 34.5L36.5 38.2"
        stroke="#0284c7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
    </svg>
  );
}
