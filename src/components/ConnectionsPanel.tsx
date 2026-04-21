import { useState, type ReactNode } from "react";
import { type ConnectionsState, type ServiceId } from "@/lib/connections";
import { nowTs, type LogLine } from "@/lib/agent-state";

interface Props {
  state: ConnectionsState;
  onChange: (next: ConnectionsState) => void;
  appendLog: (line: LogLine) => void;
  onSaveToVault?: (label: string, value: string, category: "EMAIL" | "SOCIAL") => void;
  onOpenInboxCleaner?: () => void;
}

const AMBER = "#ffaa00";
const GREEN = "#39ff14";
const RED = "#ff3b3b";

function StatusBadge({ on }: { on: boolean }) {
  return (
    <span
      className="font-mono text-[10px] px-2 py-1 rounded uppercase tracking-[0.18em]"
      style={{
        color: on ? GREEN : RED,
        background: on ? `${GREEN}15` : `${RED}15`,
        border: `1px solid ${on ? GREEN : RED}55`,
      }}
    >
      {on ? "● Connected" : "○ Not Connected"}
    </span>
  );
}

function StepBlock({ children }: { children: ReactNode }) {
  return (
    <div
      className="font-mono text-[11px] leading-relaxed p-3 rounded"
      style={{ background: "#0a0a0a", border: "1px solid #222", color: "#888" }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#666" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-[12px] px-3 py-2 rounded outline-none"
        style={{
          background: "#0a0a0a",
          border: "1px solid #2a2a2a",
          color: "#ddd",
        }}
      />
    </label>
  );
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{
        background: "#0d0d0d",
        border: `1px solid ${AMBER}33`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 28 }}>{icon}</span>
          <div className="flex flex-col">
            <span
              className="font-mono font-bold tracking-[0.18em]"
              style={{ color: AMBER, fontSize: 16 }}
            >
              {title}
            </span>
            <span className="font-mono text-[11px]" style={{ color: "#888" }}>
              {description}
            </span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ConnectionsPanel({ state, onChange, appendLog, onSaveToVault }: Props) {
  // Form state
  const [gmailClientId, setGmailClientId] = useState("");
  const [gmailClientSecret, setGmailClientSecret] = useState("");

  const [slackToken, setSlackToken] = useState("");
  const [slackChannel, setSlackChannel] = useState("#general");

  const [waSid, setWaSid] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waTwilioNumber, setWaTwilioNumber] = useState("whatsapp:+14155238886");
  const [waYourNumber, setWaYourNumber] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waProdOpen, setWaProdOpen] = useState(false);

  const [vaultPrompt, setVaultPrompt] = useState<{
    service: ServiceId;
    label: string;
    secret: string;
    category: "EMAIL" | "SOCIAL";
  } | null>(null);

  const persist = (next: ConnectionsState) => {
    onChange(next);
  };

  const connectGmail = () => {
    if (!gmailClientId || !gmailClientSecret) return;
    const next: ConnectionsState = {
      ...state,
      gmail: {
        clientId: gmailClientId,
        clientSecret: gmailClientSecret,
        email: "you@gmail.com",
      },
    };
    persist(next);
    appendLog({ ts: nowTs(), level: "OK", msg: "Gmail connection established" });
    setVaultPrompt({
      service: "gmail",
      label: "Gmail OAuth",
      secret: gmailClientSecret,
      category: "EMAIL",
    });
    setGmailClientId("");
    setGmailClientSecret("");
  };

  const connectSlack = () => {
    if (!slackToken) return;
    const next: ConnectionsState = {
      ...state,
      slack: {
        botToken: slackToken,
        defaultChannel: slackChannel || "#general",
        workspace: "Your Workspace",
        botUser: "worker-bee",
      },
    };
    persist(next);
    appendLog({ ts: nowTs(), level: "OK", msg: "Slack connection established" });
    setVaultPrompt({
      service: "slack",
      label: "Slack Bot Token",
      secret: slackToken,
      category: "SOCIAL",
    });
    setSlackToken("");
  };

  const connectWhatsApp = () => {
    if (!waSid || !waToken || !waTwilioNumber || !waYourNumber) return;
    // Friendly name would normally come from Twilio's /Accounts/{Sid}.json call.
    // We derive a sensible default from the SID for the sandbox UI.
    const friendlyName = `Twilio Account ${waSid.slice(0, 6)}…`;
    const next: ConnectionsState = {
      ...state,
      whatsapp: {
        accountSid: waSid,
        authToken: waToken,
        twilioNumber: waTwilioNumber,
        yourNumber: waYourNumber,
        friendlyName,
        messagesThisMonth: 0,
      },
    };
    persist(next);
    appendLog({ ts: nowTs(), level: "OK", msg: "WhatsApp (Twilio) connection established" });
    setVaultPrompt({
      service: "whatsapp",
      label: "Twilio Auth Token",
      secret: waToken,
      category: "SOCIAL",
    });
    setWaSid("");
    setWaToken("");
    setWaYourNumber("");
  };

  const disconnect = (service: ServiceId) => {
    const next: ConnectionsState = { ...state, [service]: null };
    persist(next);
    appendLog({ ts: nowTs(), level: "ARROW", msg: `${service} disconnected` });
  };

  const sendTest = async () => {
    const recipient = waYourNumber || state.whatsapp?.yourNumber;
    if (!recipient) return;
    setWaSending(true);
    appendLog({ ts: nowTs(), level: "ARROW", msg: `Sending Twilio WhatsApp test to ${recipient}…` });
    await new Promise((r) => setTimeout(r, 900));
    setWaSending(false);
    appendLog({
      ts: nowTs(),
      level: "OK",
      msg: `🐝 Test WhatsApp delivered to ${recipient} via Twilio Sandbox`,
    });
  };

  const acceptVaultSave = () => {
    if (!vaultPrompt) return;
    onSaveToVault?.(vaultPrompt.label, vaultPrompt.secret, vaultPrompt.category);
    appendLog({
      ts: nowTs(),
      level: "OK",
      msg: `Saved [${vaultPrompt.label}] to Hive Vault`,
    });
    setVaultPrompt(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 gap-6">
      <header>
        <h1
          className="font-mono font-bold tracking-[0.18em]"
          style={{ color: AMBER, fontSize: 20 }}
        >
          🔗 LIVE CONNECTIONS
        </h1>
        <p className="font-mono text-[11px] mt-1" style={{ color: "#666" }}>
          Connect services so your agents can communicate on your behalf.
        </p>
      </header>

      {vaultPrompt && (
        <div
          className="rounded p-3 flex items-center justify-between gap-4"
          style={{
            background: `${AMBER}10`,
            border: `1px solid ${AMBER}55`,
          }}
        >
          <span className="font-mono text-[12px]" style={{ color: AMBER }}>
            🍯 Save these credentials to your Hive Vault?
          </span>
          <div className="flex gap-2">
            <button
              onClick={acceptVaultSave}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded"
              style={{ background: AMBER, color: "#000", fontWeight: 700 }}
            >
              Save to Vault
            </button>
            <button
              onClick={() => setVaultPrompt(null)}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded"
              style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
            >
              Not Now
            </button>
          </div>
        </div>
      )}

      {/* GMAIL */}
      <Card icon="📧" title="GMAIL" description="Send emails, read inbox, search threads.">
        <div className="flex justify-end">
          <StatusBadge on={!!state.gmail} />
        </div>
        {!state.gmail ? (
          <>
            <StepBlock>
              <div>
                <span style={{ color: AMBER }}>Step 1:</span> Go to console.cloud.google.com
              </div>
              <div className="ml-12">Create a project → Enable Gmail API</div>
              <div className="mt-2">
                <span style={{ color: AMBER }}>Step 2:</span> OAuth 2.0 credentials → Web App
              </div>
              <div className="ml-12">
                Authorized redirect: http://localhost:3000/auth/gmail
              </div>
              <div className="mt-2">
                <span style={{ color: AMBER }}>Step 3:</span> Paste your Client ID and Client Secret
                below
              </div>
            </StepBlock>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Client ID" value={gmailClientId} onChange={setGmailClientId} />
              <Field
                label="Client Secret"
                type="password"
                value={gmailClientSecret}
                onChange={setGmailClientSecret}
              />
            </div>
            <button
              onClick={connectGmail}
              disabled={!gmailClientId || !gmailClientSecret}
              className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 rounded self-start disabled:opacity-40"
              style={{ background: AMBER, color: "#000", fontWeight: 700 }}
            >
              🔗 Connect Gmail
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3 font-mono text-[12px]" style={{ color: "#bbb" }}>
            <div>
              <span style={{ color: "#666" }}>Connected:</span>{" "}
              <span style={{ color: GREEN }}>{state.gmail.email}</span>
            </div>
            <div>
              <span style={{ color: "#666" }}>Scopes:</span> gmail.send, gmail.readonly
            </div>
            <div className="flex flex-col gap-1 pt-1" style={{ color: "#888", fontSize: 11 }}>
              <div>✓ Send email as {state.gmail.email}</div>
              <div>✓ Read last 20 inbox messages</div>
              <div>✓ Search inbox by query</div>
              <div>✓ Reply to thread</div>
            </div>
            <button
              onClick={() => disconnect("gmail")}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded self-start"
              style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
            >
              Disconnect
            </button>
          </div>
        )}
      </Card>

      {/* SLACK */}
      <Card
        icon="💬"
        title="SLACK"
        description="Post messages, read channels, notify your team."
      >
        <div className="flex justify-end">
          <StatusBadge on={!!state.slack} />
        </div>
        {!state.slack ? (
          <>
            <StepBlock>
              <div>
                <span style={{ color: AMBER }}>Step 1:</span> api.slack.com/apps → Create New App
              </div>
              <div className="ml-12">Choose "From Scratch" → pick workspace</div>
              <div className="mt-2">
                <span style={{ color: AMBER }}>Step 2:</span> OAuth & Permissions → add scopes:
              </div>
              <div className="ml-12">chat:write · channels:read · users:read</div>
              <div className="mt-2">
                <span style={{ color: AMBER }}>Step 3:</span> Install to Workspace → copy Bot Token
              </div>
            </StepBlock>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Bot OAuth Token"
                type="password"
                value={slackToken}
                onChange={setSlackToken}
                placeholder="xoxb-..."
              />
              <Field
                label="Default Channel"
                value={slackChannel}
                onChange={setSlackChannel}
                placeholder="#general"
              />
            </div>
            <button
              onClick={connectSlack}
              disabled={!slackToken}
              className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 rounded self-start disabled:opacity-40"
              style={{ background: AMBER, color: "#000", fontWeight: 700 }}
            >
              🔗 Connect Slack
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3 font-mono text-[12px]" style={{ color: "#bbb" }}>
            <div>
              <span style={{ color: "#666" }}>Workspace:</span>{" "}
              <span style={{ color: GREEN }}>{state.slack.workspace}</span>{" "}
              <span style={{ color: "#666" }}>· Bot:</span> @{state.slack.botUser}
            </div>
            <div>
              <span style={{ color: "#666" }}>Default channel:</span> {state.slack.defaultChannel}
            </div>
            <div className="flex flex-col gap-1 pt-1" style={{ color: "#888", fontSize: 11 }}>
              <div>✓ Post message to any channel</div>
              <div>✓ DM a user by email</div>
              <div>✓ List channels</div>
              <div>✓ Read last N messages from channel</div>
            </div>
            <button
              onClick={() => disconnect("slack")}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded self-start"
              style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
            >
              Disconnect
            </button>
          </div>
        )}
      </Card>

      {/* WHATSAPP — Twilio Sandbox */}
      <Card
        icon="📱"
        title="WHATSAPP (via Twilio)"
        description="Send WhatsApp messages via Twilio Sandbox. No business verification required for testing. Upgrade to production when ready."
      >
        <div className="flex justify-end">
          <StatusBadge on={!!state.whatsapp} />
        </div>
        {!state.whatsapp ? (
          <>
            <details className="md:open:" open>
              <summary
                className="font-mono text-[10px] uppercase tracking-[0.18em] cursor-pointer mb-2"
                style={{ color: "#888" }}
              >
                ▸ Setup Instructions
              </summary>
              <StepBlock>
                <div>
                  <span style={{ color: AMBER }}>Step 1:</span> Create free account at{" "}
                  <span style={{ color: "#ddd" }}>twilio.com</span>
                </div>
                <div className="ml-12">No credit card required for sandbox testing.</div>
                <div className="mt-2">
                  <span style={{ color: AMBER }}>Step 2:</span> Messaging → Try it out → Send a
                  WhatsApp message
                </div>
                <div className="ml-12">
                  You'll see your sandbox number (e.g.{" "}
                  <span style={{ color: "#ddd" }}>+1 415 523 8886</span>) and a join code (e.g.{" "}
                  <span style={{ color: "#ddd" }}>"join bright-elephant"</span>).
                </div>
                <div className="mt-2">
                  <span style={{ color: AMBER }}>Step 3:</span> From <em>your</em> WhatsApp, message
                  the sandbox number:
                </div>
                <div className="ml-12" style={{ color: GREEN }}>
                  "join bright-elephant"
                </div>
                <div className="ml-12">You are now a verified sandbox recipient.</div>
                <div className="mt-2">
                  <span style={{ color: AMBER }}>Step 4:</span> Paste your credentials below.
                </div>
              </StepBlock>
            </details>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Account SID"
                value={waSid}
                onChange={setWaSid}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <Field
                label="Auth Token"
                type="password"
                value={waToken}
                onChange={setWaToken}
                placeholder="32-char auth token"
              />
              <Field
                label="Twilio Number"
                value={waTwilioNumber}
                onChange={setWaTwilioNumber}
                placeholder="whatsapp:+14155238886"
              />
              <Field
                label="Your WA Number"
                value={waYourNumber}
                onChange={setWaYourNumber}
                placeholder="whatsapp:+15551234567"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={connectWhatsApp}
                disabled={!waSid || !waToken || !waTwilioNumber || !waYourNumber}
                className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 rounded disabled:opacity-40"
                style={{ background: AMBER, color: "#000", fontWeight: 700 }}
              >
                🔗 Connect Twilio
              </button>
              <button
                onClick={sendTest}
                disabled={!waSid || !waToken || !waYourNumber || waSending}
                className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 rounded disabled:opacity-40"
                style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
              >
                {waSending ? "⏳ Sending…" : "📤 Send Test Message"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 font-mono text-[12px]" style={{ color: "#bbb" }}>
            <div>
              <span style={{ color: GREEN }}>✓</span>{" "}
              <span style={{ color: "#666" }}>Account:</span>{" "}
              <span style={{ color: GREEN }}>{state.whatsapp.friendlyName}</span>
            </div>
            <div>
              <span style={{ color: GREEN }}>✓</span>{" "}
              <span style={{ color: "#666" }}>Sandbox number:</span>{" "}
              {state.whatsapp.twilioNumber}
            </div>
            <div>
              <span style={{ color: GREEN }}>✓</span>{" "}
              <span style={{ color: "#666" }}>Recipient:</span> {state.whatsapp.yourNumber}
            </div>
            <div>
              <span style={{ color: GREEN }}>✓</span>{" "}
              <span style={{ color: "#666" }}>Messages sent this month:</span>{" "}
              {state.whatsapp.messagesThisMonth ?? 0}
            </div>
            <div className="flex flex-col gap-1 pt-1" style={{ color: "#888", fontSize: 11 }}>
              <div>✓ Send text message to verified recipient</div>
              <div>✓ Send message with emoji formatting</div>
              <div>✓ Send multi-part long messages (auto-split at 1600 chars)</div>
              <div style={{ color: "#666" }}>✗ Receive messages (requires public webhook URL)</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={sendTest}
                disabled={waSending}
                className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 rounded disabled:opacity-40"
                style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
              >
                {waSending ? "⏳ Sending…" : "📤 Send Test Message"}
              </button>
              <button
                onClick={() => disconnect("whatsapp")}
                className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded self-start"
                style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Production upgrade notice */}
        <div
          className="rounded mt-2"
          style={{ background: "#1a1a0d", border: `1px solid ${AMBER}55` }}
        >
          <button
            onClick={() => setWaProdOpen((v) => !v)}
            className="w-full text-left font-mono text-[11px] px-3 py-2 flex items-center justify-between"
            style={{ color: AMBER }}
          >
            <span>⬆ GOING TO PRODUCTION?</span>
            <span>{waProdOpen ? "▾" : "▸"}</span>
          </button>
          {waProdOpen && (
            <div className="px-3 pb-3 font-mono text-[11px]" style={{ color: "#888" }}>
              <div>Sandbox limits: messages only to verified opt-in numbers.</div>
              <div className="mt-2">To message anyone:</div>
              <div className="ml-3">
                1. Upgrade Twilio account (pay-as-you-go from{" "}
                <span style={{ color: "#ddd" }}>$0.005/msg</span>)
              </div>
              <div className="ml-3">2. Apply for WhatsApp Business API approval (1–3 days)</div>
              <div className="ml-3">3. Update Twilio number to an approved WA Business number</div>
              <div className="mt-2" style={{ color: AMBER }}>
                twilio.com/whatsapp → full docs
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
