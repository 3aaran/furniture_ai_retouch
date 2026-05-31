// 该文件用于统一渲染勋港品牌图标，供首页、登录页、工作台导航和后续 favicon/PWA 图标复用。
import React from 'react';

export default function BrandMark({className='',label='勋港品牌图标'}){
  return <span className={`brandMark ${className}`.trim()} aria-label={label} role="img">
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brandMarkGold" x1="20" y1="14" x2="98" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8dea0"/>
          <stop offset="0.52" stopColor="#e7c76f"/>
          <stop offset="1" stopColor="#a9802f"/>
        </linearGradient>
        <radialGradient id="brandMarkGlow" cx="38%" cy="28%" r="68%">
          <stop offset="0" stopColor="#f8dea0" stopOpacity="0.32"/>
          <stop offset="1" stopColor="#070809" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="8" y="8" width="104" height="104" rx="30" fill="#070809"/>
      <rect x="9.5" y="9.5" width="101" height="101" rx="28.5" fill="url(#brandMarkGlow)" stroke="url(#brandMarkGold)" strokeWidth="3"/>
      <path d="M41 33C51 25 69 25 79 33C85 38 85 54 79 61C68 55 52 55 41 61C35 54 35 38 41 33Z" fill="#f8dea0"/>
      <path d="M31 72C43 63 77 63 89 72C94 76 92 86 84 91C70 98 50 98 36 91C28 86 26 76 31 72Z" fill="#d6a943"/>
      <path d="M45 88L39 107M75 88L81 107M43 99H77" fill="none" stroke="#f8dea0" strokeWidth="6.5" strokeLinecap="round"/>
      <path d="M86 19L91 30L102 35L91 40L86 51L81 40L70 35L81 30Z" fill="#f8dea0"/>
      <path d="M28 27C36 16 53 11 69 15" fill="none" stroke="#e7c76f" strokeWidth="4.5" strokeLinecap="round" opacity="0.62"/>
    </svg>
  </span>;
}
