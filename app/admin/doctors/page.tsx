"use client";

import { useEffect, useMemo, useState } from "react";

type DoctorTier = "Bronze" | "Silver" | "Gold" | "Platinum";
type DoctorStatus = "Active" | "Inactive";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  status: DoctorStatus;
  commission: number;
  rating: number;
  consultationCount: number;
  tier: DoctorTier;
  joinedAt: string;
  updatedAt: string;
  imageUrl?: string;
  bio?: string;
  qualifications?: string;
  experience?: number;
  city?: string;
  location?: string;
  fee?: number;
  gender?: "Male" | "Female";
  country?: string;
  services?: string[];
  timeSlots?: string[];
}

interface TierDef {
  tier: DoctorTier;
  threshold: number;
  color: string;
  defaultCommission: number;
  benefits: string[];
}

interface FormState {
  name: string;
  specialty: string;
  email: string;
  phone: string;
  status: DoctorStatus;
  commission: string;
  rating: string;
  consultationCount: string;
  bio: string;
  imageUrl: string;
  qualifications: string;
  experience: string;
  city: string;
  location: string;
  fee: string;
  gender: "" | "Male" | "Female";
  country: string;
  services: string;  // comma-separated in UI
  timeSlots: string; // comma-separated in UI
}

const COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Brazzaville)",
  "Congo (Kinshasa)", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Macau", "Madagascar", "Malawi", "Malaysia", "Maldives",
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
  "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

// 30-min intervals from 8:00 AM to 9:30 PM — admin toggles which ones are
// available on this doctor's calendar.
const TIME_SLOT_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 21; h++) {
    for (const m of [0, 30]) {
      const hour12 = ((h + 11) % 12) + 1;
      const ampm = h < 12 ? "AM" : "PM";
      const mm = m === 0 ? "00" : "30";
      out.push(`${hour12}:${mm} ${ampm}`);
    }
  }
  return out;
})();

function parseSlots(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toggleSlot(csv: string, slot: string): string {
  const current = parseSlots(csv);
  const idx = current.indexOf(slot);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(slot);
  // Keep the order stable by re-sorting by the canonical option order.
  current.sort(
    (a, b) => TIME_SLOT_OPTIONS.indexOf(a) - TIME_SLOT_OPTIONS.indexOf(b)
  );
  return current.join(", ");
}

const emptyForm = (specialty: string): FormState => ({
  name: "",
  specialty,
  email: "",
  phone: "",
  status: "Active",
  commission: "",
  rating: "5",
  consultationCount: "0",
  bio: "",
  imageUrl: "",
  qualifications: "",
  experience: "",
  city: "",
  location: "",
  fee: "",
  gender: "",
  country: "United States",
  services: "",
  timeSlots: "",
});

function progressTo(
  count: number,
  tiers: TierDef[]
): { nextTier: DoctorTier | null; remaining: number; pct: number } {
  for (const t of tiers) {
    if (count < t.threshold) {
      const idx = tiers.indexOf(t);
      const prev = tiers[idx - 1];
      const base = prev?.threshold ?? 0;
      const span = t.threshold - base;
      const progress = count - base;
      return {
        nextTier: t.tier,
        remaining: t.threshold - count,
        pct: span > 0 ? Math.round((progress / span) * 100) : 0,
      };
    }
  }
  return { nextTier: null, remaining: 0, pct: 100 };
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tiers, setTiers] = useState<TierDef[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState<"All" | DoctorTier>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | DoctorStatus>("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/doctors", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setDoctors(data.doctors || []);
      setTiers(data.tiers || []);
      setSpecialties(data.specialties || []);
      if (!form.specialty && data.specialties?.length) {
        setForm((f) => ({ ...f, specialty: data.specialties[0] }));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      if (specialtyFilter !== "All" && d.specialty !== specialtyFilter) return false;
      if (tierFilter !== "All" && d.tier !== tierFilter) return false;
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !d.name.toLowerCase().includes(q) &&
          !d.email.toLowerCase().includes(q) &&
          !d.specialty.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [doctors, search, specialtyFilter, tierFilter, statusFilter]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm(specialties[0] || ""));
    setShowModal(true);
  }

  function openEdit(d: Doctor) {
    setEditingId(d.id);
    setForm({
      name: d.name,
      specialty: d.specialty,
      email: d.email,
      phone: d.phone,
      status: d.status,
      commission: String(d.commission),
      rating: String(d.rating),
      consultationCount: String(d.consultationCount),
      bio: d.bio || "",
      imageUrl: d.imageUrl || "",
      qualifications: d.qualifications || "",
      experience: d.experience !== undefined ? String(d.experience) : "",
      city: d.city || "",
      location: d.location || "",
      fee: d.fee !== undefined ? String(d.fee) : "",
      gender: d.gender || "",
      country: d.country || "United States",
      services: (d.services || []).join(", "),
      timeSlots: (d.timeSlots || []).join(", "),
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim() || !form.specialty) {
      alert("Name, email and specialty are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        specialty: form.specialty,
        email: form.email,
        phone: form.phone,
        status: form.status,
        bio: form.bio,
        imageUrl: form.imageUrl,
      };
      if (form.commission !== "") payload.commission = Number(form.commission);
      if (form.rating !== "") payload.rating = Number(form.rating);
      if (form.consultationCount !== "")
        payload.consultationCount = Number(form.consultationCount);
      if (form.qualifications !== "") payload.qualifications = form.qualifications;
      if (form.experience !== "") payload.experience = Number(form.experience);
      if (form.city !== "") payload.city = form.city;
      if (form.location !== "") payload.location = form.location;
      if (form.fee !== "") payload.fee = Number(form.fee);
      if (form.gender !== "") payload.gender = form.gender;
      if (form.country !== "") payload.country = form.country;
      if (form.services.trim() !== "") {
        payload.services = form.services.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (form.timeSlots.trim() !== "") {
        payload.timeSlots = form.timeSlots.split(",").map((s) => s.trim()).filter(Boolean);
      }

      const url = editingId
        ? `/api/admin/doctors/${editingId}`
        : "/api/admin/doctors";
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${r.status}`);
      }
      setShowModal(false);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeDoctor(id: string) {
    if (!confirm("Delete this doctor? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/admin/doctors/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function quickPatch(id: string, patch: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/admin/doctors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Doctors Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            {doctors.length} doctors registered
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Doctor
        </button>
      </div>

      {/* Tier overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((t) => {
          const count = doctors.filter((d) => d.tier === t.tier).length;
          return (
            <div
              key={t.tier}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${t.color}`}
                >
                  {t.tier}
                </span>
                <span className="text-xs text-gray-500">{count} doctors</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Unlocks at{" "}
                <span className="font-semibold text-gray-700">
                  {t.threshold.toLocaleString()}
                </span>{" "}
                consultations
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Platform fee:{" "}
                <span className="font-semibold text-gray-700">
                  {t.defaultCommission}%
                </span>
              </p>
              <ul className="mt-3 space-y-1 text-[11px] text-gray-600">
                {t.benefits.slice(0, 3).map((b) => (
                  <li key={b} className="flex gap-1.5">
                    <span className="text-primary-600">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Search doctors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="All">All specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as "All" | DoctorTier)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="All">All tiers</option>
          {tiers.map((t) => (
            <option key={t.tier} value={t.tier}>
              {t.tier}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | DoctorStatus)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Specialty</th>
                <th className="px-6 py-4 font-medium">Tier & Progress</th>
                <th className="px-6 py-4 font-medium">Commission</th>
                <th className="px-6 py-4 font-medium">Rating</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    Loading doctors…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No doctors match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((d) => {
                  const tierDef = tiers.find((t) => t.tier === d.tier);
                  const prog = progressTo(d.consultationCount, tiers);
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                            {d.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={d.imageUrl}
                                alt={d.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              d.name
                                .split(" ")
                                .slice(1)
                                .map((n) => n[0])
                                .join("")
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{d.name}</div>
                            <div className="text-xs text-gray-500">{d.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{d.specialty}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tierDef?.color || ""}`}
                          >
                            {d.tier}
                          </span>
                          <div className="text-[11px] text-gray-500">
                            {d.consultationCount.toLocaleString()} consultations
                          </div>
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-primary-500"
                              style={{ width: `${prog.pct}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {prog.nextTier
                              ? `${prog.remaining} to ${prog.nextTier}`
                              : "Max tier reached"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={d.commission}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== d.commission)
                              quickPatch(d.id, { commission: v });
                          }}
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-primary-500"
                        />
                        <span className="ml-1 text-xs text-gray-500">%</span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step={0.1}
                          defaultValue={d.rating}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== d.rating) quickPatch(d.id, { rating: v });
                          }}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-primary-500"
                        />
                        <span className="ml-1 text-xs text-yellow-500">★</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            quickPatch(d.id, {
                              status: d.status === "Active" ? "Inactive" : "Active",
                            })
                          }
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            d.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {d.status}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(d)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeDoctor(d.id)}
                            disabled={deletingId === d.id}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Doctor" : "Add New Doctor"}
              </h3>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {/* Photo upload */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {form.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt="preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert("Image too large — please upload a file under 2 MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = typeof reader.result === "string" ? reader.result : "";
                          setForm((f) => ({ ...f, imageUrl: dataUrl }));
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>PNG or JPG · up to 2 MB</span>
                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                  placeholder="Dr. Jane Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Specialty *
                </label>
                <select
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  {specialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as DoctorStatus })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Consultations
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.consultationCount}
                  onChange={(e) =>
                    setForm({ ...form, consultationCount: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Tier auto-assigned: 0 Bronze · 500 Silver · 1000 Gold · 1500 Platinum
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Commission % {editingId ? "" : "(defaults by tier)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.commission}
                  onChange={(e) =>
                    setForm({ ...form, commission: e.target.value })
                  }
                  placeholder="Auto"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Rating (0-5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Qualifications
                </label>
                <input
                  type="text"
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                  placeholder="MBBS, MD (Internal Medicine)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Experience (years)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Consultation Fee ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm({ ...form, gender: e.target.value as "" | "Male" | "Female" })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="New York"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Country
                </label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Clinic / Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="MedCare Clinic, Downtown"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Services (comma-separated)
                </label>
                <textarea
                  value={form.services}
                  onChange={(e) => setForm({ ...form, services: e.target.value })}
                  rows={2}
                  placeholder="General Consultation, Preventive Health, Diabetes Care"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700">
                    Time Slots
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-500">
                      {parseSlots(form.timeSlots).length} selected
                    </span>
                    {form.timeSlots && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, timeSlots: "" })}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-6">
                  {TIME_SLOT_OPTIONS.map((slot) => {
                    const active = parseSlots(form.timeSlots).includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            timeSlots: toggleSlot(form.timeSlots, slot),
                          })
                        }
                        className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-primary-600 text-white shadow-sm"
                            : "bg-white text-gray-700 border border-gray-200 hover:border-primary-400 hover:text-primary-600"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Click a time to toggle availability. Patients will see only
                  the highlighted slots when booking.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Bio / About
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create doctor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
