"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type OrgPlan = "trial" | "starter" | "clinic" | "hospital" | "enterprise";
type OrgStatus = "active" | "suspended" | "cancelled";

interface OrgModules {
  // Core clinical
  patient: boolean;
  opd: boolean;
  ipd: boolean;
  appointments: boolean;
  encounters: boolean;
  hospitalRx: boolean;
  medicalRecords: boolean;
  referrals: boolean;
  consentForms: boolean;
  dischargeSummaries: boolean;
  allergiesProblems: boolean;
  immunizations: boolean;
  vitalsEws: boolean;
  lab: boolean;
  pathology: boolean;
  pharmacy: boolean;
  pharmacyDispense: boolean;
  pharmacyInventory: boolean;
  billing: boolean;
  invoices: boolean;
  surgery: boolean;
  inventory: boolean;
  radiology: boolean;
  telemedicine: boolean;
  aiVoice: boolean;
  // Inpatient & surgical
  bedManagement: boolean;
  otScheduling: boolean;
  preAnesthesia: boolean;
  icu: boolean;
  laborDelivery: boolean;
  woundCare: boolean;
  painManagement: boolean;
  oncology: boolean;
  cardiology: boolean;
  endoscopy: boolean;
  bloodBank: boolean;
  ambulance: boolean;
  maternity: boolean;
  nicu: boolean;
  dialysis: boolean;
  physiotherapy: boolean;
  diet: boolean;
  cssd: boolean;
  // Front-office & engagement
  opdQueue: boolean;
  patientFeedback: boolean;
  visitors: boolean;
  // Workforce
  hrPayroll: boolean;
  medicalStaff: boolean;
  shiftRoster: boolean;
  staffScheduling: boolean;
  dutyHandover: boolean;
  // Facilities & compliance
  procurement: boolean;
  insurance: boolean;
  assetManagement: boolean;
  biomedical: boolean;
  biomedicalWaste: boolean;
  housekeeping: boolean;
  linenLaundry: boolean;
  infectionControl: boolean;
  incidentReports: boolean;
  emergencyCodes: boolean;
  mortuary: boolean;
  multiBranch: boolean;
  analytics: boolean;
  audit: boolean;
  // Patient engagement
  patientPortal: boolean;
  whatsappEngagement: boolean;
  // Platform
  apiAccess: boolean;
  whiteLabel: boolean;
  // New capabilities — must stay in sync with /lib/organizations-store.ts.
  orgBranding: boolean;
  miniWebsite: boolean;
  surgeryVideo: boolean;
  biometricEmergency: boolean;
  antiCounterfeit: boolean;
  pharmaCatalogue: boolean;
  pharmaPartners: boolean;
  pharmaPromo: boolean;
  orgVacancies: boolean;
  educationPartner: boolean;
  voiceBookingBot: boolean;
  whatsappBookingBot: boolean;
  aiCreditPool: boolean;
  aiPricingOverride: boolean;
  mlTrainingQueue: boolean;
  carePlans: boolean;
  symptomLog: boolean;
  vaccinations: boolean;
  documentVault: boolean;
  auditLog: boolean;
  emergencyProfile: boolean;
  vitalAlerts: boolean;
  consumablesBilling: boolean;
  countryTax: boolean;
  watermarkedReports: boolean;
  referralCommissions: boolean;
  healthTimeline: boolean;
  adherence: boolean;
  shareTokens: boolean;
  triagePalette: boolean;
}

interface Organization {
  id: string;
  slug: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  country: string;
  plan: OrgPlan;
  status: OrgStatus;
  modules: OrgModules;
  trialEndsAt?: string;
  createdAt: string;
}

const PLANS: OrgPlan[] = ["trial", "starter", "clinic", "hospital", "enterprise"];
const STATUSES: OrgStatus[] = ["active", "suspended", "cancelled"];

// Must stay in sync with PLAN_MODULE_ENTITLEMENTS in lib/organizations-store.ts.
// Duplicated here (not fetched) so the disabled-state renders instantly as
// the operator flips the plan dropdown. Server still re-clamps on save —
// this is a UX hint, not a security boundary.
const ALL_KEYS: (keyof OrgModules)[] = [
  "patient", "opd", "ipd", "appointments", "encounters", "hospitalRx",
  "medicalRecords", "referrals", "consentForms", "dischargeSummaries",
  "allergiesProblems", "immunizations", "vitalsEws",
  "lab", "pathology",
  "pharmacy", "pharmacyDispense", "pharmacyInventory",
  "billing", "invoices",
  "surgery", "inventory", "radiology", "telemedicine", "aiVoice",
  "bedManagement", "otScheduling", "preAnesthesia", "icu",
  "laborDelivery", "woundCare", "painManagement",
  "oncology", "cardiology", "endoscopy",
  "bloodBank", "ambulance", "maternity", "nicu",
  "dialysis", "physiotherapy", "diet", "cssd",
  "opdQueue", "patientFeedback", "visitors",
  "hrPayroll", "medicalStaff", "shiftRoster", "staffScheduling", "dutyHandover",
  "procurement", "insurance", "assetManagement",
  "biomedical", "biomedicalWaste", "housekeeping", "linenLaundry",
  "infectionControl", "incidentReports", "emergencyCodes", "mortuary",
  "multiBranch", "analytics", "audit",
  "patientPortal", "whatsappEngagement",
  "apiAccess", "whiteLabel",
  // New capabilities (Q3 2026)
  "orgBranding", "miniWebsite", "surgeryVideo", "biometricEmergency",
  "antiCounterfeit", "pharmaCatalogue", "pharmaPartners", "pharmaPromo",
  "orgVacancies", "educationPartner", "voiceBookingBot", "whatsappBookingBot",
  "aiCreditPool", "aiPricingOverride", "mlTrainingQueue",
  "carePlans", "symptomLog", "vaccinations", "documentVault", "auditLog",
  "emergencyProfile", "vitalAlerts", "consumablesBilling", "countryTax",
  "watermarkedReports", "referralCommissions", "healthTimeline",
  "adherence", "shareTokens", "triagePalette",
];

const PLAN_MODULES: Record<OrgPlan, (keyof OrgModules)[]> = {
  trial: [
    "patient", "opd", "appointments", "encounters", "medicalRecords",
    "telemedicine",
  ],
  starter: [
    "patient", "opd", "appointments", "encounters", "medicalRecords",
    "hospitalRx", "vitalsEws", "allergiesProblems",
    "telemedicine", "whatsappEngagement",
    "carePlans", "symptomLog", "vaccinations", "adherence",
    "documentVault", "healthTimeline", "auditLog", "emergencyProfile",
    "countryTax", "watermarkedReports", "triagePalette",
  ],
  clinic: [
    "patient", "opd", "appointments", "encounters", "hospitalRx",
    "medicalRecords", "referrals", "consentForms", "allergiesProblems",
    "immunizations", "vitalsEws",
    "lab", "pharmacy", "pharmacyDispense", "pharmacyInventory",
    "billing", "invoices",
    "telemedicine", "opdQueue", "patientFeedback",
    "patientPortal", "diet", "analytics", "whatsappEngagement",
    "orgBranding", "miniWebsite", "orgVacancies",
    "voiceBookingBot", "whatsappBookingBot", "shareTokens",
    "carePlans", "symptomLog", "vaccinations", "adherence",
    "documentVault", "healthTimeline", "auditLog", "emergencyProfile",
    "countryTax", "watermarkedReports", "referralCommissions",
    "triagePalette", "vitalAlerts",
  ],
  hospital: [
    "patient", "opd", "ipd", "appointments", "encounters", "hospitalRx",
    "medicalRecords", "referrals", "consentForms", "dischargeSummaries",
    "allergiesProblems", "immunizations", "vitalsEws",
    "lab", "pathology",
    "pharmacy", "pharmacyDispense", "pharmacyInventory",
    "billing", "invoices",
    "surgery", "inventory", "radiology", "telemedicine",
    "bedManagement", "otScheduling", "preAnesthesia", "icu",
    "laborDelivery", "woundCare", "painManagement",
    "oncology", "cardiology", "endoscopy",
    "bloodBank", "ambulance", "maternity", "nicu",
    "dialysis", "physiotherapy", "diet", "cssd",
    "opdQueue", "patientFeedback", "visitors",
    "hrPayroll", "medicalStaff", "shiftRoster", "staffScheduling", "dutyHandover",
    "procurement", "insurance", "assetManagement",
    "biomedical", "biomedicalWaste", "housekeeping", "linenLaundry",
    "infectionControl", "incidentReports", "emergencyCodes", "mortuary",
    "analytics", "audit",
    "patientPortal", "whatsappEngagement",
    "orgBranding", "miniWebsite", "orgVacancies",
    "voiceBookingBot", "whatsappBookingBot", "shareTokens",
    "carePlans", "symptomLog", "vaccinations", "adherence",
    "documentVault", "healthTimeline", "auditLog", "emergencyProfile",
    "countryTax", "watermarkedReports", "referralCommissions",
    "triagePalette", "vitalAlerts",
    "surgeryVideo", "biometricEmergency", "consumablesBilling",
    "aiCreditPool",
  ],
  enterprise: ALL_KEYS,
};

const MODULE_LABELS: Record<keyof OrgModules, string> = {
  // Core clinical
  patient: "Patients",
  opd: "OPD",
  ipd: "IPD",
  appointments: "Appointments",
  encounters: "Encounters",
  hospitalRx: "Hospital Rx",
  medicalRecords: "Medical Records",
  referrals: "Referrals",
  consentForms: "Consent Forms",
  dischargeSummaries: "Discharge Summaries",
  allergiesProblems: "Allergies & Problems",
  immunizations: "Immunizations",
  vitalsEws: "Vitals & EWS",
  lab: "Lab Orders",
  pathology: "Pathology",
  pharmacy: "Pharmacy",
  pharmacyDispense: "Pharmacy Dispense",
  pharmacyInventory: "Pharmacy Inventory",
  billing: "Billing",
  invoices: "Invoices",
  surgery: "Surgery / OT",
  inventory: "Inventory",
  radiology: "Radiology",
  telemedicine: "Telemedicine",
  aiVoice: "AI Voice",
  // Inpatient & surgical
  bedManagement: "Wards & Beds",
  otScheduling: "OT Scheduling",
  preAnesthesia: "Pre-Anesthesia",
  icu: "ICU / Critical Care",
  laborDelivery: "Labor & Delivery",
  woundCare: "Wound Care",
  painManagement: "Pain Management",
  oncology: "Oncology & Chemo",
  cardiology: "Cardiology",
  endoscopy: "Endoscopy",
  bloodBank: "Blood Bank",
  ambulance: "Ambulance Dispatch",
  maternity: "Maternity",
  nicu: "NICU",
  dialysis: "Dialysis",
  physiotherapy: "Physiotherapy",
  diet: "Dietary Orders",
  cssd: "CSSD Sterilization",
  // Front-office & engagement
  opdQueue: "OPD Queue",
  patientFeedback: "Patient Feedback",
  visitors: "Visitors",
  // Workforce
  hrPayroll: "HR & Payroll",
  medicalStaff: "Medical Staff",
  shiftRoster: "Shift Roster",
  staffScheduling: "Staff Scheduling",
  dutyHandover: "Duty Handover",
  // Facilities & compliance
  procurement: "Procurement",
  insurance: "Insurance / TPA",
  assetManagement: "Asset Mgmt",
  biomedical: "Biomedical",
  biomedicalWaste: "Biomedical Waste",
  housekeeping: "Housekeeping",
  linenLaundry: "Linen & Laundry",
  infectionControl: "Infection Control",
  incidentReports: "Incident Reports",
  emergencyCodes: "Emergency Codes",
  mortuary: "Mortuary",
  multiBranch: "Multi-branch",
  analytics: "Analytics",
  audit: "Audit & Compliance",
  // Patient engagement
  patientPortal: "Patient Portal",
  whatsappEngagement: "WhatsApp / SMS",
  // Platform
  apiAccess: "API Access",
  whiteLabel: "White-label",
  // New capabilities
  orgBranding: "Org Branding",
  miniWebsite: "Mini-Website",
  surgeryVideo: "Surgery Video",
  biometricEmergency: "Biometric Emergency",
  antiCounterfeit: "Anti-Counterfeit",
  pharmaCatalogue: "Pharma Catalogue",
  pharmaPartners: "Pharma Partners",
  pharmaPromo: "Pharma Promo",
  orgVacancies: "Vacancies",
  educationPartner: "Education Partner",
  voiceBookingBot: "Voice IVR Booking",
  whatsappBookingBot: "WhatsApp Booking Bot",
  aiCreditPool: "AI Credit Pool",
  aiPricingOverride: "AI Pricing Override",
  mlTrainingQueue: "ML Training Queue",
  carePlans: "Care Plans",
  symptomLog: "Symptom Log",
  vaccinations: "Vaccinations",
  documentVault: "Document Vault",
  auditLog: "Audit Log",
  emergencyProfile: "Emergency Profile",
  vitalAlerts: "Vital Alerts",
  consumablesBilling: "Consumables Billing",
  countryTax: "Country Tax Engine",
  watermarkedReports: "Watermarked Reports",
  referralCommissions: "Referral Commissions",
  healthTimeline: "Health Timeline",
  adherence: "Medication Adherence",
  shareTokens: "Share Tokens",
  triagePalette: "Triage Color Palette",
};

// Section grouping for the module picker — keeps the form readable
// at 30 modules instead of one big wall of pills.
const MODULE_SECTIONS: Array<{ title: string; keys: (keyof OrgModules)[] }> = [
  {
    title: "Core clinical",
    keys: [
      "patient", "opd", "appointments", "encounters", "hospitalRx",
      "medicalRecords", "referrals", "consentForms", "dischargeSummaries",
      "allergiesProblems", "immunizations", "vitalsEws",
    ],
  },
  {
    title: "Diagnostics & pharmacy",
    keys: [
      "lab", "pathology", "radiology",
      "pharmacy", "pharmacyDispense", "pharmacyInventory",
      "inventory", "bloodBank",
    ],
  },
  {
    title: "Inpatient & surgical",
    keys: [
      "ipd", "bedManagement", "surgery", "otScheduling", "preAnesthesia",
      "icu", "laborDelivery", "woundCare", "painManagement",
      "oncology", "cardiology", "endoscopy",
      "maternity", "nicu", "dialysis", "physiotherapy",
    ],
  },
  {
    title: "Front-office & engagement",
    keys: [
      "telemedicine", "opdQueue", "patientFeedback", "visitors",
      "patientPortal", "whatsappEngagement",
    ],
  },
  {
    title: "Revenue & admin",
    keys: [
      "billing", "invoices", "insurance", "procurement",
      "assetManagement", "analytics", "audit",
    ],
  },
  {
    title: "Workforce",
    keys: [
      "hrPayroll", "medicalStaff", "shiftRoster", "staffScheduling", "dutyHandover",
    ],
  },
  {
    title: "Facilities & compliance",
    keys: [
      "diet", "cssd", "biomedical", "biomedicalWaste",
      "housekeeping", "linenLaundry", "infectionControl",
      "incidentReports", "emergencyCodes", "ambulance", "mortuary",
    ],
  },
  {
    title: "Platform & enterprise",
    keys: ["aiVoice", "multiBranch", "apiAccess", "whiteLabel"],
  },
  {
    title: "Brand & public surfaces",
    keys: ["orgBranding", "miniWebsite", "orgVacancies", "watermarkedReports"],
  },
  {
    title: "AI metering & training",
    keys: ["aiCreditPool", "aiPricingOverride", "mlTrainingQueue"],
  },
  {
    title: "Patient self-service",
    keys: [
      "carePlans", "symptomLog", "vaccinations", "adherence",
      "documentVault", "healthTimeline", "emergencyProfile",
      "auditLog",
    ],
  },
  {
    title: "Hospital ops add-ons",
    keys: [
      "surgeryVideo", "biometricEmergency", "consumablesBilling",
      "vitalAlerts", "triagePalette", "shareTokens",
    ],
  },
  {
    title: "Booking channels",
    keys: ["voiceBookingBot", "whatsappBookingBot"],
  },
  {
    title: "Pharma supply chain",
    keys: [
      "pharmaCatalogue", "pharmaPartners", "pharmaPromo",
      "antiCounterfeit",
    ],
  },
  {
    title: "Marketplace & education",
    keys: ["educationPartner", "referralCommissions"],
  },
  {
    title: "Compliance & tax",
    keys: ["countryTax"],
  },
];

const PLAN_COLORS: Record<OrgPlan, string> = {
  trial: "bg-gray-100 text-gray-700",
  starter: "bg-sky-100 text-sky-700",
  clinic: "bg-emerald-100 text-emerald-700",
  hospital: "bg-indigo-100 text-indigo-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<OrgStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const DEFAULT_MODULES: OrgModules = {
  // Core clinical
  patient: true,
  opd: true,
  ipd: false,
  appointments: true,
  encounters: true,
  hospitalRx: false,
  medicalRecords: true,
  referrals: false,
  consentForms: false,
  dischargeSummaries: false,
  allergiesProblems: false,
  immunizations: false,
  vitalsEws: false,
  lab: false,
  pathology: false,
  pharmacy: false,
  pharmacyDispense: false,
  pharmacyInventory: false,
  billing: false,
  invoices: false,
  surgery: false,
  inventory: false,
  radiology: false,
  telemedicine: true,
  aiVoice: false,
  // Inpatient & surgical
  bedManagement: false,
  otScheduling: false,
  preAnesthesia: false,
  icu: false,
  laborDelivery: false,
  woundCare: false,
  painManagement: false,
  oncology: false,
  cardiology: false,
  endoscopy: false,
  bloodBank: false,
  ambulance: false,
  maternity: false,
  nicu: false,
  dialysis: false,
  physiotherapy: false,
  diet: false,
  cssd: false,
  // Front-office & engagement
  opdQueue: false,
  patientFeedback: false,
  visitors: false,
  // Workforce
  hrPayroll: false,
  medicalStaff: false,
  shiftRoster: false,
  staffScheduling: false,
  dutyHandover: false,
  // Facilities & compliance
  procurement: false,
  insurance: false,
  assetManagement: false,
  biomedical: false,
  biomedicalWaste: false,
  housekeeping: false,
  linenLaundry: false,
  infectionControl: false,
  incidentReports: false,
  emergencyCodes: false,
  mortuary: false,
  multiBranch: false,
  analytics: false,
  audit: false,
  // Patient engagement
  patientPortal: false,
  whatsappEngagement: false,
  // Platform
  apiAccess: false,
  whiteLabel: false,
  // New capabilities — defaults match /lib/organizations-store.ts.
  orgBranding: false,
  miniWebsite: false,
  surgeryVideo: false,
  biometricEmergency: false,
  antiCounterfeit: false,
  pharmaCatalogue: false,
  pharmaPartners: false,
  pharmaPromo: false,
  orgVacancies: false,
  educationPartner: false,
  voiceBookingBot: false,
  whatsappBookingBot: false,
  aiCreditPool: false,
  aiPricingOverride: false,
  mlTrainingQueue: false,
  carePlans: false,
  symptomLog: false,
  vaccinations: false,
  documentVault: false,
  auditLog: false,
  emergencyProfile: false,
  vitalAlerts: false,
  consumablesBilling: false,
  countryTax: true,
  watermarkedReports: true,
  referralCommissions: false,
  healthTimeline: false,
  adherence: false,
  shareTokens: false,
  triagePalette: true,
};

interface RepairedStaff {
  name: string;
  email: string;
  password: string;
  title: string;
  action: "created" | "already_existed" | "membership_added";
}

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [repairResult, setRepairResult] = useState<{ orgName: string; staff: RepairedStaff[] } | null>(null);
  // Credentials issued for the org's first admin user when a new org
  // is saved. Shown in a modal so the operator can copy + share if
  // delivery fails. Cleared on dismiss.
  const [bootstrapResult, setBootstrapResult] = useState<{
    orgName: string;
    email: string;
    tempPassword: string;
    expiresAt: string;
    userCreated: boolean;
    delivery: { email: { sent: boolean; reason?: string }; sms: { sent: boolean; reason?: string } };
  } | null>(null);
  // Surface every save / fetch failure so silent close-on-error
  // never happens again.
  const [saveError, setSaveError] = useState<string | null>(null);
  // Page-level toast for delete success / failure. Lives outside the
  // form so the operator sees it whether or not the form is open.
  const [toast, setToast] = useState<
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
    | null
  >(null);

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    plan: "trial" as OrgPlan,
    status: "active" as OrgStatus,
    modules: { ...DEFAULT_MODULES },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/organizations", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setOrgs(data.organizations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      name: "",
      contactEmail: "",
      contactPhone: "",
      country: "",
      plan: "trial",
      status: "active",
      modules: { ...DEFAULT_MODULES },
    });
    setEditingId(null);
  };

  const handleEdit = (o: Organization) => {
    setForm({
      name: o.name,
      contactEmail: o.contactEmail,
      contactPhone: o.contactPhone || "",
      country: o.country,
      plan: o.plan,
      status: o.status,
      modules: { ...o.modules },
    });
    setEditingId(o.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!form.name.trim()) {
      setSaveError("Organization name is required.");
      return;
    }
    if (!form.contactEmail.trim()) {
      setSaveError("Contact email is required.");
      return;
    }
    // Light email sanity check — server validates again, but giving
    // the operator immediate feedback beats waiting for a 400.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      setSaveError("Contact email doesn't look valid.");
      return;
    }
    setSaving(true);
    try {
      const r = editingId
        ? await fetch("/api/organizations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...form }),
          })
        : await fetch("/api/organizations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      if (!r.ok) {
        // Translate the server's machine codes into operator copy.
        // The `forbidden` 403 is the trickiest — that's a "you're
        // signed in as plain admin, not super admin" issue.
        const body = await r.json().catch(() => ({} as Record<string, unknown>));
        const code = (body as { error?: string }).error || "";
        const msg =
          code === "forbidden"
            ? "Only Super Admins can create organizations. Sign in with a super-admin account, or ask one to add yours to lib/tenant.ts SUPER_ADMIN_EMAILS."
            : code === "missing_fields"
              ? "Organization name and contact email are required."
              : code === "not_found"
                ? "That organization no longer exists. Refresh the list."
                : code || `Save failed (HTTP ${r.status}).`;
        setSaveError(msg);
        return;
      }
      // On create, the server bootstraps an org-admin user and emails/
      // SMS's a 3-day temp password. Surface those credentials to the
      // operator immediately — covers the case where email/SMS dispatch
      // failed (staging without SMTP, bad phone number, etc.) and they
      // need to share the password through another channel.
      const created = await r.json().catch(() => null) as
        | { adminBootstrap?: typeof bootstrapResult; organization?: { name?: string } }
        | null;
      if (!editingId && created?.adminBootstrap) {
        setBootstrapResult({
          ...created.adminBootstrap,
          orgName: created.organization?.name || form.name,
        });
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setSaveError((err as Error).message || "Save failed — network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = orgs.find((o) => o.id === id);
    const name = target?.name || id;
    if (!confirm(
      `Delete "${name}" and all its memberships?\n\n` +
      `This removes the organization, every staff membership, and any seeded demo accounts. ` +
      `If you're currently impersonating this org, support mode will be exited automatically. ` +
      `The action cannot be undone.`
    )) return;
    try {
      const r = await fetch("/api/organizations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok || (body as { ok?: boolean }).ok === false) {
        const code = (body as { error?: string }).error || "";
        const msg =
          code === "forbidden"
            ? "Only Super Admins can delete organizations."
            : code === "not_found"
              ? "That organization no longer exists. Refresh the list."
              : code === "deleted_but_not_persisted"
                ? "The delete was applied but the persistent layer didn't confirm. Refresh and try again — if the row is gone, you're fine."
                : code || `Delete failed (HTTP ${r.status}).`;
        setToast({ kind: "err", text: `Couldn't delete "${name}": ${msg}` });
        return;
      }
      const exited = (body as { exitedImpersonation?: boolean }).exitedImpersonation;
      setToast({
        kind: "ok",
        text: exited
          ? `"${name}" deleted. Support mode also exited because you were impersonating it.`
          : `"${name}" deleted.`,
      });
      // If we exited impersonation server-side, the org-switcher in the
      // header still thinks we're in the org. Force a hard reload so it
      // re-reads /api/tenant/context.
      if (exited) {
        setTimeout(() => window.location.reload(), 600);
        return;
      }
    } catch (err) {
      setToast({ kind: "err", text: `Delete failed — network error: ${(err as Error).message}` });
      return;
    }
    await load();
  };

  const allowedForPlan = new Set<keyof OrgModules>(PLAN_MODULES[form.plan]);

  const toggleModule = (key: keyof OrgModules) => {
    // No-op if the current plan doesn't entitle this module. The backend
    // would clamp it anyway, but bailing here keeps the UI honest.
    if (!allowedForPlan.has(key)) return;
    setForm({ ...form, modules: { ...form.modules, [key]: !form.modules[key] } });
  };

  // When the plan changes, force-disable any modules that aren't in the new
  // plan's entitlement so the operator sees exactly what they'll get.
  const handlePlanChange = (plan: OrgPlan) => {
    const allowed = new Set<keyof OrgModules>(PLAN_MODULES[plan]);
    const nextModules = { ...form.modules };
    (Object.keys(nextModules) as (keyof OrgModules)[]).forEach((k) => {
      if (!allowed.has(k)) nextModules[k] = false;
    });
    setForm({ ...form, plan, modules: nextModules });
  };

  const handleRepairStaff = async (o: Organization) => {
    if (!confirm(
      `Repair demo staff for "${o.name}"?\n\n` +
      `This re-creates the 3 doctors + 1 receptionist using the same emails and passwords as the original seed, so any previously-emailed credentials will work again. Existing users are left alone.`
    )) return;
    setRepairingId(o.id);
    setRepairResult(null);
    try {
      const r = await fetch("/api/admin/super/repair-demo-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: o.id }),
      });
      if (r.ok) {
        const data = await r.json();
        setRepairResult({ orgName: o.name, staff: data.staff || [] });
      } else {
        const err = await r.json().catch(() => ({}));
        alert(`Repair failed: ${err.error || r.statusText}`);
      }
    } catch (e) {
      alert(`Repair failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRepairingId(null);
    }
  };

  return (
    <div>
      {toast && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="mb-6">
        <PageHero
          icon="🏢"
          eyebrow="Tenants"
          title="Organizations"
          subtitle={`${orgs.length} tenants · ${orgs.filter((o) => o.status === "active").length} active`}
          tone="indigo"
          primaryAction={{
            label: showForm ? "Cancel" : "+ Add Organization",
            onClick: () => {
              resetForm();
              setSaveError(null);
              setShowForm(!showForm);
            },
          }}
        />
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Organization" : "Add Organization"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Apollo Hospitals Hyderabad"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => handlePlanChange(e.target.value as OrgPlan)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm capitalize outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as OrgStatus })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm capitalize outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Enabled modules
                <span className="ml-2 text-[11px] font-normal text-gray-400">
                  · greyed modules aren&rsquo;t included in the <span className="capitalize">{form.plan}</span> plan
                </span>
              </label>
              {/* Group by section so 30 modules don't pile into one wall.
                  Each section header shows a count of how many are
                  available + enabled in the current plan. */}
              <div className="space-y-4">
                {MODULE_SECTIONS.map((section) => {
                  const sectionAllowed = section.keys.filter((k) => allowedForPlan.has(k));
                  const sectionOn = section.keys.filter((k) => form.modules[k] && allowedForPlan.has(k));
                  // Don't render an entire empty section for tiny plans.
                  if (sectionAllowed.length === 0) return null;
                  return (
                    <div key={section.title}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">
                        {section.title}
                        <span className="ml-2 font-normal text-gray-400">
                          {sectionOn.length} / {sectionAllowed.length} on
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {section.keys.map((key) => {
                          const allowed = allowedForPlan.has(key);
                          const on = form.modules[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleModule(key)}
                              disabled={!allowed}
                              title={allowed ? undefined : `Not available on the ${form.plan} plan — upgrade to enable`}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                !allowed
                                  ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                                  : on
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                  : "border-gray-300 bg-white text-gray-500 hover:border-indigo-300"
                              }`}
                            >
                              {MODULE_LABELS[key]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {saveError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <p className="font-semibold">Couldn&apos;t save the organization</p>
              <p className="mt-1">{saveError}</p>
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setSaveError(null);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Modules</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const enabledCount = Object.values(o.modules).filter(Boolean).length;
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.name}</p>
                      <p className="text-xs text-gray-400">{o.slug} · {o.country || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{o.contactEmail}</p>
                      {o.contactPhone && <p className="text-xs text-gray-400">{o.contactPhone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[o.plan]}`}>
                        {o.plan}
                      </span>
                      {o.trialEndsAt && o.plan === "trial" && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          ends {new Date(o.trialEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {enabledCount} / {Object.keys(o.modules).length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(o)}
                          title="Edit"
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRepairStaff(o)}
                          disabled={repairingId === o.id}
                          title="Repair demo staff users (for orgs seeded before the flush-race fix)"
                          className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                        >
                          {repairingId === o.id ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
                              <path strokeLinecap="round" strokeWidth={3} d="M22 12a10 10 0 00-10-10" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
                          title="Delete"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && orgs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No organizations yet.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>

      {bootstrapResult && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setBootstrapResult(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Admin account ready for {bootstrapResult.orgName}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {bootstrapResult.userCreated
                    ? "A new admin user was created and credentials were dispatched."
                    : "Credentials were issued to the existing user matching this email."}
                </p>
              </div>
              <button
                onClick={() => setBootstrapResult(null)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Username</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(bootstrapResult.email)}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="font-mono text-slate-800">{bootstrapResult.email}</p>

              <div className="mt-3 mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Temporary password</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(bootstrapResult.tempPassword)}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="font-mono text-slate-800">{bootstrapResult.tempPassword}</p>

              <p className="mt-3 text-[11px] text-amber-700">
                ⚠ Must be changed within 3 days — expires{" "}
                {new Date(bootstrapResult.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div
                className={`rounded-md border px-3 py-2 ${
                  bootstrapResult.delivery.email.sent
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <p className="font-semibold">
                  {bootstrapResult.delivery.email.sent ? "✓ Email sent" : "⚠ Email not sent"}
                </p>
                {!bootstrapResult.delivery.email.sent && (
                  <p className="mt-0.5 text-[11px] opacity-80">
                    {bootstrapResult.delivery.email.reason || "Share the password manually."}
                  </p>
                )}
              </div>
              <div
                className={`rounded-md border px-3 py-2 ${
                  bootstrapResult.delivery.sms.sent
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <p className="font-semibold">
                  {bootstrapResult.delivery.sms.sent ? "✓ SMS sent" : "SMS skipped"}
                </p>
                {!bootstrapResult.delivery.sms.sent && (
                  <p className="mt-0.5 text-[11px] opacity-80">
                    {bootstrapResult.delivery.sms.reason === "no_phone"
                      ? "No phone on file."
                      : bootstrapResult.delivery.sms.reason || "Provider not configured."}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setBootstrapResult(null)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {repairResult && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setRepairResult(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Staff repaired</h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {repairResult.orgName} — credentials below match the original seed email.
                </p>
              </div>
              <button
                onClick={() => setRepairResult(null)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {repairResult.staff.map((s) => (
                <div
                  key={s.email}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                        s.action === "created"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.action === "membership_added"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {s.action === "created"
                        ? "created"
                        : s.action === "membership_added"
                        ? "membership added"
                        : "already existed"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-slate-500">{s.title}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-slate-700">{s.email}</p>
                  <p className="font-mono text-[11.5px] text-slate-700">pw: {s.password}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setRepairResult(null)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
