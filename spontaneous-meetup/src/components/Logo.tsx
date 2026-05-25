// Hangr logo — pure SVG, no image file needed

interface Props { size?: number; uid?: string }

export function LogoMark({ size = 36, uid = "a" }: Props) {
  const g1 = `lg1_${uid}`, g2 = `lg2_${uid}`, g3 = `lg3_${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* orange → pink → violet */}
        <linearGradient id={g1} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#f97316" />
          <stop offset="55%"  stopColor="#ec4899" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        {/* pin fill */}
        <linearGradient id={g2} x1="50" y1="10" x2="50" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        {/* ring */}
        <linearGradient id={g3} x1="20" y1="5" x2="80" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Dark background squircle */}
      <rect width="100" height="100" rx="22" fill="#111" />

      {/* Outer glow ring of the pin */}
      <circle cx="50" cy="38" r="26" stroke={`url(#${g3})`} strokeWidth="6" fill="none" />

      {/* Pin body */}
      <path
        d="M50 12 C33 12 20 25 20 38 C20 52 36 64 50 78 C64 64 80 52 80 38 C80 25 67 12 50 12 Z"
        fill={`url(#${g2})`}
      />

      {/* Centre person (orange) */}
      <circle cx="50" cy="33" r="7" fill="#fb923c" />
      <path d="M36 52 Q50 44 64 52" fill="#fb923c" />

      {/* Left person silhouette (white, smaller) */}
      <circle cx="34" cy="36" r="5" fill="white" opacity="0.9" />
      <path d="M23 52 Q34 46 45 52" fill="white" opacity="0.7" />

      {/* Right person silhouette (white, smaller) */}
      <circle cx="66" cy="36" r="5" fill="white" opacity="0.9" />
      <path d="M55 52 Q66 46 77 52" fill="white" opacity="0.7" />

      {/* Map outline */}
      <path
        d="M18 68 L30 60 L50 65 L70 58 L82 66 L76 84 L60 78 L50 82 L38 78 L24 84 Z"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
        opacity="0.85"
      />
      {/* Map fold line */}
      <line x1="50" y1="65" x2="50" y2="82" stroke="white" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

export function LogoFull({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center" style={{ gap: Math.round(size * 0.3) }}>
      <LogoMark size={size} uid="full" />
      <span
        className="font-black tracking-tight select-none leading-none"
        style={{
          fontSize: Math.round(size * 0.48),
          background: "linear-gradient(135deg, #f97316, #ec4899, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        HANGR
      </span>
    </span>
  );
}
