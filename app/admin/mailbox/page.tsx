"use client";

// Super-admin mailbox viewer.
//
// Picks a mailbox (career@, hr@, admin@, …) → lists the 50 most recent
// messages from INBOX → opens a read-pane with text + HTML + attachment
// metadata. Marks messages as Seen when opened.
//
// Credentials live in env vars (see lib/imap-mailbox.ts MAILBOX_CATALOG).
// If a mailbox isn't configured, we show the env-var names the admin
// needs to set instead of silently returning empty.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface MailboxMeta {
  key: string;
  address: string;
  label: string;
  configured: boolean;
  userEnv: string;
  passEnv: string;
}

interface InboxSummary {
  uid: number;
  subject: string;
  from: string;
  fromAddress: string;
  date: string;
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
}

interface FullMessage {
  uid: number;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string;
  text: string;
  html: string | null;
  attachments: { filename: string; size: number; contentType: string }[];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function MailboxPage() {
  const [mailboxes, setMailboxes] = useState<MailboxMeta[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [messages, setMessages] = useState<InboxSummary[]>([]);
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [envUser, setEnvUser] = useState<string>("");
  const [envPass, setEnvPass] = useState<string>("");

  const [activeUid, setActiveUid] = useState<number | null>(null);
  const [message, setMessage] = useState<FullMessage | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [view, setView] = useState<"html" | "text">("html");

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Load mailbox catalog.
  useEffect(() => {
    fetch("/api/admin/mailbox", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list: MailboxMeta[] = data.mailboxes || [];
        setMailboxes(list);
        const firstConfigured = list.find((m) => m.configured);
        setActiveKey((firstConfigured || list[0])?.key || "");
      })
      .catch(() => setListError("Failed to load mailboxes"));
  }, []);

  const loadInbox = useCallback((key: string) => {
    if (!key) return;
    setListing(true);
    setListError(null);
    setMessage(null);
    setActiveUid(null);
    fetch(`/api/admin/mailbox?key=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setListError(data.error);
          setMessages([]);
          setConfigured(false);
          return;
        }
        setMessages(data.messages || []);
        setConfigured(data.configured !== false);
        if (data.configured === false) {
          setEnvUser(data.userEnv || "");
          setEnvPass(data.passEnv || "");
        }
      })
      .catch(() => {
        setListError("Failed to load inbox");
        setMessages([]);
      })
      .finally(() => setListing(false));
  }, []);

  useEffect(() => { if (activeKey) loadInbox(activeKey); }, [activeKey, loadInbox]);

  // Load a single message.
  useEffect(() => {
    if (!activeKey || activeUid == null) return;
    setLoadingMsg(true);
    setMsgError(null);
    setMessage(null);
    fetch(`/api/admin/mailbox/${encodeURIComponent(activeKey)}/${activeUid}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setMsgError(data.error);
        else {
          setMessage(data.message);
          // Clear unread flag in the list optimistically.
          setMessages((ms) => ms.map((m) => (m.uid === activeUid ? { ...m, unread: false } : m)));
        }
      })
      .catch(() => setMsgError("Failed to load message"))
      .finally(() => setLoadingMsg(false));
  }, [activeKey, activeUid]);

  // Render HTML body into the sandboxed iframe.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !message || view !== "html") return;
    const html = message.html || `<pre style="white-space:pre-wrap;font-family:system-ui">${
      (message.text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    }</pre>`;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font-family:system-ui;color:#111;padding:16px;line-height:1.5}img{max-width:100%;height:auto}a{color:#2563eb}</style>${html}`);
    doc.close();
  }, [message, view]);

  const activeMailbox = useMemo(
    () => mailboxes.find((m) => m.key === activeKey) || null,
    [mailboxes, activeKey],
  );

  const unreadCount = useMemo(
    () => messages.filter((m) => m.unread).length,
    [messages],
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mailbox</h1>
          <p className="text-sm text-gray-500">
            Read incoming mail for every OduDoc address from one place.
          </p>
        </div>
        <button
          onClick={() => loadInbox(activeKey)}
          disabled={!activeKey || listing}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {listing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Mailbox sidebar */}
        <div className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Mailboxes
          </p>
          <div className="space-y-1">
            {mailboxes.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveKey(m.key)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeKey === m.key
                    ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="block">{m.label}</span>
                  <span className="block text-[11px] font-normal text-gray-500 truncate">{m.address}</span>
                </span>
                {!m.configured && (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    !
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div className="w-96 shrink-0 overflow-y-auto border-r border-gray-200">
          {!configured ? (
            <div className="p-5 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">Mailbox not configured</p>
              <p className="mt-1 text-xs">
                Set these environment variables on the server to enable this mailbox:
              </p>
              <ul className="mt-2 space-y-1 text-xs font-mono">
                <li><code className="rounded bg-gray-100 px-1 py-0.5">{envUser}</code></li>
                <li><code className="rounded bg-gray-100 px-1 py-0.5">{envPass}</code></li>
                <li><code className="rounded bg-gray-100 px-1 py-0.5">IMAP_HOST</code> (defaults to mail.odudoc.com)</li>
                <li><code className="rounded bg-gray-100 px-1 py-0.5">IMAP_PORT</code> (defaults to 993)</li>
              </ul>
            </div>
          ) : listError ? (
            <div className="p-5 text-sm text-rose-700">
              {listError}
            </div>
          ) : listing ? (
            <div className="p-5 text-sm text-gray-500">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">No messages.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              <li className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur">
                <span>Inbox</span>
                <span>{messages.length} · {unreadCount} unread</span>
              </li>
              {messages.map((m) => (
                <li key={m.uid}>
                  <button
                    onClick={() => setActiveUid(m.uid)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-gray-50 ${
                      activeUid === m.uid ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${m.unread ? "font-bold text-gray-900" : "text-gray-700"}`}>
                        {m.from || m.fromAddress || "(unknown)"}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-500">{formatDate(m.date)}</span>
                    </div>
                    <p className={`mt-0.5 truncate text-xs ${m.unread ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                      {m.subject || "(no subject)"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                      {m.unread && <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>}
                      {m.hasAttachments && <span>📎 attachment</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Message viewer */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-gray-50">
          {!activeUid ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {activeMailbox ? `Select a message from ${activeMailbox.address}` : "Pick a mailbox"}
            </div>
          ) : loadingMsg ? (
            <div className="p-6 text-sm text-gray-500">Loading message…</div>
          ) : msgError ? (
            <div className="p-6 text-sm text-rose-700">{msgError}</div>
          ) : message ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 bg-white px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">{message.subject}</h2>
                <div className="mt-1 text-xs text-gray-600">
                  From <b>{message.from.name || message.from.address}</b>{" "}
                  <span className="text-gray-400">&lt;{message.from.address}&gt;</span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  To {message.to.map((t) => t.address).join(", ") || "—"}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {new Date(message.date).toLocaleString()}
                </div>
                {message.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.attachments.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700">
                        📎 {a.filename}
                        <span className="text-gray-400">· {formatBytes(a.size)}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-1 text-xs">
                  <button
                    onClick={() => setView("html")}
                    className={`rounded-md px-3 py-1 font-semibold ${view === "html" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Rendered
                  </button>
                  <button
                    onClick={() => setView("text")}
                    className={`rounded-md px-3 py-1 font-semibold ${view === "text" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Plain text
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                {view === "html" ? (
                  <iframe
                    ref={iframeRef}
                    title="email body"
                    sandbox="allow-same-origin"
                    className="h-full w-full border-0 bg-white"
                  />
                ) : (
                  <pre className="h-full w-full whitespace-pre-wrap bg-white p-6 font-mono text-xs leading-relaxed text-gray-800">
                    {message.text || "(empty)"}
                  </pre>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
