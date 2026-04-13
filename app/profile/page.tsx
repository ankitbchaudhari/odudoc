"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

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

  // Initialize form with session data once loaded
  if (status === "authenticated" && !initialized) {
    setForm({
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      phone: "",
      dob: "",
    });
    setInitialized(true);
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
        <div className="mb-6 flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {session?.user?.name}
            </h2>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium capitalize text-primary-700">
              {session?.user?.role}
            </span>
          </div>
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
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="mt-3 text-sm text-gray-500">
                No medical history records yet
              </p>
              <button type="button" className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700">
                Add medical history
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
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
