"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import OrgSwitcher from "@/components/admin/OrgSwitcher";
import PatientSearchLauncher from "@/components/admin/PatientSearchLauncher";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";
import RequestModulesCard from "@/components/admin/RequestModulesCard";
import TempPasswordBanner from "@/components/TempPasswordBanner";

// Visibility rules for each nav entry:
//   "super"        → only super-admins see it (SaaS-operator-only surfaces)
//   "core"         → every admin (tenant or super) sees it
//   keyof Modules  → tenant sees it only when that module is enabled on
//                    their org. Super-admins always see it.
// Unset on a section means it inherits from items. Sections with
// `requires: "super"` are hidden entirely from tenant admins.

// Every module flag the organizations store knows about (99-key
// modules record on Organization). Sidebar gates need to accept ALL
// of them — previously this list was only ~11 keys, so super-admin
// toggles on Physiotherapy / Cardiology / Blood Bank / Dialysis /
// Housekeeping / Infection Control / Emergency Codes / etc. silently
// did nothing because no nav item referenced their flag.
type OrgModuleKey =
  // Core clinical
  | "patient" | "opd" | "ipd" | "appointments" | "encounters"
  | "hospitalRx" | "medicalRecords" | "referrals" | "consentForms"
  | "dischargeSummaries" | "allergiesProblems" | "immunizations"
  | "vitalsEws" | "lab" | "pathology" | "pharmacy" | "pharmacyDispense"
  | "pharmacyInventory" | "billing" | "invoices" | "surgery"
  | "inventory" | "radiology" | "telemedicine" | "aiVoice"
  // Inpatient & surgical
  | "bedManagement" | "otScheduling" | "preAnesthesia" | "icu"
  | "laborDelivery" | "woundCare" | "painManagement" | "oncology"
  | "cardiology" | "endoscopy" | "bloodBank" | "ambulance"
  | "maternity" | "nicu" | "dialysis" | "physiotherapy" | "diet"
  | "cssd"
  // Front-office & engagement
  | "opdQueue" | "patientFeedback" | "visitors"
  // Workforce
  | "hrPayroll" | "medicalStaff" | "shiftRoster" | "staffScheduling"
  | "dutyHandover"
  // Facilities & compliance
  | "procurement" | "insurance" | "assetManagement" | "biomedical"
  | "biomedicalWaste" | "housekeeping" | "linenLaundry"
  | "infectionControl" | "incidentReports" | "emergencyCodes"
  | "mortuary" | "multiBranch" | "analytics" | "audit"
  // Patient engagement
  | "patientPortal" | "whatsappEngagement"
  // Platform / White-label
  | "apiAccess" | "whiteLabel"
  // New capabilities (Q3 2026 batch)
  | "orgBranding" | "miniWebsite" | "surgeryVideo" | "biometricEmergency"
  | "antiCounterfeit" | "pharmaCatalogue" | "pharmaPartners"
  | "pharmaPromo" | "orgVacancies" | "educationPartner"
  | "voiceBookingBot" | "whatsappBookingBot" | "aiCreditPool"
  | "aiPricingOverride" | "mlTrainingQueue" | "carePlans" | "symptomLog"
  | "vaccinations" | "documentVault" | "auditLog" | "emergencyProfile"
  | "vitalAlerts" | "consumablesBilling" | "countryTax"
  | "watermarkedReports" | "referralCommissions" | "healthTimeline"
  | "adherence" | "shareTokens" | "triagePalette";

type Visibility = "super" | "core" | OrgModuleKey;

interface NavChild {
  href: string;
  label: string;
  requires?: Visibility;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  children?: NavChild[];
  requires?: Visibility;
}

interface NavSection {
  title: string;
  items: NavItem[];
  requires?: Visibility;
}

interface AdminContext {
  isSuperAdmin: boolean;
  modules: Record<OrgModuleKey, boolean> | null;
  organizationName: string | null;
  // Resolved display name for the active org chrome — falls back to
  // organizationName from the API. Used by the user badge in the header
  // so an org admin sees "<Hospital Name> admin", not "Super admin".
  activeOrgName?: string;
  // Best-effort label derived from the org's plan / type for the
  // sub-line ("hospital admin", "lab admin", etc.). Free-text.
  activeOrgKind?: string;
  // Raw role from the session. Scoped roles (staff/pharmacist/support/hr)
  // get a curated sidebar rather than the full module-gated one so they
  // aren't distracted by surfaces they can't use anyway. Admin/doctor
  // continue to see the full grouped nav filtered by module flags.
  role: string | null;
  // Signed-in user identity, surfaced into the sidebar footer chip so
  // an org admin sees their own email instead of "admin@odudoc.com".
  userName?: string | null;
  userEmail?: string | null;
}

// Narrow nav lists for scoped roles. Each href here MUST also be in the
// matching *_ALLOWED_PREFIXES in middleware.ts — otherwise clicking the
// link bounces the user to their home page. Keep these short and
// task-focused; the whole point is to hide the 100+ item full sidebar.
const SCOPED_ROLE_NAV: Record<string, NavSection[]> = {
  pharmacist: [
    {
      title: "Pharmacy",
      items: [
        { href: "/admin/pharmacy", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
        { href: "/admin/prescriptions", label: "Prescriptions", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
        { href: "/admin/dispensing", label: "Dispense", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
        { href: "/admin/pharmacy-inventory", label: "Inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
        { href: "/admin/formulary", label: "Formulary", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
        { href: "/admin/hospital-rx", label: "Hospital Rx", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
        { href: "/admin/orders", label: "Online Orders", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
      ],
    },
  ],
  staff: [
    {
      title: "Shop",
      items: [
        { href: "/admin/products", label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
        { href: "/admin/categories", label: "Categories", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
        { href: "/admin/tags", label: "Tags", icon: "M5 5a2 2 0 012-2h4l9 9-6 6-9-9V5z" },
        { href: "/admin/coupons", label: "Coupons", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
        { href: "/admin/reviews", label: "Reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.196-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.957z" },
        { href: "/admin/orders", label: "Orders", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
        { href: "/admin/media", label: "Media", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
      ],
    },
  ],
  support: [
    {
      title: "Support",
      items: [
        { href: "/admin/tickets", label: "Tickets", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4z" },
        { href: "/admin/feedback", label: "Feedback", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.196-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.957z" },
        { href: "/admin/orders", label: "Orders", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
        { href: "/admin/notifications", label: "Notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
      ],
    },
  ],
  vendor: [
    {
      title: "Vendor",
      items: [
        { href: "/admin/products", label: "My Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
        { href: "/admin/orders", label: "Orders", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
        { href: "/admin/payouts", label: "Payouts", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
        { href: "/admin/reviews", label: "Reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.196-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.957z" },
      ],
    },
  ],
  hr: [
    {
      title: "People",
      items: [
        { href: "/admin/careers", label: "Job Postings", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
        { href: "/admin/applications", label: "Applications", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
        { href: "/admin/staff", label: "Medical Staff", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
        { href: "/admin/staff-schedule", label: "Schedule", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { href: "/admin/roster", label: "Shift Roster", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
        { href: "/admin/credentialing", label: "Credentialing", icon: "M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14l-7-3-7 3V5a2 2 0 012-2z" },
        { href: "/admin/employee-health", label: "Employee Health", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Reusable icon paths. The sidebar was previously a 1000-line wall of
// inlined SVG `d` strings — most of them duplicates of half a dozen
// shapes. Naming them once here keeps the actual nav config readable.
// ─────────────────────────────────────────────────────────────────────
const I = {
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  doctor: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z",
  cal: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  flask: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  pill: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9H9L8 4z",
  cash: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  card: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  bolt: "M13 10V3L4 14h7v7l9-11h-7z",
  box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  mic: "M19 11a7 7 0 11-14 0m7 7v4m0 0H8m4 0h4m-7-9V5a3 3 0 016 0v8a3 3 0 11-6 0z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  chat: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  bed: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M3 7h18M9 21V11h6v10",
  globe: "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18",
  alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  heart: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  list: "M4 6h16M4 12h16M4 18h7",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  phone: "M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z",
  fx: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4",
  badge: "M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14l-7-3-7 3V5a2 2 0 012-2z",
  send: "M14 5l7 7m0 0l-7 7m7-7H3",
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  ticket: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  cap: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  paint: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  image: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  exclaim: "M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 005 19z",
  hand: "M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11",
  plus: "M12 4v16m8-8H4",
};

// Grouped into logical sections so the sidebar scans at a glance instead of
// being a 17-item wall of links. Every existing /admin/* route is still
// reachable — only the grouping changed. Section subtitles ("Clinical · OPD")
// cluster the 70+ clinical modules into themed shelves.
const navSections: NavSection[] = [
  // ── 1. Overview ──────────────────────────────────────────────────
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: I.chart },
      { href: "/admin/patient-lookup", label: "Find a patient", requires: "core", icon: I.search },
      { href: "/admin/kpi-dashboard", label: "KPI Dashboard", requires: "core", icon: I.chart },
      { href: "/admin/bed-census", label: "Bed Census", requires: "ipd", icon: I.bed },
    ],
  },

  // ── 2. People ────────────────────────────────────────────────────
  {
    title: "Patients",
    items: [
      { href: "/admin/patients", label: "Patients", requires: "patient", icon: I.user },
      { href: "/admin/health-camps", label: "Health Camps", requires: "patient", icon: I.user },
      { href: "/admin/feedback", label: "Patient Feedback", requires: "patientFeedback", icon: I.chat },
    ],
  },
  {
    title: "Doctors",
    requires: "super",
    items: [
      { href: "/admin/doctors", label: "All doctors", icon: I.doctor },
      { href: "/admin/applications", label: "Applications", icon: I.doc },
      { href: "/admin/doctor-invites", label: "Invite doctors", icon: I.mail },
      { href: "/admin/doctors/verifications", label: "Verifications", icon: I.shield },
      { href: "/admin/abdm", label: "ABDM (India)", icon: I.building },
      { href: "/admin/dhis", label: "ABDM Incentive (DHIS)", icon: I.cash },
      { href: "/admin/doctor-earnings", label: "Doctor earnings", icon: I.cash },
      { href: "/admin/letters", label: "Doctor letters", icon: I.mail },
      { href: "/admin/credentialing", label: "Credentialing", requires: "core", icon: I.badge },
    ],
  },
  {
    title: "Staff",
    items: [
      { href: "/admin/staff", label: "Medical staff", requires: "medicalStaff", icon: I.users },
      { href: "/admin/roster", label: "Shift roster", requires: "shiftRoster", icon: I.cal },
      { href: "/admin/staff-schedule", label: "Staff scheduling", requires: "staffScheduling", icon: I.cal },
      { href: "/admin/handover", label: "Duty handover", requires: "dutyHandover", icon: I.send },
      { href: "/admin/employee-health", label: "Employee health", requires: "core", icon: I.heart },
      { href: "/admin/departments", label: "Departments", requires: "super", icon: I.building },
    ],
  },

  // ── 3. Clinical — split by domain so the 70-item list is scannable ─
  {
    title: "Clinical · OPD",
    items: [
      { href: "/admin/appointments", label: "Appointments", requires: "appointments", icon: I.cal },
      { href: "/admin/queue", label: "OPD queue", requires: "opdQueue", icon: I.list },
      { href: "/admin/encounters", label: "Encounters", requires: "encounters", icon: I.doc },
      { href: "/admin/hospital-rx", label: "Hospital Rx", requires: "hospitalRx", icon: I.pill },
      { href: "/admin/prescriptions", label: "Prescriptions", requires: "super", icon: I.pill },
      { href: "/admin/clinical-pathways", label: "Clinical pathways", requires: "opd", icon: I.doc },
      { href: "/admin/telemedicine", label: "Telemedicine", requires: "telemedicine", icon: I.mic },
    ],
  },
  {
    title: "Clinical · IPD",
    items: [
      { href: "/admin/admissions", label: "Admissions", requires: "ipd", icon: I.plus },
      { href: "/admin/wards", label: "Wards & beds", requires: "bedManagement", icon: I.bed },
      { href: "/admin/icu", label: "ICU / Critical care", requires: "icu", icon: I.heart },
      { href: "/admin/discharge", label: "Discharge summaries", requires: "dischargeSummaries", icon: I.doc },
      { href: "/admin/nursing-care", label: "Nursing care", requires: "ipd", icon: I.heart },
      { href: "/admin/vitals", label: "Vitals & EWS", requires: "vitalsEws", icon: I.pulse },
      { href: "/admin/tumor-board", label: "Tumor board", requires: "ipd", icon: I.chat },
      { href: "/admin/rehab", label: "Rehabilitation", requires: "ipd", icon: I.bolt },
    ],
  },
  {
    title: "Clinical · Surgical",
    items: [
      { href: "/admin/surgeries", label: "Surgery / OT", requires: "otScheduling", icon: I.plus },
      { href: "/admin/pac", label: "Pre-anesthesia", requires: "preAnesthesia", icon: I.doc },
      { href: "/admin/endoscopy", label: "Endoscopy", requires: "endoscopy", icon: I.doc },
      { href: "/admin/wound-care", label: "Wound care", requires: "woundCare", icon: I.heart },
      { href: "/admin/pain", label: "Pain management", requires: "painManagement", icon: I.pulse },
    ],
  },
  {
    title: "Clinical · Diagnostics",
    items: [
      { href: "/admin/lab-orders", label: "Lab orders", requires: "lab", icon: I.flask },
      { href: "/admin/lab-tests", label: "Lab tests", requires: "super", icon: I.flask },
      { href: "/admin/radiology", label: "Radiology", requires: "radiology", icon: I.image },
      { href: "/admin/pathology", label: "Pathology", requires: "pathology", icon: I.flask },
    ],
  },
  {
    title: "Clinical · Pharmacy",
    items: [
      { href: "/admin/dispensing", label: "Pharmacy dispense", requires: "pharmacyDispense", icon: I.pill },
      { href: "/admin/pharmacy-inventory", label: "Pharmacy inventory", requires: "pharmacyInventory", icon: I.box },
      { href: "/admin/formulary", label: "Formulary", requires: "pharmacy", icon: I.pill },
      { href: "/admin/antimicrobial-stewardship", label: "AMSP", requires: "pharmacy", icon: I.shield },
    ],
  },
  {
    title: "Clinical · Specialty",
    items: [
      { href: "/admin/cardiology", label: "Cardiology", requires: "cardiology", icon: I.heart },
      { href: "/admin/oncology", label: "Oncology & chemo", requires: "oncology", icon: I.flask },
      { href: "/admin/maternity", label: "Labor & delivery", requires: "laborDelivery", icon: I.user },
      { href: "/admin/dialysis", label: "Dialysis", requires: "dialysis", icon: I.pulse },
      { href: "/admin/physio", label: "Physiotherapy", requires: "physiotherapy", icon: I.bolt },
      { href: "/admin/ent", label: "ENT", requires: "opd", icon: I.user },
      { href: "/admin/dental", label: "Dental", requires: "opd", icon: I.user },
      { href: "/admin/psychiatry", label: "Psychiatry", requires: "opd", icon: I.user },
      { href: "/admin/ophthalmology", label: "Ophthalmology", requires: "opd", icon: I.user },
      { href: "/admin/orthopedics", label: "Orthopedics", requires: "opd", icon: I.user },
    ],
  },
  {
    title: "Clinical · Allied",
    items: [
      { href: "/admin/blood-bank", label: "Blood bank", requires: "bloodBank", icon: I.heart },
      { href: "/admin/ambulance", label: "Ambulance", requires: "ambulance", icon: I.send },
      { href: "/admin/visitors", label: "Visitors", requires: "visitors", icon: I.users },
      { href: "/admin/dietary", label: "Dietary orders", requires: "diet", icon: I.flask },
      { href: "/admin/mortuary", label: "Mortuary", requires: "mortuary", icon: I.bed },
      { href: "/admin/cssd", label: "CSSD sterilization", requires: "cssd", icon: I.flask },
      { href: "/admin/biomedical", label: "Biomedical", requires: "biomedical", icon: I.pulse },
      { href: "/admin/biowaste", label: "Biomedical waste", requires: "biomedicalWaste", icon: I.alert },
      { href: "/admin/medical-gas", label: "Medical gas", requires: "inventory", icon: I.bolt },
      { href: "/admin/housekeeping", label: "Housekeeping", requires: "housekeeping", icon: I.box },
      { href: "/admin/laundry", label: "Linen & laundry", requires: "linenLaundry", icon: I.box },
      { href: "/admin/emergency-codes", label: "Emergency codes", requires: "emergencyCodes", icon: I.alert },
      { href: "/admin/infection", label: "Infection control", requires: "infectionControl", icon: I.shield },
      { href: "/admin/inventory", label: "Inventory", requires: "inventory", icon: I.box },
      { href: "/admin/voice", label: "AI voice", requires: "aiVoice", icon: I.mic },
    ],
  },
  {
    title: "Clinical · Records",
    items: [
      { href: "/admin/mrd", label: "Medical records (MRD)", requires: "patient", icon: I.doc },
      { href: "/admin/documents", label: "Documents", requires: "core", icon: I.doc },
      { href: "/admin/consent", label: "Consent forms", requires: "consentForms", icon: I.doc },
      { href: "/admin/referrals", label: "Referrals", requires: "referrals", icon: I.send },
      { href: "/admin/immunizations", label: "Immunizations", requires: "immunizations", icon: I.shield },
      { href: "/admin/problems", label: "Allergies & problems", requires: "allergiesProblems", icon: I.alert },
      { href: "/admin/incidents", label: "Incident reports", requires: "incidentReports", icon: I.alert },
      { href: "/admin/timetable", label: "Timetable", requires: "super", icon: I.cal },
    ],
  },

  // ── 4. Finance — every money surface in one place ─────────────────
  {
    title: "Finance",
    items: [
      { href: "/admin/revenue", label: "Revenue dashboard", requires: "super", icon: I.chart },
      { href: "/admin/invoices", label: "Invoices", requires: "invoices", icon: I.doc },
      { href: "/admin/gl", label: "General ledger", requires: "billing", icon: I.chart },
      { href: "/admin/ap", label: "Accounts payable", requires: "billing", icon: I.card },
      { href: "/admin/ar-receipts", label: "AR receipts", requires: "billing", icon: I.card },
      { href: "/admin/payouts", label: "Payouts", requires: "super", icon: I.cash },
      { href: "/admin/withdrawals", label: "Withdrawals", requires: "super", icon: I.cash },
      { href: "/admin/insurance", label: "Insurance / TPA", requires: "insurance", icon: I.shield },
      { href: "/admin/cashless", label: "Cashless desk", requires: "super", icon: I.card },
      { href: "/admin/corporate-empanelment", label: "Empanelment", requires: "billing", icon: I.briefcase },
    ],
  },

  // ── 5. Reports & Exports (new central hub) ────────────────────────
  {
    title: "Reports & Exports",
    items: [
      { href: "/admin/reports", label: "Reports hub", requires: "core", icon: I.download },
    ],
  },

  // ── 6. Compliance & Audit ─────────────────────────────────────────
  {
    title: "Compliance & Audit",
    items: [
      { href: "/admin/quality", label: "Quality (NABH)", requires: "core", icon: I.shield },
      { href: "/admin/mortality-audit", label: "M&M audit", requires: "core", icon: I.doc },
      { href: "/admin/audit-log", label: "Audit log", requires: "core", icon: I.doc },
      { href: "/admin/audit-viewer", label: "Audit log viewer", requires: "super", icon: I.search },
      { href: "/admin/platform-audit", label: "Platform audit", requires: "super", icon: I.doc },
      { href: "/admin/privacy-requests", label: "Privacy requests", requires: "super", icon: I.lock },
      { href: "/admin/verifications", label: "ID verifications", requires: "super", icon: I.shield },
      { href: "/admin/ctms", label: "Clinical trials (CTMS)", requires: "core", icon: I.flask },
    ],
  },

  // ── 7. Commerce ──────────────────────────────────────────────────
  {
    title: "Commerce",
    requires: "super",
    items: [
      {
        href: "#shop-group",
        label: "Products",
        icon: I.box,
        children: [
          { href: "/admin/products", label: "All products" },
          { href: "/admin/vendors", label: "Vendors" },
          { href: "/admin/payouts", label: "Payouts" },
          { href: "/admin/categories", label: "Categories" },
          { href: "/admin/tags", label: "Tags" },
          { href: "/admin/coupons", label: "Coupons" },
          { href: "/admin/reviews", label: "Reviews" },
        ],
      },
      { href: "/admin/orders", label: "Orders", icon: I.briefcase },
    ],
  },

  // ── 8. Marketing & Engagement ─────────────────────────────────────
  {
    title: "Marketing & Engagement",
    requires: "super",
    items: [
      { href: "/admin/offers", label: "Special offers", icon: I.ticket },
      { href: "/admin/coupons", label: "Coupon codes", icon: I.ticket },
      { href: "/admin/subscribers", label: "Subscribers", icon: I.mail },
      { href: "/admin/email", label: "Email broadcast", icon: I.mail },
      { href: "/admin/mailbox", label: "Mailbox", icon: I.mail },
      { href: "/admin/tickets", label: "Support tickets", icon: I.chat },
      { href: "/admin/whatsapp", label: "WhatsApp inbox", icon: I.chat },
      { href: "/admin/enterprise-leads", label: "Enterprise leads", icon: I.briefcase },
      { href: "/admin/notifications", label: "Notifications", requires: "core", icon: I.bell },
    ],
  },

  // ── 9. AI — every AI surface in one place ─────────────────────────
  {
    title: "AI",
    requires: "super",
    items: [
      { href: "/admin/ai-usage", label: "Usage & cost", icon: I.chart },
      { href: "/admin/ai-pricing", label: "Pricing override", icon: I.cash },
      { href: "/admin/clinical-ai", label: "Clinical AI bench", icon: I.bolt },
      { href: "/admin/rx-safety", label: "Rx safety bench", icon: I.shield },
      { href: "/admin/discharge-summary", label: "Discharge summary AI", icon: I.doc },
      { href: "/admin/ambient-bench", label: "Ambient scribe bench", icon: I.mic },
      { href: "/admin/voice-station", label: "Voice station", icon: I.mic },
    ],
  },

  // ── 10. Enterprise ops ────────────────────────────────────────────
  {
    title: "Enterprise Ops",
    requires: "super",
    items: [
      { href: "/admin/organizations", label: "Organizations", icon: I.building },
      { href: "/admin/network", label: "Network & transfers", icon: I.link },
      { href: "/admin/auto-roster", label: "Auto-roster", icon: I.cal },
      { href: "/admin/procurement", label: "Procurement", icon: I.box },
      { href: "/admin/lab-ops", label: "Lab operations", icon: I.flask },
      { href: "/admin/rx-fulfillment", label: "Pharmacy ops", icon: I.pill },
      { href: "/admin/teleicu", label: "Tele-ICU center", icon: I.pulse },
      { href: "/admin/passport-scan", label: "Passport scanner", icon: I.search },
      { href: "/admin/demo-wizard", label: "Demo wizard", icon: I.bolt },
    ],
  },

  // ── 11. Content ──────────────────────────────────────────────────
  {
    title: "Content",
    requires: "super",
    items: [
      { href: "/admin/pages", label: "Pages", icon: I.doc },
      { href: "/admin/blog", label: "Blog posts", icon: I.doc },
      { href: "/admin/media", label: "Media library", icon: I.image },
      { href: "/admin/testimonials", label: "Testimonials", icon: I.chat },
      { href: "/admin/gallery", label: "Gallery", icon: I.image },
    ],
  },

  // ── 12. Add-ons — gated per-org by the module catalogue ──────────
  {
    title: "Add-ons",
    items: [
      { href: "/admin/branding", label: "Org branding", requires: "orgBranding", icon: I.paint },
      { href: "/admin/website", label: "Mini-website", requires: "miniWebsite", icon: I.globe },
      { href: "/admin/surgery-video", label: "Surgery video", requires: "surgeryVideo", icon: I.mic },
      { href: "/admin/biometric-kiosk", label: "Biometric kiosk", requires: "biometricEmergency", icon: I.hand },
      { href: "/admin/anti-counterfeit-kiosk", label: "Anti-counterfeit", requires: "antiCounterfeit", icon: I.shield },
      { href: "/admin/pharma/drugs", label: "Pharma · Drugs", requires: "pharmaCatalogue", icon: I.pill },
      { href: "/admin/pharma/partners", label: "Pharma · Partners", requires: "pharmaPartners", icon: I.users },
      { href: "/admin/pharma/promo", label: "Pharma · Promo", requires: "pharmaPromo", icon: I.send },
      { href: "/admin/vacancies", label: "Org vacancies", requires: "orgVacancies", icon: I.briefcase },
      { href: "/admin/education", label: "Education partners", requires: "educationPartner", icon: I.cap },
    ],
  },

  // ── 13. System — global settings + ops ────────────────────────────
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", requires: "super", icon: I.cog },
      { href: "/admin/users", label: "Users & roles", requires: "super", icon: I.users },
      { href: "/admin/emergency-numbers", label: "Emergency numbers", requires: "super", icon: I.phone },
      { href: "/admin/regional-pricing", label: "Regional pricing", requires: "super", icon: I.cash },
      { href: "/admin/fx-rates", label: "FX rates", requires: "super", icon: I.fx },
      { href: "/admin/national-health-ids", label: "Health ID catalogue", requires: "super", icon: I.shield },
      { href: "/admin/customize", label: "Theme", requires: "super", icon: I.paint },
      { href: "/admin/careers", label: "Careers", requires: "super", icon: I.briefcase },
    ],
  },
];

const SHOP_PREFIXES = ["/admin/products", "/admin/vendors", "/admin/payouts", "/admin/categories", "/admin/tags", "/admin/coupons", "/admin/reviews"];

function isVisible(req: Visibility | undefined, ctx: AdminContext | null): boolean {
  if (!req) return true;
  if (!ctx) return false; // hide everything until we know what the viewer is allowed to see
  if (ctx.isSuperAdmin) return true;
  if (req === "super") return false;
  if (req === "core") return true;
  // Module flag — tenant admin only sees it if their org has it enabled.
  // null modules (super-admin with no active org) was handled above.
  return !!ctx.modules?.[req];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    SHOP_PREFIXES.some((p) => pathname.startsWith(p)) ? "#shop-group" : null
  );
  const [ctx, setCtx] = useState<AdminContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Pull tenant context. Refetched on tab focus + every 60s so a
    // super-admin module-flip propagates to the org admin's sidebar
    // without them needing to hard-refresh.
    const fetchCtx = () => {
      fetch("/api/admin/context", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setCtx({
            isSuperAdmin: !!data.isSuperAdmin,
            modules: data.modules ?? null,
            organizationName: data.organizationName ?? null,
            activeOrgName: data.activeOrgName ?? data.organizationName ?? undefined,
            activeOrgKind: data.activeOrgKind ?? undefined,
            role: data.role ?? null,
            userName: data.userName ?? null,
            userEmail: data.userEmail ?? null,
          });
          // Org-admin auto-select: mirror resolved org into localStorage
          // so org-scoped pages pick it up without the user choosing.
          if (typeof window !== "undefined" && !data.isSuperAdmin && data.activeOrgId) {
            const cur = localStorage.getItem("odudoc:active-org");
            if (cur !== data.activeOrgId) {
              localStorage.setItem("odudoc:active-org", data.activeOrgId);
              window.dispatchEvent(new CustomEvent("odudoc:active-org-changed"));
              // Also persist server-side so the active-org cookie is
              // set — without it, requireOrg() in API routes throws
              // no_active_org and pages like /admin/appointments come
              // up empty. Fire-and-forget; getTenantContext also has a
              // single-membership fallback as a safety net.
              fetch("/api/tenant/switch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId: data.activeOrgId }),
              }).catch(() => {});
            }
          }
        })
        .catch(() => {
          // Failed to load context — leave ctx unchanged so the sidebar
          // doesn't flash empty during a transient outage.
        });
    };
    fetchCtx();
    // Visibility-aware polling: refetch on tab focus (catches the
    // "I just got my modules upgraded by support" case) + on a
    // 60s interval as a safety net. Both cheap — context route is
    // a couple of small reads.
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCtx();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(fetchCtx, 60_000);
    // Custom event lets the org-update flow push an immediate refetch
    // without waiting for the interval. /api/organizations PATCH
    // dispatches "odudoc:org-modules-changed" via the notification
    // bell on the next poll; layouts subscribed here pick it up.
    const onModulesChanged = () => fetchCtx();
    window.addEventListener("odudoc:org-modules-changed", onModulesChanged);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
      window.removeEventListener("odudoc:org-modules-changed", onModulesChanged);
    };
  }, []);

  // Scoped roles (staff/pharmacist/support/hr) get a hard-coded minimal
  // sidebar — they shouldn't see the full admin console since middleware
  // blocks them from most of it anyway. Showing the full tree would just
  // advertise surfaces they can't reach and make the UI feel broken.
  const scopedNav = ctx?.role ? SCOPED_ROLE_NAV[ctx.role] : undefined;

  // Filter sections + items by the viewer's visibility. Super-admins see
  // everything; tenant admins only see items their org has modules enabled for.
  const visibleSections = scopedNav
    ? scopedNav
    : navSections
        .filter((s) => isVisible(s.requires, ctx))
        .map((s) => ({ ...s, items: s.items.filter((i) => isVisible(i.requires, ctx)) }))
        .filter((s) => s.items.length > 0);

  const toggleGroup = (href: string) => {
    setExpandedGroup(expandedGroup === href ? null : href);
  };

  return (
    <div className="admin-shell flex">
      {/* Sidebar */}
      <aside
        className={`admin-sidebar fixed left-0 top-0 z-40 flex h-full flex-col border-r border-indigo-900/40 shadow-2xl shadow-indigo-950/30 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-4">
          {(() => {
            // For org admins, swap the platform brand for the org's own
            // name so they feel they're in their hospital's console — not
            // OduDoc's. Super-admins always see the OduDoc mark.
            const isOrgScoped = !!ctx && !ctx.isSuperAdmin && !!ctx.activeOrgName;
            const brandTitle = isOrgScoped ? ctx!.activeOrgName! : "OduDoc";
            const brandInitial = (brandTitle || "O").trim().slice(0, 1).toUpperCase();
            return !collapsed ? (
              <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
                <span className="relative flex h-9 w-9 items-center justify-center admin-brand-logo rounded-xl text-sm font-bold">
                  {brandInitial}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="truncate text-[15px] font-bold tracking-tight text-white" title={brandTitle}>
                    {brandTitle}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-violet-300">
                    Admin Console
                  </span>
                </span>
              </Link>
            ) : (
              <Link href="/admin" className="flex w-full items-center justify-center" title={brandTitle}>
                <span className="flex h-9 w-9 items-center justify-center admin-brand-logo rounded-xl text-sm font-bold">
                  {brandInitial}
                </span>
              </Link>
            );
          })()}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapse button (floating when collapsed) */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-3 mt-3 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Expand sidebar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Nav — custom scrollbar, grouped sections */}
        <nav className="admin-scroll flex-1 overflow-y-auto py-3">
          {visibleSections.map((section) => (
            <div key={section.title} className="mb-3">
              {!collapsed && (
                <div className="mb-1 px-5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/70">
                  {section.title}
                </div>
              )}
              {collapsed && <div className="mx-4 my-3 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />}

              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : !item.children && item.href !== "#shop-group" && pathname.startsWith(item.href);
                const isGroupActive = item.children?.some((child) => pathname.startsWith(child.href));
                const isExpanded = expandedGroup === item.href;

                if (item.children) {
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.href)}
                        className={`group relative mx-2 mb-0.5 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                          isGroupActive
                            ? "bg-white/10 text-white ring-1 ring-violet-400/30"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        {isGroupActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-400" />
                        )}
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
                        </svg>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <svg
                              className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                      {!collapsed && isExpanded && (
                        <div className="mb-1 ml-[26px] space-y-0.5 border-l border-slate-800 pl-3">
                          {item.children.map((child) => {
                            const childActive = pathname.startsWith(child.href);
                            return (
                              <Link
                                key={child.label}
                                href={child.href}
                                className={`block rounded-md px-3 py-1.5 text-[12.5px] transition-colors ${
                                  childActive
                                    ? "font-semibold text-violet-300"
                                    : "text-slate-400 hover:text-slate-100"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`group relative mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-900/40"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/90" />
                    )}
                    <svg
                      className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-200"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
                    </svg>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* "Request more modules" CTA — tenant admins only. Super-admins
            already control every module, so the card is hidden for them.
            Scoped roles don't own module purchasing either, so hide for
            them too. */}
        {ctx && !ctx.isSuperAdmin && !scopedNav && (
          <div className="flex-shrink-0 border-t border-white/10 pt-3">
            <RequestModulesCard collapsed={collapsed} enabledModules={ctx.modules} />
          </div>
        )}

        {/* User footer card */}
        <div className="flex-shrink-0 border-t border-white/10 p-3">
          {(() => {
            // Resolve the signed-in user's display name + email for the
            // footer chip. We prefer the session's name/email so an org
            // admin sees their own identity, not the platform default.
            const fallbackEmail = ctx?.isSuperAdmin ? "admin@odudoc.com" : "";
            const displayName = ctx?.userName?.trim() || (ctx?.isSuperAdmin ? "Admin" : "Org admin");
            const displayEmail = ctx?.userEmail || fallbackEmail;
            const initial = (displayName || displayEmail || "?").trim().slice(0, 1).toUpperCase();
            return !collapsed ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-violet-400/20 backdrop-blur-sm">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 text-[13px] font-bold text-white shadow-lg shadow-violet-900/40 ring-2 ring-slate-900">
                  {initial}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white" title={displayName}>{displayName}</p>
                  <p className="truncate text-[11px] text-slate-500" title={displayEmail || undefined}>
                    {displayEmail || "—"}
                  </p>
                </div>
                <Link
                  href="/"
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-red-400"
                  title="Logout"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="flex justify-center" title={displayEmail || displayName}>
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 text-[13px] font-bold text-white shadow-lg shadow-violet-900/40 ring-2 ring-slate-900">
                  {initial}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>
              </div>
            );
          })()}
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${collapsed ? "ml-[72px]" : "ml-64"}`}>
        {/* Top bar */}
        <header className="admin-header">
          <div className="min-w-0">
            {ctx && !ctx.isSuperAdmin && ctx.activeOrgName ? (
              <>
                <h1 className="truncate text-[15px] font-semibold text-slate-900" title={ctx.activeOrgName}>
                  {ctx.activeOrgName}
                </h1>
                <p className="text-[11px] text-slate-500">
                  {ctx.activeOrgKind ? `${ctx.activeOrgKind} · admin console` : "Admin console"}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[15px] font-semibold text-slate-900">Admin Panel</h1>
                <p className="text-[11px] text-slate-500">Manage your healthcare platform</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Org switcher only for super-admin — tenant admins are
                scoped to their single membership; auto-select handles it. */}
            {ctx?.isSuperAdmin && <OrgSwitcher />}
            {/* Global patient lookup — every admin role can open this;
                visible fields are governed per-role server-side. */}
            <PatientSearchLauncher />
            {/* Search */}
            <div className="relative hidden md:block">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                className="w-60 rounded-lg border border-indigo-100 bg-indigo-50/40 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <button className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700" title="View site">
              <Link href="/">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </button>
            <NotificationBell />
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
                ctx?.isSuperAdmin ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
                                  : "bg-gradient-to-br from-emerald-500 to-teal-500"
              }`}>
                {ctx?.isSuperAdmin ? "A" : (ctx?.activeOrgName || "Org").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[12.5px] font-semibold leading-tight text-slate-800">
                  {ctx?.isSuperAdmin ? "Admin" : ctx?.activeOrgName || "Org admin"}
                </p>
                <p className="text-[10.5px] leading-tight text-slate-500">
                  {ctx?.isSuperAdmin ? "Super admin" : ctx?.activeOrgKind ? `${ctx.activeOrgKind} admin` : "Org admin"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <ImpersonationBanner />
        {/* Temp-password warning: shows up only when the signed-in
            user is still on an admin-issued temporary password and
            counts down to the 3-day expiry — they're auto-locked out
            after that by lib/auth.ts. */}
        <TempPasswordBanner />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Scoped sidebar scrollbar */}
      <style jsx global>{`
        .admin-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .admin-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 3px;
        }
        .admin-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.3);
        }
      `}</style>
    </div>
  );
}

interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: AdminNotificationItem[];
        unread: number;
      };
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // Ignore polling errors — bell will just stay stale.
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    try {
      await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      await load();
    } catch {
      // no-op
    }
  }

  function fmt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        title="Notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              Notifications
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                You&apos;re all caught up.
              </div>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "/admin"}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 ${
                    n.read ? "" : "bg-primary-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] font-semibold text-slate-900">
                      {n.title}
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-600">
                    {n.body}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {fmt(n.createdAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
