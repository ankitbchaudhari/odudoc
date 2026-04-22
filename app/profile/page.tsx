"use client";

import { useSession } from "next-auth/react";
import { useRef, useState } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
  });
  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [newHistoryEntry, setNewHistoryEntry] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = session?.user?.email || "";
  const avatarKey = email ? `odudoc:avatar:${email}` : null;
  const profileKey = email ? `odudoc:profile:${email}` : null;
  const historyKey = email ? `odudoc:medhistory:${email}` : null;

  // Initialize form + avatar + medical history with saved values once the
  // session is available. localStorage holds whatever the user last saved;
  // we fall back to their session name/email for a first-time visit.
  if (status === "authenticated" && !initialized) {
    let saved: Partial<typeof form> = {};
    if (profileKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(profileKey);
        if (raw) saved = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    setForm({
      name: saved.name ?? session?.user?.name ?? "",
      email: saved.email ?? session?.user?.email ?? "",
      phone: saved.phone ?? "",
      dob: saved.dob ?? "",
    });
    if (avatarKey && typeof window !== "undefined") {
      setAvatar(localStorage.getItem(avatarKey));
    }
    if (historyKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(historyKey);
        if (raw) setHistory(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    setInitialized(true);
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      if (avatarKey) {
        localStorage.setItem(avatarKey, dataUrl);
        window.dispatchEvent(new Event("odudoc:avatar-changed"));
      }
    };
    reader.onerror = () => setAvatarError("Could not read the file.");
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarError(null);
    if (avatarKey) {
      localStorage.removeItem(avatarKey);
      window.dispatchEvent(new Event("odudoc:avatar-changed"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (profileKey) localStorage.setItem(profileKey, JSON.stringify(form));
      if (historyKey) localStorage.setItem(historyKey, JSON.stringify(history));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addHistoryEntry = () => {
    const entry = newHistoryEntry.trim();
    if (!entry) return;
    const next = [...history, entry];
    setHistory(next);
    setNewHistoryEntry("");
    try {
      if (historyKey) localStorage.setItem(historyKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const removeHistoryEntry = (i: number) => {
    const next = history.filter((_, idx) => idx !== i);
    setHistory(next);
    try {
      if (historyKey) localStorage.setItem(historyKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">My Profile</h1>

        {saved && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Profile updated successfully!
          </div>
        )}

        {/* Profile Header */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Profile photo"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-md ring-2 ring-white hover:bg-primary-700"
                aria-label="Change photo"
                title="Change photo"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {session?.user?.name}
              </h2>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium capitalize text-primary-700">
                {session?.user?.role}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {avatar ? "Change photo" : "Upload photo"}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          {avatarError && (
            <p className="mt-3 text-xs text-red-600">{avatarError}</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            JPG, PNG or GIF · max 2 MB
          </p>
        </div>

        {/* Personal Information */}
        <form onSubmit={handleSave}>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">
              Personal Information
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">
              Medical History
            </h3>

            {history.length > 0 && (
              <ul className="mb-4 space-y-2">
                {history.map((entry, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <p className="flex-1 whitespace-pre-wrap text-sm text-gray-700">
                      {entry}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeHistoryEntry(i)}
                      className="shrink-0 rounded p-1 text-red-500 hover:bg-red-50"
                      aria-label="Remove entry"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newHistoryEntry}
                onChange={(e) => setNewHistoryEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHistoryEntry();
                  }
                }}
                placeholder="e.g. Diabetes (since 2019), allergic to penicillin, asthma"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                onClick={addHistoryEntry}
                disabled={!newHistoryEntry.trim()}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {history.length === 0 && (
              <p className="mt-3 text-xs text-gray-400">
                No medical history records yet. Add conditions, allergies, or past
                surgeries so your doctors see them at a glance.
              </p>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-end gap-4">
            {saved && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>

        {/* Change Password */}
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold text-gray-900">
            Change Password
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Current password
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  type="password"
                  value={passwords.newPass}
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-outline !py-2 !text-sm">
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
