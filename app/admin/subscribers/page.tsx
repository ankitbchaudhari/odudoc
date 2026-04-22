"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
  active: boolean;
}

interface Counts { total: number; active: number; unsubscribed: number }

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch { return iso; }
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers?active=0&limit=1000");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setSubscribers(data.subscribers || []);
      setCounts(data.counts || { total: 0, active: 0, unsubscribed: 0 });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subscribers.filter((s) => s.email.toLowerCase().includes(search.toLowerCase()));

  const toggleStatus = async (sub: Subscriber) => {
    const prev = subscribers;
    setSubscribers(subscribers.map((s) => s.id === sub.id ? { ...s, active: !s.active } : s));
    setCounts({
      ...counts,
      active: counts.active + (sub.active ? -1 : 1),
      unsubscribed: counts.unsubscribed + (sub.active ? 1 : -1),
    });
    const res = await fetch("/api/admin/subscribers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sub.id, active: !sub.active }),
    });
    if (!res.ok) { setSubscribers(prev); load(); alert("Failed to update"); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this subscriber?")) return;
    const prev = subscribers;
    setSubscribers(subscribers.filter((s) => s.id !== id));
    const res = await fetch(`/api/admin/subscribers?id=${id}`, { method: "DELETE" });
    if (!res.ok) { setSubscribers(prev); alert("Failed to delete"); } else { load(); }
  };

  const exportCsv = () => {
    const rows = [["email", "subscribed_at", "source", "status"]];
    for (const s of subscribers) {
      rows.push([s.email, s.subscribedAt, s.source, s.active ? "Active" : "Unsubscribed"]);
    }
    const csv = rows.map((r) => r.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    try {
      const csv = await file.text();
      const res = await fetch("/api/admin/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      alert(`Imported: ${data.added} added · ${data.reactivated} reactivated · ${data.skipped} skipped (of ${data.parsed} parsed).`);
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Newsletter Subscribers</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your email subscriber list</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onImportFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L7 12m4-4v12" /></svg>
            {importBusy ? "Importing…" : "Import CSV"}
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
          <button
            onClick={() => setSendOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Send Newsletter
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Subscribers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{counts.total}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{counts.active}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Unsubscribed</p>
          <p className="mt-1 text-2xl font-bold text-gray-400">{counts.unsubscribed}</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subscribed Date</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.email}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(sub.subscribedAt)}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{sub.source}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sub.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {sub.active ? "Active" : "Unsubscribed"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStatus(sub)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title={sub.active ? "Unsubscribe" : "Resubscribe"}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                      <button onClick={() => del(sub.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No subscribers found.</div>
        )}
      </div>

      {sendOpen && <SendNewsletterModal activeCount={counts.active} onClose={() => setSendOpen(false)} />}
    </div>
  );
}

function SendNewsletterModal({ activeCount, onClose }: { activeCount: number; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async (mode: "test" | "broadcast") => {
    if (!subject.trim() || !message.trim()) {
      alert("Subject and message are required");
      return;
    }
    if (mode === "test" && !testEmail.trim()) {
      alert("Enter a test email address");
      return;
    }
    if (mode === "broadcast" && !confirm(`Send this newsletter to ${activeCount} active subscribers?`)) return;
    setBusy(true);
    setResult(null);
    try {
      const payload: Record<string, string> = { subject, message };
      if (mode === "test") payload.testEmail = testEmail;
      const res = await fetch("/api/admin/subscribers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (mode === "test") {
        setResult(data.skipped ? "Sent in dev mode (no SMTP). Test skipped." : "Test email sent.");
      } else {
        setResult(
          data.skipped
            ? `Broadcast skipped in dev (no SMTP). Would have sent to ${data.recipients}.`
            : `Broadcast sent. ${data.sent}/${data.recipients} succeeded${data.failed ? `, ${data.failed} failed` : ""}.`
        );
      }
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Send Newsletter</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">Will send to <b>{activeCount}</b> active subscribers via the promotion mailbox.</p>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Message</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Blank lines become paragraphs. Single newlines become line breaks." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </label>
          <div className="rounded-lg bg-gray-50 p-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Send a test first (recommended)</span>
              <div className="flex gap-2">
                <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                <button onClick={() => send("test")} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-60">Send Test</button>
              </div>
            </label>
          </div>
          {result && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{result}</div>}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
          <button onClick={() => send("broadcast")} disabled={busy} className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
            {busy ? "Sending…" : `Send to ${activeCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
