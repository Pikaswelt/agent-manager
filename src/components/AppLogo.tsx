export default function AppLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="codeforge-mark" x1="10" x2="54" y1="8" y2="58">
          <stop stopColor="#f2c96d" />
          <stop offset="0.48" stopColor="#64d2ff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#111113" />
      <path
        d="M15 20.5 32 10l17 10.5v23L32 54 15 43.5v-23Z"
        fill="none"
        stroke="url(#codeforge-mark)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="m28 23-8 8.5 8 8.5M36 23l8 8.5-8 8.5"
        fill="none"
        stroke="#f7f7f8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="m34 21-5 22" stroke="#f2c96d" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}
