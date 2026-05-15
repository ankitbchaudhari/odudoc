import { notFound } from "next/navigation";
import { getPrescription, reloadPrescriptions } from "@/lib/prescriptions-store";
import { PRESCRIPTION_TEMPLATES } from "@/lib/prescription-templates";
import PrescriptionRenderer from "@/components/PrescriptionRenderer";
import PrintBar from "./PrintBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PrescriptionViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Cross-Lambda freshness — Rx may have been issued seconds ago on
  // a sibling Lambda; without reload the patient's link from the
  // post-visit email would 404.
  await reloadPrescriptions();
  const rx = getPrescription(id);
  if (!rx) notFound();

  const template =
    PRESCRIPTION_TEMPLATES.find((t) => t.id === rx.templateId) ||
    PRESCRIPTION_TEMPLATES[0];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-800 py-8 print:bg-white dark:bg-slate-900 print:py-0">
      <style>{`
        @media print {
          body { background: white !important; }
          header, footer, nav, .print\\:hidden { display: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-4xl px-4 print:max-w-none print:px-0">
        <PrintBar prescriptionId={rx.id} />
        <div id="rx-printable" className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-lg">
          <PrescriptionRenderer template={template} data={rx.data} />
        </div>
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-slate-400">
          Prescription ID: {rx.id} · Issued on {new Date(rx.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
