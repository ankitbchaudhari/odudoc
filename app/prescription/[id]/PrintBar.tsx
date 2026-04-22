"use client";

import Link from "next/link";

export default function PrintBar({ prescriptionId }: { prescriptionId: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm print:hidden">
      <div>
        <p className="text-sm font-semibold text-gray-900">Your prescription</p>
        <p className="text-xs text-gray-500">Print or save as PDF (use your browser&apos;s Save as PDF option)</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => window.print()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          Download PDF / Print
        </button>
        <Link href={`/shop?rx=${prescriptionId}`}
          className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50">
          Buy medicines
        </Link>
      </div>
    </div>
  );
}
