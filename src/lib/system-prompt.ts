import type { ConnectionsState } from "./connections";
import type { MachineProfile } from "./machine-profile";
import { computeLimits } from "./machine-profile";

export interface PromptContext {
  enabledTools: string[];
  connections: ConnectionsState;
  injectedCredentials: string[];
  machineProfile: MachineProfile | null;
}

export function buildEnrichedSystemPrompt(ctx: PromptContext): string {
  const lines: string[] = [];
  lines.push("You are Worker Bee, an expert website builder AI agent.");
  lines.push("");
  lines.push(
    "BROWSER: Playwright + Chromium are always available. You can navigate, screenshot, scrape, and interact with any website.",
  );
  lines.push("");
  lines.push(`ACTIVE TOOLS: ${ctx.enabledTools.join(", ") || "none"}`);
  lines.push("");

  const conn = ctx.connections;
  const connected: string[] = [];
  if (conn.gmail) connected.push(`  Gmail: ${conn.gmail.email} — you can send emails on request`);
  if (conn.slack)
    connected.push(
      `  Slack: ${conn.slack.workspace} — you can post to ${conn.slack.defaultChannel}`,
    );
  if (conn.whatsapp)
    connected.push(
      `  WhatsApp (Twilio Sandbox): ${conn.whatsapp.yourNumber} — you can send WhatsApp messages from ${conn.whatsapp.twilioNumber}`,
    );
  lines.push(`CONNECTIONS: ${connected.length === 0 ? "none" : ""}`);
  if (connected.length) lines.push(...connected);
  lines.push("");

  lines.push(
    `INJECTED CREDENTIALS (by reference only): ${ctx.injectedCredentials.length === 0 ? "none" : ""}`,
  );
  for (const name of ctx.injectedCredentials) {
    // SECURITY: never include the actual username or password — only the
    // proxy reference the app will resolve client-side.
    lines.push(`  - ${name} — use tool: get_credential('${name}', 'username')`);
    lines.push(`${" ".repeat(4 + name.length + 19)}get_credential('${name}', 'password')`);
  }
  lines.push("");
  if (ctx.injectedCredentials.length > 0) {
    lines.push(
      "NOTE: Credential values are NEVER sent to you. Reference them by name; the host app resolves the value securely on your behalf.",
    );
    lines.push("");
  }

  if (ctx.machineProfile) {
    const limits = computeLimits(ctx.machineProfile);
    lines.push(`MACHINE PROFILE: ${ctx.machineProfile.name}`);
    lines.push(
      `  RAM: ${ctx.machineProfile.ramGb} GB · VRAM: ${limits.effectiveVramGb} GB${
        ctx.machineProfile.unified ? " (unified)" : ""
      }`,
    );
    lines.push(`  Safe concurrent agents: ${limits.maxAgents}`);
  } else {
    lines.push("MACHINE PROFILE: unknown");
  }
  lines.push("");
  lines.push(
    "IMPORTANT: You are running on a local machine. Respect hardware limits. Warn the user if a task requires more resources than available.",
  );

  return lines.join("\n");
}
