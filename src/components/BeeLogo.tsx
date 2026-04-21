interface BeeLogoProps {
  size?: number;
  streaming?: boolean;
  error?: boolean;
  className?: string;
}

export function BeeLogo({ size = 44, streaming = false, error = false, className = "" }: BeeLogoProps) {
  const animation = error
    ? "bee-shake 0.4s ease-in-out infinite"
    : streaming
      ? "bee-lean 600ms ease-in-out infinite"
      : "bee-bob 2s ease-in-out infinite";
  const filter = streaming
    ? "drop-shadow(0 0 8px rgba(193,127,36,0.85)) drop-shadow(0 0 18px rgba(193,127,36,0.6))"
    : "drop-shadow(0 0 2px rgba(255,170,0,0.25))";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        animation,
        filter,
        transition: "filter 200ms ease",
        overflow: "visible",
        transformOrigin: "center",
      }}
      aria-hidden="true"
    >
      {/* Antennae */}
      <path d="M20 12 Q17 7 14 6" stroke="#1a0a00" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M28 12 Q31 7 34 6" stroke="#1a0a00" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="6" r="1.4" fill="#1a0a00" />
      <circle cx="34" cy="6" r="1.4" fill="#1a0a00" />

      {/* Wings (with optional rapid scale animation) */}
      <g
        style={{
          transformOrigin: "16px 18px",
          animation: streaming ? "bee-wing 80ms linear infinite" : undefined,
        }}
      >
        <ellipse cx="16" cy="18" rx="9" ry="5.5" fill="rgba(255,255,255,0.55)" stroke="rgba(180,210,255,0.6)" strokeWidth="0.8" />
      </g>
      <g
        style={{
          transformOrigin: "32px 18px",
          animation: streaming ? "bee-wing 80ms linear infinite" : undefined,
        }}
      >
        <ellipse cx="32" cy="18" rx="9" ry="5.5" fill="rgba(255,255,255,0.55)" stroke="rgba(180,210,255,0.6)" strokeWidth="0.8" />
      </g>

      {/* Body */}
      <ellipse cx="24" cy="28" rx="11" ry="13" fill="#ffaa00" stroke="#1a0a00" strokeWidth="1" />

      {/* Stripes */}
      <path d="M14.5 24 Q24 21 33.5 24" stroke="#1a0a00" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M13.5 30 Q24 27 34.5 30" stroke="#1a0a00" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M14.5 36 Q24 33 33.5 36" stroke="#1a0a00" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="20" cy="22" r="1.1" fill="#fff" />
      <circle cx="28" cy="22" r="1.1" fill="#fff" />

      {/* Stinger */}
      <path d="M22 41 L24 46 L26 41 Z" fill="#1a0a00" />
    </svg>
  );
}
