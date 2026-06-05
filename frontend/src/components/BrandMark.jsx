// 该文件用于统一渲染勋港品牌图标，供首页、登录页、工作台导航和后续 favicon/PWA 图标复用。
import React from 'react';

export default function BrandMark({className='',label='勋港品牌图标'}){
  return <span className={`brandMark ${className}`.trim()} aria-label={label} role="img">
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brandMarkAppBg" x1="16" y1="10" x2="102" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#201808"/>
          <stop offset="0.48" stopColor="#08090a"/>
          <stop offset="1" stopColor="#020203"/>
        </linearGradient>
        <linearGradient id="brandMarkGold" x1="18" y1="12" x2="104" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff5c6"/>
          <stop offset="0.46" stopColor="#e9c866"/>
          <stop offset="1" stopColor="#9a6e1f"/>
        </linearGradient>
        <linearGradient id="brandMarkSeat" x1="22" y1="66" x2="98" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe493"/>
          <stop offset="0.5" stopColor="#d9a435"/>
          <stop offset="1" stopColor="#8e5e19"/>
        </linearGradient>
        <radialGradient id="brandMarkGlow" cx="35%" cy="22%" r="80%">
          <stop offset="0" stopColor="#fff1b3" stopOpacity="0.46"/>
          <stop offset="0.5" stopColor="#e7c76f" stopOpacity="0.13"/>
          <stop offset="1" stopColor="#070809" stopOpacity="0"/>
        </radialGradient>
        <filter id="brandMarkDrop" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#000000" floodOpacity="0.42"/>
        </filter>
        <filter id="brandMarkSymbolShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.35"/>
        </filter>
      </defs>
      <rect width="120" height="120" rx="28" fill="#050506"/>
      <rect x="5" y="5" width="110" height="110" rx="28" fill="url(#brandMarkAppBg)" filter="url(#brandMarkDrop)"/>
      <rect x="8" y="8" width="104" height="104" rx="26" fill="url(#brandMarkGlow)" stroke="url(#brandMarkGold)" strokeWidth="5"/>
      <rect x="17" y="17" width="86" height="86" rx="21" fill="none" stroke="#fff4bf" strokeWidth="1.6" opacity="0.2"/>
      <path d="M22 34C34 19 56 15 76 20" fill="none" stroke="#f2cf72" strokeWidth="6" strokeLinecap="round" opacity="0.5"/>
      <g filter="url(#brandMarkSymbolShadow)">
        <path d="M34 36C43 26 77 26 86 36C92 43 91 57 84 66C71 58 49 58 36 66C29 57 28 43 34 36Z" fill="#fff1b3"/>
        <path d="M25 75C38 64 82 64 95 75C102 81 99 92 88 97C72 103 48 103 32 97C21 92 18 81 25 75Z" fill="url(#brandMarkSeat)"/>
        <path d="M44 92L39 108M76 92L81 108M41 103H79" fill="none" stroke="#fff1b3" strokeWidth="8" strokeLinecap="round"/>
        <path d="M88 18L93 30L105 35L93 40L88 52L83 40L71 35L83 30Z" fill="#fff1b3"/>
      </g>
      <path d="M18 18H72" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.16"/>
    </svg>
  </span>;
}
