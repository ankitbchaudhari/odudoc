"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  posts: number;
  users: number;
  products: number;
  doctors: number;
  departments: number;
  comments: number;
  subscribers: number;
  formResponses: number;
}

interface Subscriber {
  email: string;
  subscribedAt: string;
}

interface Comment {
  name: string;
  email: string;
  content: string;
  approved: boolean;
  postedAt: string;
}

// Seed data (mock — replace with API calls when stores are wired)
const MOCK_STATS: Stats = {
  posts: 12,
  users: 248,
  products: 18,
  doctors: 16,
  departments: 14,
  comments: 47,
  subscribers: 312,
  formResponses: 89,
};

const MOCK_SUBSCRIBERS: Subscriber[] = [
  { email: "sridhari.lk@gmail.com", subscribedAt: "2026-04-14" },
  { email: "neerajjan1995@gmail.com", subscribedAt: "2026-04-14" },
  { email: "keyur.p@gmail.com", subscribedAt: "2026-04-13" },
  { email: "bpantlee@gmail.com", subscribedAt: "2026-04-13" },
  { email: "admin@odudoc.com", subscribedAt: "2026-04-12" },
  { email: "priya@example.com", subscribedAt: "2026-04-12" },
  { email: "sajib.malik96@gmail.com", subscribedAt: "2026-04-11" },
  { email: "junaedchaddara@gmail.com", subscribedAt: "2026-04-11" },
];

const MOCK_COMMENTS: Comment[] = [
  {
    name: "keyur",
    email: "keyur@gmail.com",
    content:
      "This blog provided exceptional information on the anxiety disorder and also provided a good techniques to manage them. This really helpful.",
    approved: true,
    postedAt: "2026-04-14",
  },
  {
    name: "John",
    email: "john@odudoc.com",
    content: "what a fantasic",
    approved: false,
    postedAt: "2026-04-13",
  },
  {
    name: "awdaw",
    email: "test@test.com",
    content: "awdadw and awdaw dwa",
    approved: false,
    postedAt: "2026-04-13",
  },
  {
    name: "prateek",
    email: "prateek@example.com",
    content: "Great article about mental health awareness.",
    approved: true,
    postedAt: "2026-04-12",
  },
  {
    name: "Jhone Doe",
    email: "jhone@example.com",
    content:
      "Thank you for shedding light on such an important topic. Mental health awareness is crucial, and this article provides valuable insights into understanding and managing anxiety disorders. Well written and informative!",
    approved: true,
    postedAt: "2026-04-12",
  },
];

const gravatar = (email: string, size = 40) => {
  // Use ui-avatars as gravatar-free fallback so we don't need external gravatar
  const letter = email.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${letter}&background=0E7490&color=fff&size=${size}&bold=true`;
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bg: string;
  shadow: string;
}

function StatCard({ label, value, icon, bg, shadow }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 text-white shadow-lg ${bg} ${shadow}`}
    >
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
          {label}
        </p>
        <p className="mt-2 text-4xl font-bold">{value}</p>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
        {icon}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(MOCK_STATS);
  const [subscribers, setSubscribers] = useState<Subscriber[]>(MOCK_SUBSCRIBERS);
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);

  // Optionally pull real counts from APIs we already have
  useEffect(() => {
    // Careers applications → proxy for form responses
    fetch("/api/careers/applications")
      .then((r) => r.json())
      .then((d) => {
        if (d.applications) {
          setStats((s) => ({
            ...s,
            formResponses: d.applications.length + 50,
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here is what is happening with OduDoc today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Posts"
          value={stats.posts}
          bg="bg-gradient-to-br from-blue-500 to-blue-600"
          shadow="shadow-blue-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          }
        />
        <StatCard
          label="Total Users"
          value={stats.users}
          bg="bg-gradient-to-br from-emerald-500 to-emerald-600"
          shadow="shadow-emerald-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Products"
          value={stats.products}
          bg="bg-gradient-to-br from-slate-500 to-slate-600"
          shadow="shadow-slate-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          label="Total Doctors"
          value={stats.doctors}
          bg="bg-gradient-to-br from-cyan-500 to-sky-600"
          shadow="shadow-cyan-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Department"
          value={stats.departments}
          bg="bg-gradient-to-br from-indigo-500 to-indigo-600"
          shadow="shadow-indigo-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          }
        />
        <StatCard
          label="Total Comments"
          value={stats.comments}
          bg="bg-gradient-to-br from-gray-600 to-gray-700"
          shadow="shadow-gray-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <StatCard
          label="Total Subscriber"
          value={stats.subscribers}
          bg="bg-gradient-to-br from-green-500 to-emerald-600"
          shadow="shadow-green-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          }
        />
        <StatCard
          label="Total Form Responses"
          value={stats.formResponses}
          bg="bg-gradient-to-br from-blue-500 to-indigo-600"
          shadow="shadow-blue-500/40"
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Latest Subscribers + Comments */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subscribers */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
            <h2 className="text-base font-bold text-gray-900">Latest Subscribers</h2>
            <Link
              href="/admin/subscribers"
              className="ml-auto text-xs font-semibold text-primary-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {subscribers.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No subscribers found
              </li>
            ) : (
              subscribers.map((s, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <img
                    src={gravatar(s.email)}
                    alt=""
                    className="h-10 w-10 rounded-lg"
                  />
                  <span className="text-sm text-gray-700">{s.email}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Comments */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <h2 className="text-base font-bold text-gray-900">Latest Comments</h2>
            <Link
              href="/admin/blog"
              className="ml-auto text-xs font-semibold text-primary-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {comments.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No comments found
              </li>
            ) : (
              comments.map((c, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-4">
                  <img
                    src={gravatar(c.email)}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{c.name}</h3>
                      {c.approved ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                          Approved
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          Not Approved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{c.email}</p>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{c.content}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
