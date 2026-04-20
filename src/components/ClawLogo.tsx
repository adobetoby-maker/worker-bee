interface ClawLogoProps {
  size?: number;
  active?: boolean;
  className?: string;
}

export function ClawLogo({ size = 28, active = true, className = "" }: ClawLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        transformOrigin: "24px 8px",
        animation: active ? "var(--animate-swing-claw)" : undefined,
      }}
      aria-hidden="true"
    >
      {/* Pivot */}
      <circle cx="24" cy="8" r="2.5" fill="currentColor" />
      {/* Three prongs */}
      <path
        d="M24 10 L12 36 L16 40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 10 L24 40 L24 44"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 10 L36 36 L32 40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner accent */}
      <path
        d="M20 22 L24 28 L28 22"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
