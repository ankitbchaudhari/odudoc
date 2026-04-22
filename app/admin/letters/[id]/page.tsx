// Print-ready view of a generated doctor letter. Styled for A4 paper and
// reads cleanly from the browser's "Save as PDF" dialog. No client JS
// needed beyond a "Print" button — everything renders server-side.

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLetterById, reloadLetters } from "@/lib/doctor-letters";
import PrintButton from "./PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function fmtMoney(n: number | undefined): string {
  if (n === undefined) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function LetterViewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Forbidden</h1>
        <p className="mt-2 text-sm text-gray-500">You must be signed in as an admin to view letters.</p>
      </div>
    );
  }

  let letter = getLetterById(params.id);
  if (!letter) {
    // The letter may have been created on another Lambda moments ago;
    // refresh from the DB before giving up.
    await reloadLetters();
    letter = getLetterById(params.id);
  }
  if (!letter) return notFound();

  const isAppointment = letter.type === "appointment";

  return (
    <>
      {/* Print-specific styles: strip the admin chrome and force A4 margins. */}
      <style>{`
        @page { size: A4; margin: 20mm 18mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .letter-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
          aside, header, nav { display: none !important; }
        }
        .letter-sheet {
          background: white;
          color: #111827;
          font-family: "Georgia", "Times New Roman", serif;
          line-height: 1.6;
          padding: 48px 56px;
          max-width: 800px;
          margin: 24px auto;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
          border-radius: 4px;
        }
        .letter-sheet h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; margin: 0; color: #0f766e; }
        .letter-sheet h2 { font-size: 16px; font-weight: 700; margin: 24px 0 12px; text-align: center; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #0f766e; padding-bottom: 8px; }
        .letter-sheet p { margin: 0 0 12px; }
        .letter-head { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom: 18px; border-bottom: 3px double #0f766e; }
        .letter-head .brand { font-size: 13px; color: #6b7280; }
        .letter-meta { display:flex; justify-content:space-between; margin: 20px 0 24px; font-size: 13px; color: #374151; }
        .sign-block { margin-top: 56px; }
        .sign-block .sig-line { display: inline-block; border-bottom: 1px solid #374151; min-width: 220px; height: 32px; }
      `}</style>

      <div className="no-print mx-auto flex max-w-4xl items-center justify-between px-6 pt-6">
        <a href="/admin/letters" className="text-sm text-primary-600 hover:underline">← Back to letters</a>
        <PrintButton />
      </div>

      <div className="letter-sheet">
        <div className="letter-head">
          <div>
            <h1>OduDoc</h1>
            <div className="brand">Online Doctor Consultations · www.odudoc.com</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280" }}>
            <div>OduDoc Healthcare Pvt. Ltd.</div>
            <div>admin@odudoc.com</div>
          </div>
        </div>

        <div className="letter-meta">
          <div><strong>Ref:</strong> {letter.referenceNo}</div>
          <div><strong>Date:</strong> {fmtDate(letter.issuedOn)}</div>
        </div>

        <p>
          <strong>To,</strong><br />
          Dr. {letter.doctorName}<br />
          {letter.doctorEmail}
        </p>

        <h2>{isAppointment ? "Letter of Appointment" : "Experience Certificate"}</h2>

        {isAppointment ? (
          <>
            <p>Dear Dr. {letter.doctorName},</p>

            <p>
              We are pleased to offer you the position of <strong>{letter.designation}</strong> in the
              <strong> {letter.department}</strong> department at OduDoc, effective <strong>{fmtDate(letter.joiningDate)}</strong>.
              The terms of your engagement are summarised below.
            </p>

            <p style={{ marginTop: 16 }}>
              <strong>Terms of engagement</strong>
            </p>
            <ul style={{ paddingLeft: 22, margin: "0 0 12px" }}>
              <li><strong>Position:</strong> {letter.designation} — {letter.department}</li>
              <li><strong>Date of joining:</strong> {fmtDate(letter.joiningDate)}</li>
              {letter.workLocation && <li><strong>Work location:</strong> {letter.workLocation}</li>}
              {letter.ctcAnnual !== undefined && <li><strong>Annual CTC:</strong> {fmtMoney(letter.ctcAnnual)}</li>}
              {letter.probationMonths !== undefined && <li><strong>Probation:</strong> {letter.probationMonths} months</li>}
              {letter.noticePeriodDays !== undefined && <li><strong>Notice period:</strong> {letter.noticePeriodDays} days</li>}
            </ul>

            <p>
              You will be bound by OduDoc&apos;s code of conduct, patient-confidentiality policy, and medical
              practice standards. Appointment is contingent on successful verification of credentials
              and satisfactory completion of probation.
            </p>

            <p>
              Please sign and return a copy of this letter as confirmation of your acceptance.
              We look forward to welcoming you to the OduDoc care team.
            </p>
          </>
        ) : (
          <>
            <p>To whom it may concern,</p>

            <p>
              This is to certify that <strong>Dr. {letter.doctorName}</strong> was associated with OduDoc as a
              <strong> {letter.designation}</strong> in the <strong>{letter.department}</strong> department from
              <strong> {fmtDate(letter.startDate)}</strong> to <strong>{fmtDate(letter.endDate)}</strong>.
            </p>

            <p>
              {letter.conductRemarks || "Throughout this tenure the doctor discharged all duties with integrity, diligence, and professionalism."}
            </p>

            <p>
              We wish Dr. {letter.doctorName.split(" ").slice(-1)[0]} the very best in future endeavours.
            </p>
          </>
        )}

        {letter.notes && (
          <>
            <p style={{ marginTop: 16 }}><strong>Additional notes</strong></p>
            <p>{letter.notes}</p>
          </>
        )}

        <div className="sign-block">
          <p>Sincerely,</p>
          <div style={{ marginTop: 40 }}>
            <div className="sig-line" />
            <div style={{ marginTop: 6 }}>
              <strong>{letter.signedBy}</strong><br />
              <span style={{ fontSize: 13, color: "#4b5563" }}>{letter.signedByTitle}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
