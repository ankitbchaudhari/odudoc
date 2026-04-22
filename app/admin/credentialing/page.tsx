"use client";

import { useEffect, useState } from "react";
import type {
  Credential, PrivilegeGrant, CredentialType, CredentialStatus,
  VerificationMethod, PrivilegeCategory, PrivilegeStatus,
} from "@/lib/hospital/credentialing-store";
// Inlined from credentialing-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CREDENTIAL_TYPE_LABEL: Record<CredentialType, string> = {
  medical_license: "Medical license",
  dea_registration: "DEA / narcotic reg.",
  board_certification: "Board certification",
  malpractice_insurance: "Malpractice insurance",
  acls: "ACLS", bls: "BLS", pals: "PALS", atls: "ATLS", nrp: "NRP",
  dnb: "DNB", md: "MD", ms: "MS", mch: "MCh", dm: "DM",
  nursing_license: "Nursing license",
  paramedical: "Paramedical",
  allied_health: "Allied health",
  continuing_education: "CME / CE",
  immunization: "Immunization",
  background_check: "Background check",
  other: "Other",
};
const CRED_STATUS_LABEL: Record<CredentialStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  pending_verification: "Pending verification",
  suspended: "Suspended",
  revoked: "Revoked",
};
const VERIFY_LABEL: Record<VerificationMethod, string> = {
  primary_source: "Primary source",
  copy_on_file: "Copy on file",
  self_reported: "Self-reported",
  third_party: "Third-party",
  pending: "Pending",
};
const PRIV_CATEGORY_LABEL: Record<PrivilegeCategory, string> = {
  core: "Core", non_core: "Non-core", emergency: "Emergency",
  proctored: "Proctored", surgical: "Surgical", procedural: "Procedural", admitting: "Admitting",
};
const PRIV_STATUS_LABEL: Record<PrivilegeStatus, string> = {
  requested: "Requested", granted: "Granted", proctored: "Proctored",
  suspended: "Suspended", expired: "Expired", withdrawn: "Withdrawn",
};

const CRED_TYPES: CredentialType[] = [
  "medical_license", "dea_registration", "board_certification", "malpractice_insurance",
  "acls", "bls", "pals", "atls", "nrp",
  "dnb", "md", "ms", "mch", "dm",
  "nursing_license", "paramedical", "allied_health",
  "continuing_education", "immunization", "background_check", "other",
];
const CRED_STATUSES: CredentialStatus[] = ["active", "expiring_soon", "expired", "pending_verification", "suspended", "revoked"];
const VERIFY_METHODS: VerificationMethod[] = ["primary_source", "copy_on_file", "self_reported", "third_party", "pending"];
const PRIV_CATS: PrivilegeCategory[] = ["core", "non_core", "emergency", "proctored", "surgical", "procedural", "admitting"];
const PRIV_STATUSES: PrivilegeStatus[] = ["requested", "granted", "proctored", "suspended", "expired", "withdrawn"];

export default function CredentialingPage() {
  const [tab, setTab] = useState<"credentials" | "privileges">("credentials");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [privileges, setPrivileges] = useState<PrivilegeGrant[]>([]);
  const [stats, setStats] = useState<{ activeCreds: number; expiringSoon: number; expired: number; pendingVerify: number; grantedPrivs: number; proctoredPrivs: number; expiredPrivs: number } | null>(null);
  const [showCred, setShowCred] = useState(false);
  const [showPriv, setShowPriv] = useState(false);
  const [editCred, setEditCred] = useState<Credential | null>(null);
  const [editPriv, setEditPriv] = useState<PrivilegeGrant | null>(null);
  const [filterStatus, setFilterStatus] = useState<CredentialStatus | "">("");

  async function load() {
    const qs = new URLSearchParams();
    if (filterStatus) qs.set("credStatus", filterStatus);
    const res = await fetch(`/api/hospital/credentialing?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setCredentials(data.credentials || []);
    setPrivileges(data.privileges || []);
    setStats(data.stats || null);
  }
  useEffect(() => { load(); }, [filterStatus]);

  async function removeCred(id: string) {
    if (!confirm("Delete credential?")) return;
    await fetch("/api/hospital/credentialing", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function removePriv(id: string) {
    if (!confirm("Delete privilege?")) return;
    await fetch("/api/hospital/credentialing", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "privilege" }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Credentialing & Privileging</h1>
          <p className="text-sm text-slate-500">Licenses, certifications, malpractice, clinical privileges</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditCred(null); setShowCred(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Credential</button>
          <button onClick={() => { setEditPriv(null); setShowPriv(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Privilege</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatTile label="Active" value={stats.activeCreds} tone="emerald" />
          <StatTile label="Expiring soon" value={stats.expiringSoon} tone="amber" />
          <StatTile label="Expired" value={stats.expired} tone="rose" />
          <StatTile label="Pending verify" value={stats.pendingVerify} tone="indigo" />
          <StatTile label="Granted privs" value={stats.grantedPrivs} tone="emerald" />
          <StatTile label="Proctored" value={stats.proctoredPrivs} tone="amber" />
          <StatTile label="Expired privs" value={stats.expiredPrivs} tone="rose" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 border-b border-slate-200">
        <TabBtn active={tab === "credentials"} onClick={() => setTab("credentials")}>Credentials ({credentials.length})</TabBtn>
        <TabBtn active={tab === "privileges"} onClick={() => setTab("privileges")}>Privileges ({privileges.length})</TabBtn>
      </div>

      {tab === "credentials" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterPill active={filterStatus === ""} onClick={() => setFilterStatus("")}>All</FilterPill>
          {CRED_STATUSES.map((s) => <FilterPill key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{CRED_STATUS_LABEL[s]}</FilterPill>)}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "credentials" ? (
          credentials.length === 0 ? <Empty label="No credentials." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Name / No.</th>
                    <th className="px-4 py-3">Authority</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Verify</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.id}</td>
                      <td className="px-4 py-3"><div className="font-medium">{c.staffName}</div><div className="text-xs text-slate-500">{c.role || "-"}</div></td>
                      <td className="px-4 py-3 text-xs">{CREDENTIAL_TYPE_LABEL[c.credentialType]}</td>
                      <td className="px-4 py-3"><div>{c.credentialName}</div><div className="text-xs text-slate-500">{c.credentialNumber || ""}</div></td>
                      <td className="px-4 py-3 text-xs">{c.issuingAuthority || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{c.expiresDate ? new Date(c.expiresDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-xs">{VERIFY_LABEL[c.verificationMethod]}</td>
                      <td className="px-4 py-3"><Pill tone={c.status === "active" ? "emerald" : c.status === "expired" || c.status === "suspended" || c.status === "revoked" ? "rose" : c.status === "expiring_soon" ? "amber" : "indigo"}>{CRED_STATUS_LABEL[c.status]}</Pill></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditCred(c); setShowCred(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => removeCred(c.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : privileges.length === 0 ? <Empty label="No privileges." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Privilege</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Cases (done/req)</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {privileges.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-3"><div className="font-medium">{p.staffName}</div><div className="text-xs text-slate-500">{p.specialty || ""}</div></td>
                    <td className="px-4 py-3">{p.department || "-"}</td>
                    <td className="px-4 py-3"><div>{p.privilegeName}</div><div className="text-xs text-slate-500">{p.scope || ""}</div></td>
                    <td className="px-4 py-3 text-xs">{PRIV_CATEGORY_LABEL[p.category]}</td>
                    <td className="px-4 py-3 text-xs">{p.casesCompleted ?? 0} / {p.casesRequired ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{p.expiresDate ? new Date(p.expiresDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3"><Pill tone={p.status === "granted" ? "emerald" : p.status === "proctored" ? "amber" : p.status === "requested" ? "indigo" : "rose"}>{PRIV_STATUS_LABEL[p.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditPriv(p); setShowPriv(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => removePriv(p.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCred && <CredModal editing={editCred} onClose={() => setShowCred(false)} onSaved={() => { setShowCred(false); load(); }} />}
      {showPriv && <PrivModal editing={editPriv} onClose={() => setShowPriv(false)} onSaved={() => { setShowPriv(false); load(); }} />}
    </div>
  );
}

function CredModal({ editing, onClose, onSaved }: { editing: Credential | null; onClose: () => void; onSaved: () => void; }) {
  const [staffName, setStaffName] = useState(editing?.staffName || "");
  const [role, setRole] = useState(editing?.role || "");
  const [credentialType, setCT] = useState<CredentialType>(editing?.credentialType || "medical_license");
  const [credentialName, setCN] = useState(editing?.credentialName || "");
  const [credentialNumber, setCNo] = useState(editing?.credentialNumber || "");
  const [issuingAuthority, setIA] = useState(editing?.issuingAuthority || "");
  const [issuedDate, setID] = useState(editing?.issuedDate?.slice(0, 10) || "");
  const [expiresDate, setED] = useState(editing?.expiresDate?.slice(0, 10) || "");
  const [verificationMethod, setVM] = useState<VerificationMethod>(editing?.verificationMethod || "pending");
  const [verifiedBy, setVB] = useState(editing?.verifiedBy || "");
  const [coverageAmount, setCA] = useState<number | "">(editing?.coverageAmount ?? "");
  const [coverageCurrency, setCC] = useState(editing?.coverageCurrency || "INR");
  const [documentUrl, setDU] = useState(editing?.documentUrl || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!staffName || !credentialName) return;
    setSaving(true);
    const payload = {
      id: editing?.id,
      staffName, role: role || undefined,
      credentialType, credentialName,
      credentialNumber: credentialNumber || undefined,
      issuingAuthority: issuingAuthority || undefined,
      issuedDate: issuedDate ? new Date(issuedDate).toISOString() : undefined,
      expiresDate: expiresDate ? new Date(expiresDate).toISOString() : undefined,
      verificationMethod, verifiedBy: verifiedBy || undefined,
      coverageAmount: coverageAmount === "" ? undefined : Number(coverageAmount),
      coverageCurrency: coverageCurrency || undefined,
      documentUrl: documentUrl || undefined,
      notes: notes || undefined,
    };
    await fetch("/api/hospital/credentialing", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit credential" : "New credential"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Staff name"><input value={staffName} onChange={(e) => setStaffName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Role / title"><input value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Type">
              <select value={credentialType} onChange={(e) => setCT(e.target.value as CredentialType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {CRED_TYPES.map((t) => <option key={t} value={t}>{CREDENTIAL_TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Name / description"><input value={credentialName} onChange={(e) => setCN(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Number / license #"><input value={credentialNumber} onChange={(e) => setCNo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Issuing authority"><input value={issuingAuthority} onChange={(e) => setIA(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Issued date"><input type="date" value={issuedDate} onChange={(e) => setID(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Expires"><input type="date" value={expiresDate} onChange={(e) => setED(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Verification">
              <select value={verificationMethod} onChange={(e) => setVM(e.target.value as VerificationMethod)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {VERIFY_METHODS.map((v) => <option key={v} value={v}>{VERIFY_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Verified by"><input value={verifiedBy} onChange={(e) => setVB(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          {credentialType === "malpractice_insurance" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Coverage amount"><input type="number" value={coverageAmount} onChange={(e) => setCA(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
              <Field label="Currency"><input value={coverageCurrency} onChange={(e) => setCC(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            </div>
          )}
          <Field label="Document URL"><input value={documentUrl} onChange={(e) => setDU(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function PrivModal({ editing, onClose, onSaved }: { editing: PrivilegeGrant | null; onClose: () => void; onSaved: () => void; }) {
  const [staffName, setStaffName] = useState(editing?.staffName || "");
  const [department, setDepartment] = useState(editing?.department || "");
  const [specialty, setSpecialty] = useState(editing?.specialty || "");
  const [category, setCategory] = useState<PrivilegeCategory>(editing?.category || "core");
  const [privilegeName, setPN] = useState(editing?.privilegeName || "");
  const [scope, setScope] = useState(editing?.scope || "");
  const [status, setStatus] = useState<PrivilegeStatus>(editing?.status || "requested");
  const [grantedDate, setGD] = useState(editing?.grantedDate?.slice(0, 10) || "");
  const [effectiveDate, setEDT] = useState(editing?.effectiveDate?.slice(0, 10) || "");
  const [expiresDate, setEXP] = useState(editing?.expiresDate?.slice(0, 10) || "");
  const [proctorName, setPrc] = useState(editing?.proctorName || "");
  const [casesRequired, setCR] = useState<number | "">(editing?.casesRequired ?? "");
  const [casesCompleted, setCC] = useState<number | "">(editing?.casesCompleted ?? "");
  const [reviewerName, setRN] = useState(editing?.reviewerName || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!staffName || !privilegeName) return;
    setSaving(true);
    const payload = {
      kind: "privilege",
      id: editing?.id,
      staffName, department: department || undefined, specialty: specialty || undefined,
      category, privilegeName, scope: scope || undefined, status,
      grantedDate: grantedDate ? new Date(grantedDate).toISOString() : undefined,
      effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : undefined,
      expiresDate: expiresDate ? new Date(expiresDate).toISOString() : undefined,
      proctorName: proctorName || undefined,
      casesRequired: casesRequired === "" ? undefined : Number(casesRequired),
      casesCompleted: casesCompleted === "" ? undefined : Number(casesCompleted),
      reviewerName: reviewerName || undefined,
      notes: notes || undefined,
    };
    await fetch("/api/hospital/credentialing", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit privilege" : "New privilege"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Staff name"><input value={staffName} onChange={(e) => setStaffName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Department"><input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Specialty"><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Privilege name"><input value={privilegeName} onChange={(e) => setPN(e.target.value)} placeholder="e.g. PCI - diagnostic" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as PrivilegeCategory)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {PRIV_CATS.map((c) => <option key={c} value={c}>{PRIV_CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as PrivilegeStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {PRIV_STATUSES.map((s) => <option key={s} value={s}>{PRIV_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Granted"><input type="date" value={grantedDate} onChange={(e) => setGD(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Effective"><input type="date" value={effectiveDate} onChange={(e) => setEDT(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Expires"><input type="date" value={expiresDate} onChange={(e) => setEXP(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Proctor"><input value={proctorName} onChange={(e) => setPrc(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Cases required"><input type="number" value={casesRequired} onChange={(e) => setCR(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Cases completed"><input type="number" value={casesCompleted} onChange={(e) => setCC(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Reviewer"><input value={reviewerName} onChange={(e) => setRN(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Scope / limitations"><textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return <div className={`rounded-lg p-3 ring-1 ${map[tone]}`}><div className="text-xs">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${active ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ tone, children }: { tone: "slate" | "amber" | "emerald" | "rose" | "indigo"; children: React.ReactNode; }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}
function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}
function Empty({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{label}</div>;
}
