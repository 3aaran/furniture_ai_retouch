import React from 'react';

export default function BrandMark({className='',label='勋港品牌图标'}){
  return <span className={`brandMark ${className}`.trim()} aria-label={label} role="img">
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brandMarkAppBg" x1="16" y1="10" x2="102" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--bg-card)"/>
          <stop offset="0.48" stopColor="var(--bg-card-soft)"/>
          <stop offset="1" stopColor="var(--bg-card-strong)"/>
        </linearGradient>
        <linearGradient id="brandMarkAccent" x1="18" y1="12" x2="104" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-accent)"/>
          <stop offset="0.48" stopColor="var(--color-primary)"/>
          <stop offset="1" stopColor="var(--color-primary-deep)"/>
        </linearGradient>
        <linearGradient id="brandMarkSeat" x1="22" y1="66" x2="98" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-accent)"/>
          <stop offset="0.52" stopColor="var(--color-primary)"/>
          <stop offset="1" stopColor="var(--color-primary-deep)"/>
        </linearGradient>
        <radialGradient id="brandMarkGlow" cx="35%" cy="22%" r="80%">
          <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.42"/>
          <stop offset="0.5" stopColor="var(--color-primary)" stopOpacity="0.14"/>
          <stop offset="1" stopColor="var(--bg-card)" stopOpacity="0"/>
        </radialGradient>
        <filter id="brandMarkDrop" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="var(--text-main)" floodOpacity="0.18"/>
        </filter>
        <filter id="brandMarkSymbolShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="var(--text-main)" floodOpacity="0.16"/>
        </filter>
      </defs>
      <rect width="120" height="120" rx="28" fill="var(--bg-card-strong)"/>
      <rect x="5" y="5" width="110" height="110" rx="28" fill="url(#brandMarkAppBg)" filter="url(#brandMarkDrop)"/>
      <rect x="8" y="8" width="104" height="104" rx="26" fill="url(#brandMarkGlow)" stroke="url(#brandMarkAccent)" strokeWidth="5"/>
      <rect x="17" y="17" width="86" height="86" rx="21" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" opacity="0.26"/>
      <path d="M22 34C34 19 56 15 76 20" fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" opacity="0.58"/>
      <g filter="url(#brandMarkSymbolShadow)">
        <path d="M34 36C43 26 77 26 86 36C92 43 91 57 84 66C71 58 49 58 36 66C29 57 28 43 34 36Z" fill="var(--bg-card)"/>
        <path d="M25 75C38 64 82 64 95 75C102 81 99 92 88 97C72 103 48 103 32 97C21 92 18 81 25 75Z" fill="url(#brandMarkSeat)"/>
        <path d="M44 92L39 108M76 92L81 108M41 103H79" fill="none" stroke="var(--bg-card)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M88 18L93 30L105 35L93 40L88 52L83 40L71 35L83 30Z" fill="var(--color-accent)"/>
      </g>
      <path d="M18 18H72" fill="none" stroke="var(--bg-card)" strokeWidth="1.5" strokeLinecap="round" opacity="0.38"/>
    </svg>
  </span>;
}
