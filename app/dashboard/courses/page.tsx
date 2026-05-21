"use client";

// My Learning — V8 §1 student-facing enrolments view.

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";
import { useSession } from "next-auth/react";

interface Enrolment {
  id: string; courseId: string; courseTitle: string; courseSlug: string;
  enrolledAt: string; completedAt?: string;
  feeCharged: boolean; paidCents: number; currency: string;
}

export default function MyLearningPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role || "patient";
  const dashboardRole: "patient" | "doctor" | "corporate" =
    role === "doctor" ? "doctor"
    : role === "admin" || role === "staff" || role === "hr" || role === "support" ? "corporate"
    : "patient";

  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/courses/me", { cache: "no-store" });
      if (r.ok) setEnrolments((await r.json()).enrolments || []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardShell role={dashboardRole}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] bg-clip-text text-transparent">My Learning</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Your enrolled courses. CME and certification progress.
          </p>
        </div>
        <Link href="/courses" className="rounded-xl bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5 transition-transform">
          Browse all courses
        </Link>
      </div>

      {loading ? (
        <GlassCard><div className="py-10 text-center"><svg className="mx-auto h-8 w-8 animate-spin text-[#1D9E75]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none"/></svg></div></GlassCard>
      ) : enrolments.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-5xl">🎓</div>
            <h2 className="text-xl font-bold text-white">You haven&apos;t enrolled in any courses yet.</h2>
            <p className="text-sm text-white/70">Browse the OduDoc Academy catalogue to start learning.</p>
            <Link href="/courses" className="mt-2 rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white">Browse courses</Link>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {enrolments.map((e) => (
            <Link key={e.id} href={`/courses/${e.courseSlug}`} className="block">
              <GlassCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{e.courseTitle}</p>
                    <p className="mt-1 text-xs text-white/60">
                      Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                      {e.feeCharged && ` · ${e.currency === "INR" ? "₹" : "$"}${(e.paidCents / 100).toLocaleString()} paid`}
                    </p>
                    {e.completedAt && (
                      <span className="mt-2 inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                        ✓ Completed {new Date(e.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
