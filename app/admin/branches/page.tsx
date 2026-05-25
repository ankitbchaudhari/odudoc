"use client";

// Multi-branch admin — master admin of an org creates / edits / disables
// branches. Each branch is a physical location (clinic, lab, hospital
// outpost). Memberships at this org can be pinned to a branch via
// membership.branchId; a branch_admin sees only their location's data.

import { useEffect, useState } from "react";

type Status = "active" | "inactive";

interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

const blank = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  phone: "",
  status: "active" as Status,
};

export default function AdminBranches() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...blank });
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null
  );

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/branches", { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { branches: Branch[] };
      setBranches(j.branches);
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2500);
  }

  function resetForm() {
    setEditingId(null);
    setDraft({ ...blank });
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setDraft({
      name: b.name,
      code: b.code || "",
      address: b.address || "",
      city: b.city || "",
      state: b.state || "",
      country: b.country || "",
      postalCode: b.postalCode || "",
      phone: b.phone || "",
      status: b.status,
    });
  }

  async function save() {
    if (!draft.name.trim()) {
      showToast("Name is required.", true);
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/branches?id=${encodeURIComponent(editingId)}`
        : "/api/admin/branches";
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      showToast(editingId ? "✓ Branch updated" : "✓ Branch created");
      resetForm();
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this branch? Staff pinned here will become org-wide.")) {
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/branches?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      showToast("✓ Branch removed");
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            🏥 Multi-branch ops
          </div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Each physical location is one branch. Master admins manage the
            list here; branch admins are pinned to a single branch via their
            membership and only see that branch&apos;s data.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* List */}
        <section className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <header className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">All branches</h2>
            <p className="text-xs text-gray-500">
              {branches?.length || 0} on file
            </p>
          </header>
          {loading ? (
            <p className="px-4 py-6 text-sm text-gray-500">Loading…</p>
          ) : branches && branches.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {branches.map((b) => (
                <li
                  key={b.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    editingId === b.id ? "bg-primary-50/40" : ""
                  }`}
                >
                  <span
                    className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${
                      b.status === "active" ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                      {b.name}{" "}
                      {b.code && (
                        <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                          {b.code}
                        </code>
                      )}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {[b.address, b.city, b.state, b.country]
                        .filter(Boolean)
                        .join(", ") || "No address on file"}
                    </p>
                    {b.phone && (
                      <p className="text-xs text-gray-500">{b.phone}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(b.id)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-gray-500">
              No branches yet. Add your first one →
            </p>
          )}
        </section>

        {/* Editor */}
        <aside className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {editingId ? "Edit branch" : "Add a branch"}
          </h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Name
              </span>
              <input
                className={`mt-1 ${inputCls}`}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Andheri West Clinic"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Code (optional)
              </span>
              <input
                className={`mt-1 ${inputCls} font-mono uppercase`}
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="AW01"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Address
              </span>
              <input
                className={`mt-1 ${inputCls}`}
                value={draft.address}
                onChange={(e) =>
                  setDraft({ ...draft, address: e.target.value })
                }
                placeholder="Street, building"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  City
                </span>
                <input
                  className={`mt-1 ${inputCls}`}
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  State
                </span>
                <input
                  className={`mt-1 ${inputCls}`}
                  value={draft.state}
                  onChange={(e) =>
                    setDraft({ ...draft, state: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Country
                </span>
                <input
                  className={`mt-1 ${inputCls}`}
                  value={draft.country}
                  onChange={(e) =>
                    setDraft({ ...draft, country: e.target.value })
                  }
                  placeholder="IN"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  PIN / ZIP
                </span>
                <input
                  className={`mt-1 ${inputCls}`}
                  value={draft.postalCode}
                  onChange={(e) =>
                    setDraft({ ...draft, postalCode: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Phone
              </span>
              <input
                className={`mt-1 ${inputCls}`}
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="+91 22 1234 5678"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Status
              </span>
              <select
                className={`mt-1 ${inputCls}`}
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as Status })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add branch"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </aside>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            toast.err ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
