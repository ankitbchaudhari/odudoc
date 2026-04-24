// IMAP inbox reader for the admin mailbox viewer.
//
// Lets super admins read received email for OduDoc mailboxes
// (career@, hr@, admin@, …) directly from the admin panel instead of
// having to open cPanel webmail separately.
//
// Credentials live in env vars so no passwords are ever in the repo.
// Each mailbox has its own user + pass pair — the central IMAP host and
// port are shared. See MAILBOX_CATALOG below for the key → env-var map.
//
// Missing env → the mailbox is marked unconfigured and the list endpoint
// returns an empty list with a friendly notice. Nothing throws during
// boot, so local dev without creds still works.

import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";

export interface MailboxDef {
  key: string;          // url-safe id: "career", "hr", ...
  address: string;      // display email address
  label: string;        // human label
  userEnv: string;      // env var name for IMAP user
  passEnv: string;      // env var name for IMAP password
}

export const MAILBOX_CATALOG: MailboxDef[] = [
  { key: "career",        address: "career@odudoc.com",        label: "Careers",        userEnv: "IMAP_CAREER_USER",        passEnv: "IMAP_CAREER_PASS" },
  { key: "hr",            address: "hr@odudoc.com",            label: "HR (legacy)",    userEnv: "IMAP_HR_USER",            passEnv: "IMAP_HR_PASS" },
  { key: "admin",         address: "admin@odudoc.com",         label: "Admin",          userEnv: "IMAP_ADMIN_USER",         passEnv: "IMAP_ADMIN_PASS" },
  { key: "notifications", address: "notifications@odudoc.com", label: "Notifications",  userEnv: "IMAP_NOTIFICATIONS_USER", passEnv: "IMAP_NOTIFICATIONS_PASS" },
  { key: "promotion",     address: "promotion@odudoc.com",     label: "Promotion",      userEnv: "IMAP_PROMOTION_USER",     passEnv: "IMAP_PROMOTION_PASS" },
  { key: "noreply",       address: "no-reply@odudoc.com",      label: "No-reply",       userEnv: "IMAP_NOREPLY_USER",       passEnv: "IMAP_NOREPLY_PASS" },
];

export function findMailbox(key: string): MailboxDef | null {
  return MAILBOX_CATALOG.find((m) => m.key === key) || null;
}

interface MailboxCreds {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

// If every mailbox shares the same cPanel password, set IMAP_SHARED_PASS
// once and skip the six per-mailbox IMAP_*_PASS vars. A per-mailbox
// IMAP_<KEY>_PASS still wins if present, so you can override any single box.
export function getMailboxCreds(def: MailboxDef): MailboxCreds | null {
  const user = process.env[def.userEnv] || def.address;
  const pass = process.env[def.passEnv] || process.env.IMAP_SHARED_PASS;
  if (!pass) return null;
  const host = process.env.IMAP_HOST || `s4154.bom1.stableserver.net`;
  const port = Number(process.env.IMAP_PORT || 993);
  const secure = (process.env.IMAP_SECURE || "true").toLowerCase() !== "false";
  return { host, port, user, pass, secure };
}

export function mailboxStatus(def: MailboxDef): {
  configured: boolean;
  userEnv: string;
  passEnv: string;
} {
  const configured = Boolean(
    process.env[def.passEnv] || process.env.IMAP_SHARED_PASS,
  );
  return { configured, userEnv: def.userEnv, passEnv: def.passEnv };
}

export interface InboxSummary {
  uid: number;
  subject: string;
  from: string;
  fromAddress: string;
  date: string;
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
}

async function withClient<T>(
  creds: MailboxCreds,
  fn: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

function envelopeFrom(env: FetchMessageObject["envelope"]): { name: string; address: string } {
  const from = env?.from?.[0];
  if (!from) return { name: "", address: "" };
  return {
    name: from.name || "",
    address: from.address || "",
  };
}

function snippetFromBodyStructure(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * List recent messages in INBOX, newest first, up to `limit`.
 */
export async function listInbox(
  creds: MailboxCreds,
  limit: number = 50,
): Promise<InboxSummary[]> {
  return withClient(creds, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mailbox = client.mailbox;
      const exists = typeof mailbox === "object" && mailbox ? mailbox.exists : 0;
      if (!exists) return [];
      const from = Math.max(1, exists - limit + 1);
      const range = `${from}:${exists}`;
      const items: InboxSummary[] = [];
      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: false,
      })) {
        const { name, address } = envelopeFrom(msg.envelope);
        const flags = msg.flags || new Set<string>();
        const unread = !flags.has("\\Seen");
        const hasAttachments =
          typeof msg.bodyStructure === "object" && msg.bodyStructure
            ? /attachment/i.test(JSON.stringify(msg.bodyStructure))
            : false;
        items.push({
          uid: msg.uid!,
          subject: msg.envelope?.subject || "(no subject)",
          from: name || address,
          fromAddress: address,
          date: (msg.envelope?.date || new Date()).toISOString(),
          snippet: "",
          unread,
          hasAttachments,
        });
      }
      items.sort((a, b) => b.date.localeCompare(a.date));
      return items;
    } finally {
      lock.release();
    }
  });
}

export interface FullMessage {
  uid: number;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string;
  text: string;
  html: string | null;
  attachments: { filename: string; size: number; contentType: string }[];
}

/**
 * Fetch a single message by UID, parsed into plain text + sanitized-ish HTML.
 * The HTML is returned as-is from the message; the UI should render it
 * inside a sandboxed iframe.
 */
export async function fetchMessage(
  creds: MailboxCreds,
  uid: number,
): Promise<FullMessage | null> {
  return withClient(creds, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(String(uid), { source: true, envelope: true, flags: true, uid: true }, { uid: true });
      if (!msg || !msg.source) return null;
      // Mark as seen so the unread badge clears.
      try {
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      } catch { /* ignore */ }
      const parsed = await simpleParser(msg.source);
      const toArr = Array.isArray(parsed.to) ? parsed.to : parsed.to ? [parsed.to] : [];
      const to = toArr.flatMap((a) => (a.value || []).map((v) => ({ name: v.name || "", address: v.address || "" })));
      const fromVal = parsed.from?.value?.[0];
      return {
        uid,
        subject: parsed.subject || msg.envelope?.subject || "(no subject)",
        from: { name: fromVal?.name || "", address: fromVal?.address || "" },
        to,
        date: (parsed.date || msg.envelope?.date || new Date()).toISOString(),
        text: parsed.text || "",
        html: typeof parsed.html === "string" ? parsed.html : null,
        attachments: (parsed.attachments || []).map((a) => ({
          filename: a.filename || "attachment",
          size: a.size || 0,
          contentType: a.contentType || "application/octet-stream",
        })),
      };
    } finally {
      lock.release();
    }
  });
}

/**
 * Fetch the binary content of the Nth attachment on a given message.
 * Order matches `fetchMessage(...).attachments` (zero-based). Returns null
 * if the message / attachment doesn't exist.
 *
 * We deliberately re-fetch + re-parse instead of caching, because:
 *  - IMAP connections are short-lived per request (via withClient).
 *  - Caching parsed MIME in-memory across Lambda instances isn't safe
 *    without a real KV, and attachments can be multi-MB.
 *  - Re-fetch cost is bounded by the message size on the wire, which is
 *    already the floor cost once an admin clicked the download.
 */
export async function fetchAttachment(
  creds: MailboxCreds,
  uid: number,
  index: number,
): Promise<{
  filename: string;
  contentType: string;
  content: Buffer;
} | null> {
  if (!Number.isInteger(index) || index < 0) return null;
  return withClient(creds, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(
        String(uid),
        { source: true, uid: true },
        { uid: true },
      );
      if (!msg || !msg.source) return null;
      const parsed = await simpleParser(msg.source);
      const att = (parsed.attachments || [])[index];
      if (!att || !att.content) return null;
      // mailparser yields Buffer for .content; narrow for TS.
      const content = Buffer.isBuffer(att.content)
        ? att.content
        : Buffer.from(att.content as unknown as ArrayBuffer);
      return {
        filename: att.filename || `attachment-${index}`,
        contentType: att.contentType || "application/octet-stream",
        content,
      };
    } finally {
      lock.release();
    }
  });
}

// Intentionally unused export to silence "unused import" for future snippet
// helper. Keeping the function shape so adding body snippets later is cheap.
export { snippetFromBodyStructure };
