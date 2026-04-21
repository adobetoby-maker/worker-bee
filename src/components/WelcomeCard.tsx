import { useState } from "react";
import { INSTALL_COMMAND } from "@/lib/auto-connect";

interface Props {
  onOpenConfig: () => void;
}

export function WelcomeCard({ onOpenConfig }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div
        className="w-full font-mono"
        style={{
          maxWidth: 440,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "24px 22px",
        }}
      >
        <div
          className="text-center"
          style={{
            color: "var(--primary)",
            fontSize: 13,
            letterSpacing: "0.2em",
          }}
        >
          🐝 WELCOME TO WORKER BEE
        </div>

        <div
          className="mt-5 text-center"
          style={{ color: "var(--foreground)", fontSize: 12, lineHeight: 1.6 }}
        >
          To get started, run the installer on your Mac:
        </div>

        <button
          type="button"
          onClick={copy}
          className="mt-4 w-full uppercase tracking-[0.18em] transition-colors"
          style={{
            background: copied
              ? "color-mix(in oklab, var(--success) 12%, transparent)"
              : "color-mix(in oklab, var(--primary) 10%, transparent)",
            border: `1px solid ${copied ? "var(--success)" : "var(--primary)"}`,
            color: copied ? "var(--success)" : "var(--primary)",
            padding: "10px 12px",
            fontSize: 11,
          }}
        >
          {copied ? "✓ COPIED TO CLIPBOARD" : "📋 COPY INSTALL COMMAND"}
        </button>

        <div
          className="mt-5 text-center"
          style={{ color: "var(--muted-foreground)", fontSize: 11 }}
        >
          Already installed?
        </div>

        <button
          type="button"
          onClick={onOpenConfig}
          className="mt-2 w-full uppercase tracking-[0.18em] transition-colors hover:bg-surface-2/60"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
            padding: "10px 12px",
            fontSize: 11,
          }}
        >
          ⚙ OPEN CONFIG
        </button>
      </div>
    </div>
  );
}
