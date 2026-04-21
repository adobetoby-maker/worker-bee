// Worker Bee — Gmail Inbox Cleaner WebSocket protocol.
//
// Frontend → Agent (single envelope, varied payload by gmail_action):
//
//   { action: "gmail", gmail_action: "summary" }
//     → reply: { type: "gmail_summary", data: { categories: GmailCategoryCount[] } }
//
//   { action: "gmail", gmail_action: "preview", category: GmailCategoryId, limit?: number }
//     → reply: { type: "gmail_preview", data: { category, items: GmailEmailPreview[] } }
//
//   { action: "gmail", gmail_action: "top_senders", limit?: number }
//     → reply: { type: "gmail_top_senders", data: { senders: GmailTopSender[] } }
//
//   { action: "gmail", gmail_action: "archive" | "delete",
//     category?: GmailCategoryId, sender?: string, dry_run?: boolean }
//     → progress: { type: "gmail_progress", data: { op, processed, total, label } }
//     → final:    { type: "gmail_done", data: { op, processed, ok, message? } }
//
// Safety: backend MUST move-to-Trash for "delete" (never permanent delete).
// Trash retention: Gmail's default 30 days.

export type GmailCategoryId =
  | "inbox_total"
  | "unread"
  | "promotions"
  | "social"
  | "newsletters"
  | "old_unread";

export interface GmailCategoryCount {
  id: GmailCategoryId;
  count: number;
}

export interface GmailEmailPreview {
  id: string;
  from: string;
  subject: string;
  snippet?: string;
  date?: string;
}

export interface GmailTopSender {
  email: string;
  name?: string;
  count: number;
}

export interface GmailProgress {
  op: "archive" | "delete";
  processed: number;
  total: number;
  label?: string;
}

export interface GmailDone {
  op: "archive" | "delete";
  processed: number;
  ok: boolean;
  message?: string;
}

export const GMAIL_CATEGORIES: { id: GmailCategoryId; icon: string; name: string; canArchive: boolean; canDelete: boolean }[] = [
  { id: "inbox_total",  icon: "📧", name: "Total Inbox",      canArchive: false, canDelete: false },
  { id: "unread",       icon: "📬", name: "Unread",            canArchive: true,  canDelete: false },
  { id: "promotions",   icon: "🛍",  name: "Promotions",        canArchive: true,  canDelete: true  },
  { id: "social",       icon: "👥", name: "Social",            canArchive: true,  canDelete: false },
  { id: "newsletters",  icon: "📰", name: "Newsletters",       canArchive: true,  canDelete: true  },
  { id: "old_unread",   icon: "⏰", name: "Old Unread (30d+)", canArchive: true,  canDelete: false },
];