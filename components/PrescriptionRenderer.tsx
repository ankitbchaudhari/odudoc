import type { PrescriptionData, PrescriptionTemplate } from "@/lib/prescription-templates";

export default function PrescriptionRenderer({
  template,
  data,
}: {
  template: PrescriptionTemplate;
  data: PrescriptionData;
}) {
  const color = template.accentColor;
  switch (template.id) {
    case "classic-blue":
      return <ClassicBlue color={color} data={data} />;
    case "modern-minimal":
      return <ModernMinimal color={color} data={data} />;
    case "teal-gradient":
      return <TealGradient color={color} data={data} />;
    case "corporate-navy":
      return <CorporateNavy color={color} data={data} />;
    case "emerald-fresh":
      return <EmeraldFresh color={color} data={data} />;
    case "rose-elegance":
      return <RoseElegance color={color} data={data} />;
    case "purple-royal":
      return <PurpleRoyal color={color} data={data} />;
    case "orange-sunshine":
      return <OrangeSunshine color={color} data={data} />;
    case "dark-elegant":
      return <DarkElegant color={color} data={data} />;
    case "watermark-rx":
      return <WatermarkRx color={color} data={data} />;
    case "double-column":
      return <DoubleColumn color={color} data={data} />;
    case "bordered-formal":
      return <BorderedFormal color={color} data={data} />;
    case "pediatric-playful":
      return <PediatricPlayful color={color} data={data} />;
    case "dental-clean":
      return <DentalClean color={color} data={data} />;
    case "telehealth-digital":
      return <TelehealthDigital color={color} data={data} />;
    case "sunset-gradient":
      return <SunsetGradient color={color} data={data} />;
    case "midnight-navy":
      return <MidnightNavy color={color} data={data} />;
    case "soft-pastel":
      return <SoftPastel color={color} data={data} />;
    case "clinical-grid":
      return <ClinicalGrid color={color} data={data} />;
    case "bold-contrast":
      return <BoldContrast color={color} data={data} />;
    case "eco-green":
      return <EcoGreen color={color} data={data} />;
    case "crimson-red":
      return <CrimsonRed color={color} data={data} />;
    case "sky-breeze":
      return <SkyBreeze color={color} data={data} />;
    default:
      return <ClassicBlue color={color} data={data} />;
  }
}

// Shared bits ------------------------------
type Props = { color: string; data: PrescriptionData };

const LOGO_SRC = "/images/odudoc-logo-final.svg";

// Header logo — replaces the old text clinic-name + Rx badge combo.
function HeaderLogo({ className = "h-12", style }: { className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC} alt="OduDoc" className={className} style={style} />;
}

// Subtle centered watermark layer. Drop directly inside any `relative` root.
function Watermark({ opacity = 0.05, widthPct = 70, maxWidth = 520 }: { opacity?: number; widthPct?: number; maxWidth?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ opacity }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
        style={{ width: `${widthPct}%`, maxWidth, transform: "rotate(-12deg)" }}
      />
    </div>
  );
}

function MedTable({ data, color }: { data: PrescriptionData; color: string }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2" style={{ borderColor: color }}>
          <th className="py-2 text-left font-bold" style={{ color }}>Medicine</th>
          <th className="py-2 text-left font-bold" style={{ color }}>Dose</th>
          <th className="py-2 text-left font-bold" style={{ color }}>Frequency</th>
          <th className="py-2 text-left font-bold" style={{ color }}>Duration</th>
        </tr>
      </thead>
      <tbody>
        {data.medications.map((m, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="py-2 font-semibold">{m.name}</td>
            <td className="py-2">{m.dose}</td>
            <td className="py-2">{m.frequency}</td>
            <td className="py-2">{m.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MedList({ data, color }: { data: PrescriptionData; color: string }) {
  return (
    <ol className="space-y-2 text-sm">
      {data.medications.map((m, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: color }}>
            {i + 1}
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{m.name}</p>
            <p className="text-xs text-gray-600 dark:text-slate-300">{m.dose} · {m.frequency} · {m.duration}</p>
            {m.instructions && <p className="text-xs italic text-gray-500 dark:text-slate-400">{m.instructions}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function PatientRow({ data }: { data: PrescriptionData }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
      <div><span className="text-xs text-gray-500 dark:text-slate-400">Patient</span><p className="font-semibold">{data.patientName}</p></div>
      <div><span className="text-xs text-gray-500 dark:text-slate-400">Age / Sex</span><p className="font-semibold">{data.patientAge} / {data.patientGender}</p></div>
      <div><span className="text-xs text-gray-500 dark:text-slate-400">Patient ID</span><p className="font-semibold">{data.patientId || "-"}</p></div>
      <div><span className="text-xs text-gray-500 dark:text-slate-400">Date</span><p className="font-semibold">{data.date}</p></div>
    </div>
  );
}

// Decorative brand mark — small circular Rx badge tinted with the template's
// accent color. Kept for footer/seal use even though headers now use the logo.
function BrandMark({ color, size = 44, inverted = false }: { color: string; size?: number; inverted?: boolean }) {
  const bg = inverted ? "rgba(255,255,255,0.15)" : color;
  const fg = inverted ? "#ffffff" : "#ffffff";
  const ring = inverted ? "rgba(255,255,255,0.35)" : `${color}33`;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        boxShadow: `0 0 0 4px ${ring}`,
        fontFamily: "Georgia, serif",
      }}
      className="flex items-center justify-center rounded-full font-bold"
    >
      <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>℞</span>
    </div>
  );
}

function Signature({ data, color }: { data: PrescriptionData; color: string }) {
  return (
    <div className="mt-8 text-right">
      <div className="inline-block">
        <p className="font-signature text-2xl italic" style={{ color }}>{data.signature || data.doctorName}</p>
        <p className="border-t border-gray-300 dark:border-slate-700 pt-1 text-xs font-semibold">{data.doctorName}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{data.doctorQualification}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{data.doctorRegistration}</p>
      </div>
    </div>
  );
}

/** Tests Advised block — used by every template that renders one or
 *  more recommended investigations. Kept minimal so it slots into
 *  every layout (table-row, two-column, full-width) without forcing
 *  per-template styling. Templates that already had a custom tests
 *  block (e.g. DoubleColumn) keep theirs. */
function TestsBlock({ data, color }: { data: PrescriptionData; color: string }) {
  if (!data.tests || data.tests.length === 0) return null;
  return (
    <div className="mt-4">
      <p
        className="mb-1.5 text-xs font-semibold uppercase tracking-wider"
        style={{ color }}
      >
        Tests Advised
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {data.tests.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

// ============ 1. Classic Blue ============
function ClassicBlue({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Georgia, serif" }}>
      <Watermark />
      <div className="relative">
        <header className="border-b-2 pb-4" style={{ borderColor: color }}>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{data.clinicAddress}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{data.doctorName}</p>
              <p className="text-xs text-gray-600 dark:text-slate-300">{data.doctorQualification}</p>
              <p className="text-xs text-gray-600 dark:text-slate-300">{data.doctorSpecialty}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{data.doctorRegistration}</p>
            </div>
          </div>
        </header>
        <div className="my-5"><PatientRow data={data} /></div>
        <div className="relative">
          <span className="absolute -left-1 -top-2 text-7xl font-bold opacity-10" style={{ color }}>℞</span>
          <div className="pl-16">
            {data.diagnosis && <p className="mb-3 text-sm"><span className="font-bold">Diagnosis:</span> {data.diagnosis}</p>}
            <MedTable data={data} color={color} />
            {data.advice && <p className="mt-4 text-sm"><span className="font-bold">Advice:</span> {data.advice}</p>}
            {data.followUp && <p className="mt-2 text-sm"><span className="font-bold">Follow-up:</span> {data.followUp}</p>}
          </div>
        </div>
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 2. Modern Minimal ============
function ModernMinimal({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-10 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Inter, sans-serif" }}>
      <Watermark />
      <div className="relative">
        <header className="mb-8 flex items-center gap-4">
          <HeaderLogo className="h-14" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Prescription</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{data.doctorName} · {data.doctorSpecialty}</p>
          </div>
        </header>
        <div className="mb-8 border-y border-gray-900 py-4"><PatientRow data={data} /></div>
        {data.diagnosis && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Diagnosis</p>
            <p className="mt-1 text-base">{data.diagnosis}</p>
          </div>
        )}
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Medications</p>
          <MedList data={data} color={color} />
        </div>
        {data.advice && <p className="mb-2 text-sm"><span className="font-semibold">Advice: </span>{data.advice}</p>}
        {data.followUp && <p className="text-sm"><span className="font-semibold">Follow-up: </span>{data.followUp}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 3. Teal Gradient ============
function TealGradient({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${color}, #06B6D4)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="mt-1 text-sm opacity-90">{data.clinicAddress}</p>
                <p className="text-xs opacity-80">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">℞</div>
          </div>
        </header>
        <div className="p-8">
          <div className="rounded-lg bg-gray-50 dark:bg-slate-900 p-4">
            <PatientRow data={data} />
          </div>
          <div className="mt-5 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>Doctor</p>
            <p className="font-semibold">{data.doctorName} · {data.doctorSpecialty}</p>
          </div>
          {data.diagnosis && <p className="mb-4 rounded-lg bg-teal-50 p-3 text-sm"><b>Dx: </b>{data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm italic text-gray-600 dark:text-slate-300">{data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 4. Corporate Navy ============
function CorporateNavy({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="flex items-center justify-between p-6 text-white" style={{ background: color }}>
          <div className="flex items-center gap-4">
            <HeaderLogo className="h-12" />
            <div>
              <p className="text-xs opacity-80">{data.clinicAddress}</p>
              <p className="text-xs opacity-80">{data.clinicPhone} · {data.clinicEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">{data.doctorName}</p>
            <p className="text-xs opacity-80">{data.doctorQualification}</p>
          </div>
        </header>
        <div className="h-1" style={{ background: "#D4AF37" }} />
        <div className="p-8">
          <h2 className="mb-4 text-center text-xl font-bold" style={{ color }}>PRESCRIPTION</h2>
          <div className="mb-5"><PatientRow data={data} /></div>
          {data.diagnosis && <p className="mb-4 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm"><b>Advice: </b>{data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 5. Emerald Fresh ============
function EmeraldFresh({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="mb-6 flex items-center gap-4">
          <HeaderLogo className="h-12" />
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">{data.doctorName} · {data.doctorSpecialty}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{data.clinicAddress}</p>
          </div>
        </header>
        <div className="mb-5 rounded-xl border-l-4 p-4" style={{ borderColor: color, background: "#ECFDF5" }}>
          <PatientRow data={data} />
        </div>
        {data.diagnosis && <p className="mb-3 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
        <MedList data={data} color={color} />
        {data.advice && <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm italic">{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 6. Rose Elegance ============
function RoseElegance({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
      <Watermark />
      <div className="relative">
        <header className="mb-6 flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-widest" style={{ color }}>— Prescription —</p>
          <HeaderLogo className="mt-2 h-14" />
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{data.doctorName}, {data.doctorQualification}</p>
        </header>
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl p-4" style={{ background: "#FFF1F2" }}>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">Patient</span><p className="font-semibold">{data.patientName}</p></div>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">Date</span><p className="font-semibold">{data.date}</p></div>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">Age/Sex</span><p className="font-semibold">{data.patientAge} / {data.patientGender}</p></div>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">ID</span><p className="font-semibold">{data.patientId}</p></div>
        </div>
        {data.diagnosis && <p className="mb-4 text-sm"><b style={{ color }}>Diagnosis: </b>{data.diagnosis}</p>}
        <MedTable data={data} color={color} />
        {data.advice && <p className="mt-5 border-l-4 pl-4 text-sm italic" style={{ borderColor: color }}>{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 7. Purple Royal ============
function PurpleRoyal({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="p-6" style={{ background: color, color: "white" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-xs opacity-80">{data.clinicAddress}</p>
                <p className="text-xs opacity-80">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="text-right text-xs opacity-90">
              <p className="font-bold text-base">{data.doctorName}</p>
              <p>{data.doctorSpecialty}</p>
            </div>
          </div>
        </header>
        <div className="p-8">
          <div className="mb-5"><PatientRow data={data} /></div>
          {data.diagnosis && <p className="mb-4 text-sm"><b>Dx: </b>{data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm italic text-gray-600 dark:text-slate-300">{data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 8. Orange Sunshine ============
function OrangeSunshine({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="mb-5 flex items-center justify-between rounded-2xl p-4" style={{ background: "#FFEDD5" }}>
          <div className="flex items-center gap-3">
            <HeaderLogo className="h-10" />
            <p className="text-xs text-gray-600 dark:text-slate-300">{data.doctorName} · {data.doctorSpecialty}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white" style={{ background: color }}>☀</div>
        </header>
        <PatientRow data={data} />
        <div className="my-5 h-px" style={{ background: color }} />
        {data.diagnosis && <p className="mb-3 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
        <MedList data={data} color={color} />
        {data.advice && <p className="mt-4 text-sm"><b>Advice: </b>{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 9. Dark Elegant ============
function DarkElegant({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-slate-900 p-8 text-white">
      <Watermark opacity={0.07} />
      <div className="relative">
        <header className="mb-6 flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-4">
            <HeaderLogo className="h-12" />
            <div>
              <p className="text-xs text-slate-400">{data.clinicAddress}</p>
              <p className="text-xs text-slate-400">{data.clinicPhone} · {data.clinicEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">{data.doctorName}</p>
            <p className="text-xs text-slate-400">{data.doctorQualification}</p>
          </div>
        </header>
        <div className="mb-5 grid grid-cols-4 gap-3 text-sm">
          <div><span className="text-xs text-slate-400">Patient</span><p className="font-semibold">{data.patientName}</p></div>
          <div><span className="text-xs text-slate-400">Age/Sex</span><p className="font-semibold">{data.patientAge}/{data.patientGender}</p></div>
          <div><span className="text-xs text-slate-400">ID</span><p className="font-semibold">{data.patientId}</p></div>
          <div><span className="text-xs text-slate-400">Date</span><p className="font-semibold">{data.date}</p></div>
        </div>
        {data.diagnosis && <p className="mb-4 text-sm"><b>Dx: </b>{data.diagnosis}</p>}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700"><th className="py-2 text-left text-slate-400">Medicine</th><th className="py-2 text-left text-slate-400">Dose</th><th className="py-2 text-left text-slate-400">Frequency</th><th className="py-2 text-left text-slate-400">Duration</th></tr>
          </thead>
          <tbody>
            {data.medications.map((m, i) => (
              <tr key={i} className="border-b border-slate-800"><td className="py-2 font-semibold">{m.name}</td><td className="py-2">{m.dose}</td><td className="py-2">{m.frequency}</td><td className="py-2">{m.duration}</td></tr>
            ))}
          </tbody>
        </table>
        <TestsBlock data={data} color={color} />
        {data.advice && <p className="mt-4 text-sm italic text-slate-300">{data.advice}</p>}
        <div className="mt-8 text-right text-sm">
          <p className="text-2xl italic" style={{ color: "#60A5FA" }}>{data.signature || data.doctorName}</p>
          <p className="mt-1 border-t border-slate-700 pt-1 text-xs">{data.doctorName} · {data.doctorRegistration}</p>
        </div>
      </div>
    </div>
  );
}

// ============ 10. Watermark Rx ============
// The signature template — watermark IS the centrepiece, so render it big and
// slightly more opaque than the default. No rotated tilt — sits dead-centre.
function WatermarkRx({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ opacity: 0.08 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="" style={{ width: "85%", maxWidth: 640 }} />
      </div>
      <div className="relative">
        <header className="mb-4 flex flex-col items-center text-center">
          <HeaderLogo className="h-14" />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{data.clinicAddress} · {data.clinicPhone}</p>
          <p className="mt-1 text-sm font-semibold">{data.doctorName} ({data.doctorQualification})</p>
        </header>
        <div className="my-5 border-y-2 py-3" style={{ borderColor: color }}><PatientRow data={data} /></div>
        {data.diagnosis && <p className="mb-4 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
        <MedTable data={data} color={color} />
        {data.advice && <p className="mt-4 text-sm"><b>Advice: </b>{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 11. Double Column ============
function DoubleColumn({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="flex items-center justify-between gap-4 p-5 text-white" style={{ background: color }}>
          <HeaderLogo className="h-11" />
          <p className="text-xs opacity-90 text-right">{data.doctorName} · {data.doctorSpecialty} · {data.doctorRegistration}</p>
        </header>
        <div className="grid grid-cols-3 gap-6 p-6">
          <aside className="col-span-1 space-y-3 text-sm">
            <div><p className="text-xs text-gray-500 dark:text-slate-400">Patient</p><p className="font-semibold">{data.patientName}</p></div>
            <div><p className="text-xs text-gray-500 dark:text-slate-400">Age/Sex</p><p className="font-semibold">{data.patientAge}/{data.patientGender}</p></div>
            <div><p className="text-xs text-gray-500 dark:text-slate-400">Patient ID</p><p className="font-semibold">{data.patientId}</p></div>
            <div><p className="text-xs text-gray-500 dark:text-slate-400">Phone</p><p className="font-semibold">{data.patientPhone}</p></div>
            <div><p className="text-xs text-gray-500 dark:text-slate-400">Date</p><p className="font-semibold">{data.date}</p></div>
            {data.symptoms && <div><p className="text-xs text-gray-500 dark:text-slate-400">Symptoms</p><p className="text-sm">{data.symptoms}</p></div>}
            {data.diagnosis && <div><p className="text-xs text-gray-500 dark:text-slate-400">Diagnosis</p><p className="text-sm font-semibold">{data.diagnosis}</p></div>}
          </aside>
          <main className="col-span-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color }}>℞ Medications</p>
            <MedList data={data} color={color} />
            <TestsBlock data={data} color={color} />
            {data.advice && <p className="mt-4 text-sm"><b>Advice: </b>{data.advice}</p>}
            <Signature data={data} color={color} />
          </main>
        </div>
      </div>
    </div>
  );
}

// ============ 12. Bordered Formal ============
function BorderedFormal({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-4" style={{ background: "#FEFCE8" }}>
      <Watermark />
      <div className="relative border-4 p-6" style={{ borderColor: color }}>
        <div className="border p-6" style={{ borderColor: color }}>
          <header className="mb-5 flex flex-col items-center text-center">
            <p className="text-xs uppercase tracking-widest" style={{ color }}>— Medical Prescription —</p>
            <HeaderLogo className="mt-2 h-14" />
            <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">{data.clinicAddress}</p>
            <p className="text-xs text-gray-600 dark:text-slate-300">{data.doctorName} · {data.doctorQualification} · {data.doctorRegistration}</p>
          </header>
          <div className="my-4 h-px" style={{ background: color }} />
          <PatientRow data={data} />
          <div className="my-4 h-px" style={{ background: color }} />
          {data.diagnosis && <p className="mb-3 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm italic">{data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 13. Pediatric Playful ============
function PediatricPlayful({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden p-8 text-gray-900 dark:text-slate-100" style={{ background: "#FEF3C7" }}>
      <Watermark />
      <div className="relative rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-lg">
        <header className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl" style={{ background: color }}>🧸</div>
          <HeaderLogo className="h-11" />
          <p className="text-sm text-gray-600 dark:text-slate-300">{data.doctorName} · {data.doctorSpecialty}</p>
        </header>
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl p-4" style={{ background: "#FEF9C3" }}>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">👶 Patient</span><p className="font-semibold">{data.patientName}</p></div>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">🎂 Age</span><p className="font-semibold">{data.patientAge}</p></div>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">📅 Date</span><p className="font-semibold">{data.date}</p></div>
          <div><span className="text-xs text-gray-500 dark:text-slate-400">🆔 ID</span><p className="font-semibold">{data.patientId}</p></div>
        </div>
        {data.diagnosis && <p className="mb-3 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
        <MedList data={data} color={color} />
        {data.advice && <p className="mt-4 rounded-2xl p-3 text-sm italic" style={{ background: "#FFEDD5" }}>💡 {data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 14. Dental Clean ============
function DentalClean({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-10 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: color }}>
          <div className="flex items-center gap-3">
            <HeaderLogo className="h-12" />
            <p className="text-xs text-gray-500 dark:text-slate-400">Dental Care · {data.doctorName}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">{data.date}</p>
        </header>
        <PatientRow data={data} />
        <div className="my-5 h-px bg-gray-100 dark:bg-slate-800" />
        {data.diagnosis && <p className="mb-3 text-sm"><b>Diagnosis: </b>{data.diagnosis}</p>}
        <MedTable data={data} color={color} />
        {data.advice && <p className="mt-4 text-sm"><b>Aftercare: </b>{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 15. Telehealth Digital ============
function TelehealthDigital({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="p-5" style={{ background: `linear-gradient(90deg, ${color} 0%, #60A5FA 100%)`, color: "white" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HeaderLogo className="h-11" />
              <p className="text-xs opacity-90">Telehealth e-Prescription</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold">{data.doctorName}</p>
              <p className="opacity-90">{data.doctorSpecialty}</p>
            </div>
          </div>
        </header>
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex-1">
              <PatientRow data={data} />
            </div>
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-300 dark:border-slate-700 text-[10px] text-gray-400 dark:text-slate-500">
              QR Code
            </div>
          </div>
          {data.diagnosis && <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm"><b>Dx: </b>{data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          <TestsBlock data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm"><b>Advice: </b>{data.advice}</p>}
          <div className="mt-6 flex items-end justify-between">
            <div className="text-xs text-gray-500 dark:text-slate-400">
              <p>e-Signed · Verified ✓</p>
              <p className="mt-1">{data.date}</p>
            </div>
            <div className="text-right">
              <p className="text-xl italic" style={{ color }}>{data.signature || data.doctorName}</p>
              <p className="border-t border-gray-300 dark:border-slate-700 pt-1 text-xs font-semibold">{data.doctorName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{data.doctorRegistration}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 16. Sunset Gradient ============
function SunsetGradient({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${color}, #EC4899)` }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="mt-1 text-sm opacity-90">{data.clinicAddress}</p>
                <p className="text-xs opacity-80">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{data.doctorName}</p>
              <p className="text-xs opacity-80">{data.doctorSpecialty}</p>
            </div>
          </div>
        </header>
        <div className="p-8">
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-rose-50 p-4"><PatientRow data={data} /></div>
          {data.diagnosis && <p className="my-4 rounded-lg border-l-4 p-3 text-sm" style={{ borderColor: color, background: "#FFF7ED" }}><b>Dx: </b>{data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm text-gray-700 dark:text-slate-300"><b>Advice: </b>{data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 17. Midnight Navy ============
function MidnightNavy({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <Watermark />
      <div className="relative">
        <header className="relative overflow-hidden p-8 text-white" style={{ background: color }}>
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full" style={{ background: "#06B6D4", opacity: 0.15 }} />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-200">Medical Prescription</p>
                <p className="text-xs opacity-80">{data.clinicAddress}</p>
                <p className="text-xs opacity-80">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{data.doctorName}</p>
              <p className="text-xs text-cyan-200">{data.doctorQualification}</p>
              <p className="text-xs opacity-80">{data.doctorRegistration}</p>
            </div>
          </div>
        </header>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #06B6D4, #0F172A)" }} />
        <div className="p-8">
          <div className="mb-5"><PatientRow data={data} /></div>
          {data.diagnosis && <p className="mb-4 text-sm"><b style={{ color }}>Diagnosis:</b> {data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm"><b style={{ color }}>Advice:</b> {data.advice}</p>}
          {data.followUp && <p className="mt-2 text-sm"><b style={{ color }}>Follow-up:</b> {data.followUp}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 18. Soft Pastel ============
function SoftPastel({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Inter, sans-serif" }}>
      <Watermark />
      <div className="relative">
        <header className="mb-6 rounded-3xl p-6" style={{ background: "linear-gradient(135deg, #F3E8FF, #FCE7F3)" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-xs text-gray-600 dark:text-slate-300">{data.clinicAddress}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-right backdrop-blur-sm">
              <p className="font-bold" style={{ color: "#6B21A8" }}>{data.doctorName}</p>
              <p className="text-xs text-gray-600 dark:text-slate-300">{data.doctorSpecialty}</p>
            </div>
          </div>
        </header>
        <div className="mb-5 rounded-2xl border border-purple-100 p-4"><PatientRow data={data} /></div>
        {data.diagnosis && <p className="mb-4 rounded-xl bg-purple-50 p-3 text-sm"><b style={{ color }}>Diagnosis:</b> {data.diagnosis}</p>}
        <MedTable data={data} color={color} />
        {data.advice && <p className="mt-4 text-sm text-gray-700 dark:text-slate-300">{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 19. Clinical Grid ============
function ClinicalGrid({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Courier New, monospace" }}>
      <Watermark />
      <div className="relative">
        <header className="mb-4 border-2 p-4" style={{ borderColor: color }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <HeaderLogo className="h-11" />
              <div>
                <p className="text-[11px] text-gray-600 dark:text-slate-300">{data.clinicAddress}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">{data.clinicPhone}</p>
              </div>
            </div>
            <div className="border-l-2 pl-4 text-right" style={{ borderColor: color }}>
              <p className="text-sm font-bold">{data.doctorName}</p>
              <p className="text-[11px]">{data.doctorQualification}</p>
              <p className="text-[11px]">{data.doctorSpecialty}</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">{data.doctorRegistration}</p>
            </div>
          </div>
        </header>
        <div className="mb-4 grid grid-cols-4 border-2 text-sm" style={{ borderColor: color }}>
          <GridCell label="PATIENT" value={data.patientName} color={color} />
          <GridCell label="AGE/SEX" value={`${data.patientAge} / ${data.patientGender}`} color={color} />
          <GridCell label="ID" value={data.patientId || "-"} color={color} />
          <GridCell label="DATE" value={data.date} color={color} />
        </div>
        {data.diagnosis && <div className="mb-3 border-l-4 bg-gray-50 dark:bg-slate-900 p-2 text-sm" style={{ borderColor: color }}><b>DIAGNOSIS:</b> {data.diagnosis}</div>}
        <div className="border" style={{ borderColor: color }}>
          <MedTable data={data} color={color} />
        </div>
        {data.advice && <p className="mt-3 text-xs"><b>ADVICE:</b> {data.advice}</p>}
        {data.followUp && <p className="mt-1 text-xs"><b>FOLLOW-UP:</b> {data.followUp}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

function GridCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border-r p-2 last:border-r-0" style={{ borderColor: color }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
      <p className="mt-0.5 font-semibold">{value || "-"}</p>
    </div>
  );
}

// ============ 20. Bold Contrast ============
function BoldContrast({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Impact, Arial Black, sans-serif" }}>
      <Watermark />
      <div className="relative">
        <header className="mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-2" style={{ background: color }} />
            <HeaderLogo className="h-14" />
            <div style={{ fontFamily: "Arial, sans-serif" }}>
              <p className="text-xs text-gray-600 dark:text-slate-300">{data.clinicAddress}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{data.clinicPhone} · {data.clinicEmail}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-y-4 py-3" style={{ borderColor: color }}>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-slate-400">Prescription</p>
            <p className="text-sm font-bold">{data.doctorName}</p>
          </div>
        </header>
        <div className="mb-5" style={{ fontFamily: "Arial, sans-serif" }}><PatientRow data={data} /></div>
        {data.diagnosis && <p className="mb-4 bg-gray-900 p-3 text-sm text-white" style={{ fontFamily: "Arial, sans-serif" }}><b>DX: </b>{data.diagnosis}</p>}
        <div style={{ fontFamily: "Arial, sans-serif" }}>
          <MedTable data={data} color={color} />
        </div>
        {data.advice && <p className="mt-4 text-sm" style={{ fontFamily: "Arial, sans-serif" }}>{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}

// ============ 21. Eco Green ============
function EcoGreen({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Georgia, serif" }}>
      <Watermark />
      <div className="relative">
        <header className="relative overflow-hidden p-8" style={{ background: "linear-gradient(135deg, #ECFCCB, #D9F99D)" }}>
          <div className="absolute -right-4 top-2 text-[120px] opacity-20">🌿</div>
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-xs text-gray-700 dark:text-slate-300">{data.clinicAddress}</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold" style={{ color: "#3F6212" }}>{data.doctorName}</p>
              <p className="text-xs text-gray-700 dark:text-slate-300">{data.doctorSpecialty}</p>
            </div>
          </div>
        </header>
        <div className="h-1" style={{ background: color }} />
        <div className="p-8">
          <div className="mb-5 rounded-xl bg-lime-50 p-4"><PatientRow data={data} /></div>
          {data.diagnosis && <p className="mb-4 text-sm"><b style={{ color }}>Diagnosis:</b> {data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm italic">🍃 {data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 22. Crimson Red ============
function CrimsonRed({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Georgia, serif" }}>
      <Watermark />
      <div className="relative">
        <header className="p-6 text-white" style={{ background: color }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-xs opacity-90">{data.clinicAddress}</p>
                <p className="text-xs opacity-80">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{data.doctorName}</p>
              <p className="text-xs opacity-80">{data.doctorQualification}</p>
              <p className="text-xs opacity-80">{data.doctorRegistration}</p>
            </div>
          </div>
        </header>
        <div className="h-1" style={{ background: "#FBBF24" }} />
        <div className="p-8">
          <div className="mb-5 border-y-2 py-3" style={{ borderColor: color }}><PatientRow data={data} /></div>
          {data.diagnosis && <p className="mb-4 text-sm"><b style={{ color }}>Diagnosis:</b> {data.diagnosis}</p>}
          <MedTable data={data} color={color} />
          {data.advice && <p className="mt-4 text-sm">{data.advice}</p>}
          <TestsBlock data={data} color={color} />
          <Signature data={data} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============ 23. Sky Breeze ============
function SkyBreeze({ color, data }: Props) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 text-gray-900 dark:text-slate-100" style={{ fontFamily: "Inter, sans-serif" }}>
      <Watermark />
      <div className="relative">
        <header className="mb-6 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-12" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-600">Prescription</p>
                <p className="text-xs text-gray-600 dark:text-slate-300">{data.clinicAddress}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{data.clinicPhone} · {data.clinicEmail}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 text-right shadow backdrop-blur-sm">
              <p className="font-bold text-sky-900">{data.doctorName}</p>
              <p className="text-xs text-gray-600 dark:text-slate-300">{data.doctorSpecialty}</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">{data.doctorRegistration}</p>
            </div>
          </div>
        </header>
        <div className="mb-5 rounded-2xl bg-sky-50/50 p-4"><PatientRow data={data} /></div>
        {data.diagnosis && <p className="mb-4 rounded-xl border-l-4 bg-sky-50 p-3 text-sm" style={{ borderColor: color }}><b>Diagnosis:</b> {data.diagnosis}</p>}
        <MedTable data={data} color={color} />
        {data.advice && <p className="mt-4 text-sm text-gray-700 dark:text-slate-300">{data.advice}</p>}
        <TestsBlock data={data} color={color} />
        <Signature data={data} color={color} />
      </div>
    </div>
  );
}
