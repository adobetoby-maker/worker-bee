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
          background: "#0d0a00",
          border: "1px solid #ffaa0066",
          padding: "24px 22px",
          boxShadow: "0 0 32px #ffaa0022",
        }}
      >
        <div
          className="text-center"
          style={{
            color: "#ffaa00",
            fontSize: 13,
            letterSpacing: "0.2em",
          }}
        >
          🐝 WELCOME TO WORKER BEE
        </div>

        <div
          className="mt-5 text-center"
          style={{ color: "#ccc", fontSize: 12, lineHeight: 1.6 }}
        >
          To get started, run the installer on your Mac:
        </div>

        <button
          type="button"
          onClick={copy}
          className="mt-4 w-full uppercase tracking-[0.18em] transition-colors"
          style={{
            background: copied ? "#39ff1422" : "#ffaa0015",
            border: `1px solid ${copied ? "#39ff14" : "#ffaa00aa"}`,
            color: copied ? "#39ff14" : "#ffaa00",
            padding: "10px 12px",
            fontSize: 11,
          }}
        >
          {copied ? "✓ COPIED TO CLIPBOARD" : "📋 COPY INSTALL COMMAND"}
        </button>

        <div
          className="mt-5 text-center"
          style={{ color: "#666", fontSize: 11 }}
        >
          Already installed?
        </div>

        <button
          type="button"
          onClick={onOpenConfig}
          className="mt-2 w-full uppercase tracking-[0.18em] transition-colors hover:bg-surface-2/60"
          style={{
            background: "transparent",
            border: "1px solid #555",
            color: "#aaa",
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
