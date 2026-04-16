"use client";

import { useState } from "react";

interface Subscriber {
  id: string;
  email: string;
  subscribedDate: string;
  status: "Active" | "Unsubscribed";
}

const initialSubscribers: Subscriber[] = [
  { id: "s1", email: "john.smith@example.com", subscribedDate: "Apr 01, 2026", status: "Active" },
  { id: "s2", email: "emily.davis@example.com", subscribedDate: "Mar 28, 2026", status: "Active" },
  { id: "s3", email: "robert.wilson@example.com", subscribedDate: "Mar 25, 2026", status: "Active" },
  { id: "s4", email: "maria.garcia@example.com", subscribedDate: "Mar 20, 2026", status: "Unsubscribed" },
  { id: "s5", email: "david.lee@example.com", subscribedDate: "Mar 18, 2026", status: "Active" },
  { id: "s6", email: "sarah.thompson@example.com", subscribedDate: "Mar 15, 2026", status: "Active" },
  { id: "s7", email: "mike.brown@example.com", subscribedDate: "Mar 10, 2026", status: "Active" },
  { id: "s8", email: "anna.white@example.com", subscribedDate: "Mar 05, 2026", status: "Unsubscribed" },
  { id: "s9", email: "james.clark@example.com", subscribedDate: "Feb 28, 2026", status: "Active" },
  { id: "s10", email: "lisa.martinez@example.com", subscribedDate: "Feb 20, 2026", status: "Active" },
];

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [search, setSearch] = useState("");

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = subscribers.filter((s) => s.status === "Active").length;
  const unsubscribedCount = subscribers.filter((s) => s.status === "Unsubscribed").length;

  const handleToggleStatus = (id: string) => {
    setSubscribers(subscribers.map((s) =>
      s.id === id ? { ...s, status: s.status === "Active" ? "Unsubscribed" : "Active" } : s
    ));
  };

  const handleDelete = (id: string) => {
    setSubscribers(subscribers.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Newsletter Subscribers</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your email subscriber list</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Send Newsletter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Subscribers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{subscribers.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Unsubscribed</p>
          <p className="mt-1 text-2xl font-bold text-gray-400">{unsubscribedCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subscribed Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.email}</td>
                  <td className="px-4 py-3 text-gray-600">{sub.subscribedDate}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sub.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleStatus(sub.id)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title={sub.status === "Active" ? "Unsubscribe" : "Resubscribe"}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                      <button onClick={() => handleDelete(sub.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No subscribers found.</div>
        )}
      </div>
    </div>
  );
}
