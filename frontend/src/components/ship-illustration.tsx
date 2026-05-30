export default function ShipIllustration() {
  return (
    <svg
      viewBox="0 0 480 580"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7544A6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#40011E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bodyGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#F2A679" />
          <stop offset="100%" stopColor="#C47040" />
        </radialGradient>
        <linearGradient id="mastGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7544A6" />
          <stop offset="100%" stopColor="#40011E" />
        </linearGradient>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#580259" />
          <stop offset="100%" stopColor="#40011E" />
        </linearGradient>
        <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#580259" />
          <stop offset="100%" stopColor="#40011E" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx="240" cy="290" rx="220" ry="260" fill="url(#bgGlow)" />

      {/* Stars */}
      {(
        [
          [40, 60], [80, 30], [130, 80], [20, 140], [380, 50], [420, 100],
          [460, 40], [350, 30], [390, 130], [60, 200], [430, 200], [15, 300],
          [460, 280], [45, 380], [445, 360],
        ] as [number, number][]
      ).map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 2 : 1.2}
          fill="#F2A679"
          opacity={0.4 + (i % 3) * 0.2}
        />
      ))}

      {/* Siren 1 — top-left */}
      <g transform="translate(55, 95) rotate(-15)">
        <ellipse cx="0" cy="0" rx="18" ry="8" fill="#7544A6" />
        <path d="M-18 0 Q-32 -14 -26 -22 Q-16 -10 -6 -4Z" fill="#580259" />
        <path d="M18 0 Q32 -14 28 -22 Q18 -10 8 -4Z" fill="#580259" />
        <circle cx="0" cy="-5" r="8" fill="#F2A679" />
        <circle cx="3" cy="-7" r="1.5" fill="#40011E" />
        <path d="M-2 -2 Q2 -1 4 -3" stroke="#40011E" strokeWidth="0.8" fill="none" />
        <path d="M-4 -12 Q-12 -20 -8 -28 Q-2 -18 0 -12Z" fill="#F28B0C" opacity="0.7" />
        <path d="M4 -12 Q14 -18 12 -26 Q4 -16 0 -12Z" fill="#F28B0C" opacity="0.5" />
      </g>

      {/* Siren 2 — top-right */}
      <g transform="translate(395, 70) rotate(20) scale(-1,1)">
        <ellipse cx="0" cy="0" rx="16" ry="7" fill="#7544A6" />
        <path d="M-16 0 Q-28 -12 -22 -20 Q-14 -10 -5 -4Z" fill="#580259" />
        <path d="M16 0 Q28 -12 24 -20 Q16 -10 6 -4Z" fill="#580259" />
        <circle cx="0" cy="-5" r="7" fill="#F2A679" />
        <circle cx="3" cy="-7" r="1.5" fill="#40011E" />
        <path d="M-2 -2 Q2 -1 4 -3" stroke="#40011E" strokeWidth="0.8" fill="none" />
        <path d="M-4 -11 Q-10 -18 -6 -25 Q-2 -16 0 -11Z" fill="#F28B0C" opacity="0.7" />
      </g>

      {/* Siren 3 — mid-right */}
      <g transform="translate(405, 210) rotate(10) scale(-1,1)">
        <ellipse cx="0" cy="0" rx="14" ry="6" fill="#580259" />
        <path d="M-14 0 Q-24 -10 -19 -17 Q-12 -8 -4 -3Z" fill="#40011E" />
        <path d="M14 0 Q24 -10 20 -17 Q13 -8 4 -3Z" fill="#40011E" />
        <circle cx="0" cy="-4" r="6" fill="#F2A679" />
        <circle cx="2" cy="-5" r="1.2" fill="#40011E" />
        <path d="M-3 -11 Q-8 -17 -5 -22 Q-1 -14 0 -11Z" fill="#F28B0C" opacity="0.6" />
        <path d="M3 -11 Q10 -15 9 -21 Q3 -13 0 -11Z" fill="#F28B0C" opacity="0.4" />
      </g>

      {/* Siren 4 — left mid */}
      <g transform="translate(62, 195) rotate(5)">
        <ellipse cx="0" cy="0" rx="13" ry="5.5" fill="#580259" />
        <path d="M-13 0 Q-22 -9 -18 -15 Q-11 -7 -4 -3Z" fill="#40011E" />
        <path d="M13 0 Q22 -9 19 -15 Q12 -7 4 -3Z" fill="#40011E" />
        <circle cx="0" cy="-4" r="5.5" fill="#F2A679" />
        <circle cx="2" cy="-5" r="1.1" fill="#40011E" />
        <path d="M-2 -9 Q-7 -15 -4 -20 Q0 -12 0 -9Z" fill="#F28B0C" opacity="0.6" />
      </g>

      {/* Sail */}
      <path d="M238 60 Q290 80 285 140 Q260 130 238 160Z" fill="#580259" opacity="0.6" />
      <path d="M238 60 Q188 82 192 138 Q214 128 238 160Z" fill="#40011E" opacity="0.5" />

      {/* Mast */}
      <rect x="232" y="60" width="12" height="370" rx="4" fill="url(#mastGrad)" />

      {/* Cross beam */}
      <rect x="160" y="145" width="164" height="10" rx="4" fill="#580259" />

      {/* Rope lines */}
      <line x1="170" y1="155" x2="220" y2="290" stroke="#F2A679" strokeWidth="1.5" opacity="0.4" />
      <line x1="314" y1="155" x2="262" y2="290" stroke="#F2A679" strokeWidth="1.5" opacity="0.4" />

      {/* Legs */}
      <rect x="222" y="330" width="14" height="60" rx="6" fill="url(#bodyGrad)" />
      <rect x="240" y="330" width="14" height="60" rx="6" fill="url(#bodyGrad)" />

      {/* Feet */}
      <ellipse cx="229" cy="392" rx="10" ry="5" fill="#C47040" />
      <ellipse cx="247" cy="392" rx="10" ry="5" fill="#C47040" />

      {/* Torso */}
      <rect x="214" y="255" width="48" height="80" rx="10" fill="url(#bodyGrad)" />

      {/* Arms */}
      <path d="M214 270 Q190 265 185 278 Q192 285 214 285Z" fill="url(#bodyGrad)" />
      <path d="M262 270 Q286 265 291 278 Q284 285 262 285Z" fill="url(#bodyGrad)" />

      {/* Ropes */}
      <path d="M185 278 Q210 272 238 275 Q265 272 291 278" stroke="#F2A679" strokeWidth="3" fill="none" opacity="0.9" strokeLinecap="round" />
      <path d="M215 295 Q238 290 261 295" stroke="#F2A679" strokeWidth="3" fill="none" opacity="0.9" strokeLinecap="round" />
      <path d="M218 315 Q238 310 258 315" stroke="#F2A679" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" />

      {/* Head */}
      <circle cx="238" cy="245" r="22" fill="#F2A679" />

      {/* Beard */}
      <path d="M220 260 Q238 275 256 260 Q252 270 238 273 Q224 270 220 260Z" fill="#C47040" />

      {/* Hair */}
      <path d="M216 242 Q220 222 238 220 Q256 222 260 242 Q254 230 238 228 Q222 230 216 242Z" fill="#7544A6" />

      {/* Eyes */}
      <circle cx="230" cy="243" r="3" fill="#40011E" />
      <circle cx="246" cy="243" r="3" fill="#40011E" />
      <circle cx="231" cy="242" r="1" fill="white" opacity="0.6" />
      <circle cx="247" cy="242" r="1" fill="white" opacity="0.6" />

      {/* Mouth */}
      <path d="M232 253 Q238 257 244 253" stroke="#40011E" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Eyebrows */}
      <path d="M226 237 Q230 234 234 236" stroke="#40011E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M242 236 Q246 234 250 237" stroke="#40011E" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Laurel crown */}
      <path d="M218 228 Q228 218 238 220 Q248 218 258 228" stroke="#F28B0C" strokeWidth="2" fill="none" opacity="0.8" />
      {([220, 230, 238, 246, 256] as number[]).map((x, i) => (
        <circle key={i} cx={x} cy={226 - (i === 2 ? 6 : i === 1 || i === 3 ? 4 : 0)} r="2.5" fill="#F28B0C" opacity="0.9" />
      ))}

      {/* Toga folds */}
      <path d="M218 270 Q206 280 210 295 Q220 288 222 278Z" fill="#C47040" opacity="0.5" />
      <path d="M258 270 Q270 280 266 295 Q256 288 254 278Z" fill="#C47040" opacity="0.5" />

      {/* Hull */}
      <path
        d="M100 430 Q120 420 238 415 Q356 420 376 430 L360 470 Q300 490 238 492 Q176 490 116 470 Z"
        fill="url(#hullGrad)"
      />
      <path d="M130 445 Q238 438 348 445" stroke="#7544A6" strokeWidth="1.5" opacity="0.5" />
      <path d="M145 458 Q238 452 333 458" stroke="#7544A6" strokeWidth="1" opacity="0.4" />

      {/* Prow */}
      <path d="M376 430 Q398 428 408 440 Q398 448 376 448Z" fill="#580259" />
      {/* Stern */}
      <path d="M100 430 Q78 428 68 440 Q78 448 100 448Z" fill="#580259" />

      {/* Wave front */}
      <path
        d="M0 480 Q40 460 80 475 Q120 490 160 470 Q200 450 240 468 Q280 486 320 468 Q360 450 400 470 Q440 490 480 472 L480 580 L0 580 Z"
        fill="url(#waveGrad)"
        opacity="0.9"
      />
      {/* Wave back */}
      <path
        d="M0 500 Q60 485 120 498 Q180 511 240 494 Q300 477 360 494 Q420 511 480 496 L480 580 L0 580 Z"
        fill="#40011E"
        opacity="0.8"
      />

      {/* Wave foam */}
      <path d="M40 470 Q80 462 110 472" stroke="white" strokeWidth="1.5" fill="none" opacity="0.2" strokeLinecap="round" />
      <path d="M200 458 Q238 452 275 460" stroke="white" strokeWidth="1.5" fill="none" opacity="0.2" strokeLinecap="round" />
      <path d="M350 468 Q390 460 420 470" stroke="white" strokeWidth="1.5" fill="none" opacity="0.2" strokeLinecap="round" />

      {/* Banner */}
      <path
        d="M130 380 Q160 370 200 375 Q238 380 276 375 Q316 370 346 380 L350 400 Q316 395 276 400 Q238 405 200 400 Q160 395 126 400 Z"
        fill="#F28B0C"
        opacity="0.85"
      />
      <text
        x="238"
        y="394"
        textAnchor="middle"
        fill="#40011E"
        fontSize="13"
        fontWeight="700"
        fontFamily="sans-serif"
        letterSpacing="2"
      >
        GO IN ERD QUU SUR
      </text>

      {/* Mast glow */}
      <ellipse cx="238" cy="430" rx="30" ry="8" fill="#F28B0C" opacity="0.15" filter="url(#glow)" />
    </svg>
  );
}
