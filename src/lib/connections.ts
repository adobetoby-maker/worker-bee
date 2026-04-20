// Connections store: Gmail, Slack, WhatsApp credentials persisted to localStorage.
// NOTE: Real OAuth flows would happen server-side. For this UI, tokens are stored
// locally and the "connection" is considered live once required fields are filled.

export type ServiceId = "gmail" | "slack" | "whatsapp";

export interface GmailConn {
  clientId: string;
  clientSecret: string;
  email: string; // simulated connected account
}
export interface SlackConn {
  botToken: string;
  defaultChannel: string;
  workspace: string;
  botUser: string;
}
export interface WhatsAppConn {
  // Twilio Sandbox-based connection
  accountSid: string;
  authToken: string;
  twilioNumber: string; // e.g. whatsapp:+14155238886
  yourNumber: string; // e.g. whatsapp:+15551234567 (verified sandbox recipient)
  friendlyName: string; // friendly name returned by Twilio API
  messagesThisMonth?: number;
}

export interface ConnectionsState {
  gmail: GmailConn | null;
  slack: SlackConn | null;
  whatsapp: WhatsAppConn | null;
}

const KEY = "workerbee_connections_v1";

export function loadConnections(): ConnectionsState {
  if (typeof window === "undefined") return { gmail: null, slack: null, whatsapp: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { gmail: null, slack: null, whatsapp: null };
    const parsed = JSON.parse(raw) as Partial<ConnectionsState>;
    return {
      gmail: parsed.gmail ?? null,
      slack: parsed.slack ?? null,
      whatsapp: parsed.whatsapp ?? null,
    };
  } catch {
    return { gmail: null, slack: null, whatsapp: null };
  }
}

// Strip raw secret fields before persisting. Per security policy, raw
// tokens / passwords / auth secrets must NEVER be stored in localStorage
// unencrypted. We persist only the non-secret connection STATUS so the UI
// can show "connected" on reload; secrets must be re-entered or pulled
// from the encrypted Hive Vault.
export function saveConnections(state: ConnectionsState) {
  if (typeof window === "undefined") return;
  const safe: ConnectionsState = {
    gmail: state.gmail
      ? { clientId: "", clientSecret: "", email: state.gmail.email }
      : null,
    slack: state.slack
      ? {
          botToken: "",
          defaultChannel: state.slack.defaultChannel,
          workspace: state.slack.workspace,
          botUser: state.slack.botUser,
        }
      : null,
    whatsapp: state.whatsapp
      ? {
          accountSid: state.whatsapp.accountSid,
          authToken: "",
          twilioNumber: state.whatsapp.twilioNumber,
          yourNumber: state.whatsapp.yourNumber,
          friendlyName: state.whatsapp.friendlyName,
          messagesThisMonth: state.whatsapp.messagesThisMonth,
        }
      : null,
  };
  window.localStorage.setItem(KEY, JSON.stringify(safe));
}
