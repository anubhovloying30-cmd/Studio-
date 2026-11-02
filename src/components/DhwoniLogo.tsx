import React from 'react';

interface DhwoniLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const DhwoniLogo: React.FC<DhwoniLogoProps> = ({
  size = 48,
  showText = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <radialGradient id="dhwoniGoldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dhwoniGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbf0b9" />
            <stop offset="35%" stopColor="#dfb743" />
            <stop offset="70%" stopColor="#c49b2c" />
            <stop offset="100%" stopColor="#e5c158" />
          </linearGradient>

          {/* Curved path for top text */}
          <path
            id="topTextCurve"
            d="M 85 250 A 165 165 0 0 1 415 250"
            fill="none"
          />
          {/* Curved path for bottom text */}
          <path
            id="bottomTextCurve"
            d="M 425 250 A 175 175 0 0 1 75 250"
            fill="none"
          />
        </defs>

        {/* Outer Background Circle */}
        <circle cx="250" cy="250" r="240" fill="#070707" />
        <circle cx="250" cy="250" r="240" fill="url(#dhwoniGoldGlow)" />

        {/* Double Gold Ring Borders */}
        <circle
          cx="250"
          cy="250"
          r="230"
          stroke="url(#dhwoniGoldGrad)"
          strokeWidth="7"
          fill="none"
        />
        <circle
          cx="250"
          cy="250"
          r="215"
          stroke="url(#dhwoniGoldGrad)"
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx="250"
          cy="250"
          r="192"
          stroke="url(#dhwoniGoldGrad)"
          strokeWidth="1.5"
          strokeDasharray="2 4"
          fill="none"
          opacity="0.4"
        />

        {/* Top Arc Text: . DHWONI STUDIO . */}
        <text
          fill="url(#dhwoniGoldGrad)"
          fontSize="31"
          fontFamily="'Cinzel', 'Playfair Display', serif"
          fontWeight="700"
          letterSpacing="4"
        >
          <textPath href="#topTextCurve" startOffset="50%" textAnchor="middle">
            • DHWONI STUDIO •
          </textPath>
        </text>

        {/* Bottom Arc Text: GOLAGHAT • UPPER TEMERA GAON • ASSAM */}
        <text
          fill="url(#dhwoniGoldGrad)"
          fontSize="15"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="600"
          letterSpacing="2.5"
          opacity="0.85"
        >
          <textPath href="#bottomTextCurve" startOffset="50%" textAnchor="middle">
            GOLAGHAT • UPPER TEMERA GAON • ASSAM
          </textPath>
        </text>

        {/* Center Graphics Group */}
        <g transform="translate(0, 0)">
          {/* 1. Condenser Microphone (Left Center) */}
          <g transform="translate(160, 165)">
            {/* Mic Capsule Outer Outline */}
            <rect
              x="-24"
              y="0"
              width="48"
              height="72"
              rx="24"
              stroke="url(#dhwoniGoldGrad)"
              strokeWidth="4"
              fill="#0d0d0d"
            />
            {/* Mic Capsule Inner Grille */}
            <line x1="-16" y1="18" x2="16" y2="18" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
            <line x1="-20" y1="32" x2="20" y2="32" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
            <line x1="-20" y1="46" x2="20" y2="46" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
            <line x1="-16" y1="60" x2="16" y2="60" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
            <line x1="0" y1="10" x2="0" y2="64" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
            <line x1="-10" y1="12" x2="-10" y2="62" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.2" opacity="0.5" />
            <line x1="10" y1="12" x2="10" y2="62" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.2" opacity="0.5" />

            {/* U-Shaped Shockmount Arm */}
            <path
              d="M -34 42 C -34 84, 34 84, 34 42"
              stroke="url(#dhwoniGoldGrad)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Stand Stem & Base */}
            <line x1="0" y1="84" x2="0" y2="104" stroke="url(#dhwoniGoldGrad)" strokeWidth="4.5" />
            <line x1="-22" y1="104" x2="22" y2="104" stroke="url(#dhwoniGoldGrad)" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* 2. Studio Over-Ear Headphones (Right Center) */}
          <g transform="translate(295, 175)">
            {/* Headband Arc */}
            <path
              d="M -54 50 C -54 -20, 54 -20, 54 50"
              stroke="url(#dhwoniGoldGrad)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M -44 45 C -44 -6, 44 -6, 44 45"
              stroke="url(#dhwoniGoldGrad)"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />

            {/* Left Ear Cup */}
            <g transform="translate(-54, 52)">
              <rect x="-10" y="-4" width="16" height="42" rx="8" stroke="url(#dhwoniGoldGrad)" strokeWidth="3.5" fill="#0e0e0e" />
              {/* Cable loop */}
              <path d="M -2 38 C -14 44, -18 25, -28 35" stroke="url(#dhwoniGoldGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>

            {/* Right Ear Cup */}
            <g transform="translate(54, 52)">
              <rect x="-6" y="-4" width="16" height="42" rx="8" stroke="url(#dhwoniGoldGrad)" strokeWidth="3.5" fill="#0e0e0e" />
            </g>
          </g>

          {/* 3. Golden Sound Waveform (Under Mic & Headphones) */}
          <path
            d="M 120 290 
               L 180 290 
               Q 195 290 202 278 
               Q 210 262 216 295 
               Q 222 330 228 260 
               Q 234 195 240 338 
               Q 246 375 252 245 
               Q 258 180 264 340 
               Q 270 380 276 270 
               Q 282 225 288 320 
               Q 294 345 300 282 
               Q 306 250 312 290 
               L 380 290"
            stroke="url(#dhwoniGoldGrad)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 4. Assamese / Bengali Calligraphy: ধ্বনি */}
          <text
            x="250"
            y="350"
            textAnchor="middle"
            fill="url(#dhwoniGoldGrad)"
            fontSize="34"
            fontWeight="700"
            fontFamily="'Hind Siliguri', 'Plus Jakarta Sans', serif"
            letterSpacing="2"
          >
            ধ্বনি
          </text>

          {/* 5. Filigree Vintage Studio Divider */}
          <g transform="translate(250, 368)">
            <line x1="-50" y1="0" x2="-10" y2="0" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
            <circle cx="-6" cy="0" r="2" fill="url(#dhwoniGoldGrad)" />
            <polygon points="0,-4 4,0 0,4 -4,0" fill="url(#dhwoniGoldGrad)" />
            <circle cx="6" cy="0" r="2" fill="url(#dhwoniGoldGrad)" />
            <line x1="10" y1="0" x2="50" y2="0" stroke="url(#dhwoniGoldGrad)" strokeWidth="1.5" opacity="0.7" />
          </g>
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-base font-bold tracking-wider text-[#e5c158]">
              DHWONI
            </span>
            <span className="text-xs font-semibold tracking-widest text-[#d4af37]/80">
              STUDIO
            </span>
            <span className="text-xs text-[#d4af37]/60 font-medium">
              (ধ্বনি)
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono tracking-tight">
            Golaghat, Assam • Android DAW
          </span>
        </div>
      )}
    </div>
  );
};
