"use client";

import { useEffect, useState } from "react";

interface Department {
  id: string;
  name: string;
  icon: string;
  doctorCount: number;
  status: "Active" | "Inactive";
  description: string;
}

export default function AdminDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/departments", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setDepartments(data.departments || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormStatus("Active");
    setEditingId(null);
  };

  const handleEdit = (d: Department) => {
    setFormName(d.name);
    setFormDesc(d.description);
    setFormStatus(d.status);
    setEditingId(d.id);
    setShowForm(true);
  };

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/departments/${editingId}`
        : "/api/admin/departments";
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          status: formStatus,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      setShowForm(false);
      resetForm();
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department?")) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/departments/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleStatus(id: string) {
    // Optimistic update so the pill flips instantly.
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: d.status === "Active" ? "Inactive" : "Active" }
          : d
      )
    );
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: true }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? data.department : d))
      );
    } catch (err) {
      alert((err as Error).message);
      await refresh(); // revert optimistic change
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = departments.filter((d) => d.status === "Active").length;
  return (
    <div className="space-y-6">
      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-primary-600 to-indigo-600 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-56 w-56 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Clinical areas
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Department Management</h2>
            <p className="mt-2 text-sm text-white/80">
              {departments.length} departments · {activeCount} active
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-5 py-3 text-sm font-semibold text-primary-700 shadow-lg ring-1 ring-white/30 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Department
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Department" : "Add Department"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Department Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Cardiology"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Brief description"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formStatus}
                onChange={(e) =>
                  setFormStatus(e.target.value as "Active" | "Inactive")
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-primary-500 to-indigo-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white text-xs uppercase tracking-wider text-slate-600">
                <th className="w-8 px-4 py-3 font-semibold"></th>
                <th className="px-4 py-3 font-semibold">Icon</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Doctors</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Loading departments…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && departments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No departments yet. Click "Add Department" to create one.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                departments.map((dept, i) => {
                  // Rotate through a colour palette so each department's icon
                  // tile has its own flavour — purely visual, keyed on index.
                  const palettes = [
                    "from-rose-400 to-pink-500",
                    "from-amber-400 to-orange-500",
                    "from-emerald-400 to-teal-500",
                    "from-sky-400 to-blue-500",
                    "from-violet-400 to-fuchsia-500",
                    "from-yellow-400 to-amber-500",
                    "from-cyan-400 to-sky-500",
                    "from-indigo-400 to-violet-500",
                  ];
                  const grad = palettes[i % palettes.length];
                  return (
                    <tr
                      key={dept.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/70 dark:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <svg className="h-5 w-5 cursor-grab text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-sm ring-2 ring-white`}>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={dept.icon} />
                          </svg>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{dept.name}</p>
                        <p className="text-xs text-gray-500">{dept.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                          {dept.doctorCount} doctors
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dept.id)}
                          disabled={busyId === dept.id}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${
                            dept.status === "Active"
                              ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                              : "bg-gradient-to-r from-slate-300 to-slate-400 text-white"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          {dept.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(dept.id)}
                            disabled={busyId === dept.id}
                            className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-amber-600 transition-all hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-sm disabled:opacity-50"
                            title="Toggle Status"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(dept)}
                            className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-600 transition-all hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-sm"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            disabled={busyId === dept.id}
                            className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
