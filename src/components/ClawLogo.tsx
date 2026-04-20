interface ClawLogoProps {
  size?: number;
  streaming?: boolean;
  className?: string;
}

export function ClawLogo({ size = 28, streaming = false, className = "" }: ClawLogoProps) {
  const color = streaming ? "var(--success)" : "var(--primary)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        color,
        animation: streaming ? "var(--animate-swing-claw)" : undefined,
        filter: streaming
          ? "drop-shadow(0 0 6px var(--success)) drop-shadow(0 0 12px color-mix(in oklab, var(--success) 60%, transparent))"
          : undefined,
        transition: "color 200ms ease, filter 200ms ease",
      }}
      aria-hidden="true"
    >
      <circle cx="24" cy="8" r="2.5" fill="currentColor" />
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
