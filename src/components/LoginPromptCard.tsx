import { useEffect, useMemo, useState } from "react";
import { listVaultPotsSafe, getPotCredentials } from "@/lib/credential-proxy";

export interface LoginSubmitArgs {
  url: string;
  username: string;
  password: string;
  maxAttempts: number;
}

interface Props {
  initialUrl: string;
  onSubmit: (args: LoginSubmitArgs) => void;
  onCancel: () => void;
}

export function LoginPromptCard({ initialUrl, onSubmit, onCancel }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [potId, setPotId] = useState<string>("");

  // Read once on open. Vault unlock state is only read when the user opens
  // this card; the dropdown is empty if vault is locked.
  const pots = useMemo(() => listVaultPotsSafe(), []);

  useEffect(() => { setUrl(initialUrl); }, [initialUrl]);

  const onSelectPot = (id: string) => {
    setPotId(id);
    if (!id) return;
    const creds = getPotCredentials(id, "login-prompt");
    if (creds) {
      setUsername(creds.username);
      setPassword(creds.password);
    }
  };

  const canSubmit = url.trim() && username.trim() && password.length > 0;

  return (
    <div
      className="mx-4 my-2 rounded-md p-4"
      style={{
        background: "#00091a",
        border: "1px solid #00aaff",
        fontFamily: "JetBrains Mono, monospace",
        color: "#cfe7ff",
        animation: "var(--animate-slide-down)",
      }}
    >
      <div style={{ color: "#00aaff", fontSize: 12, marginBottom: 10, letterSpacing: "0.18em" }}>
        🔐 LOGIN REQUIRED
      </div>

      <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "#7fb5d6" }}>
        Site
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="w-full px-2 py-1 rounded outline-none mb-3"
        style={{ background: "#000", border: "1px solid #00aaff55", color: "#cfe7ff", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
      />

      <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "#7fb5d6" }}>
        Username / Email
      </label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="off"
        className="w-full px-2 py-1 rounded outline-none mb-3"
        style={{ background: "#000", border: "1px solid #00aaff55", color: "#cfe7ff", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
      />

      <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "#7fb5d6" }}>
        Password
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        className="w-full px-2 py-1 rounded outline-none mb-3"
        style={{ background: "#000", border: "1px solid #00aaff55", color: "#cfe7ff", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
      />

      <div className="flex gap-3 mb-3">
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "#7fb5d6" }}>
            Max attempts
          </label>
          <select
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value))}
            className="w-full px-2 py-1 rounded outline-none"
            style={{ background: "#000", border: "1px solid #00aaff55", color: "#cfe7ff", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
          >
            {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "#7fb5d6" }}>
            🍯 Use from Vault {pots.length === 0 ? "(vault locked or empty)" : ""}
          </label>
          <select
            value={potId}
            onChange={(e) => onSelectPot(e.target.value)}
            disabled={pots.length === 0}
            className="w-full px-2 py-1 rounded outline-none"
            style={{ background: "#000", border: "1px solid #00aaff55", color: "#cfe7ff", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
          >
            <option value="">— SELECT POT —</option>
            {pots.map((p) => (
              <option key={p.id} value={p.id}>{p.emoji} {p.service} ({p.username})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded"
          style={{ border: "1px solid #33333366", color: "#aaa", background: "#0a0a0a", fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.15em" }}
        >
          CANCEL
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit({ url: url.trim(), username: username.trim(), password, maxAttempts })}
          className="px-3 py-1 rounded"
          style={{
            border: "1px solid #00aaff",
            color: canSubmit ? "#00091a" : "#557",
            background: canSubmit ? "#00aaff" : "#003355",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.15em",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          🔐 LOGIN
        </button>
      </div>
    </div>
  );
}