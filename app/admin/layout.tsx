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

// Grouped into logical sections so the sidebar scans at a glance instead of
// being a 17-item wall of links.
const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
    ],
  },
  {
    title: "Healthcare",
    requires: "super",
    items: [
      {
        href: "/admin/doctors",
        label: "Doctors",
        icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      {
        href: "/admin/departments",
        label: "Departments",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      },
      {
        href: "/admin/appointments",
        label: "Appointments",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/prescriptions",
        label: "Prescriptions",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/lab-tests",
        label: "Lab Tests",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/timetable",
        label: "Timetable",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
    ],
  },
  {
    title: "Content",
    requires: "super",
    items: [
      {
        href: "/admin/pages",
        label: "Pages",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/blog",
        label: "Blog Posts",
        icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
      },
      {
        href: "/admin/media",
        label: "Media Library",
        icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/testimonials",
        label: "Testimonials",
        icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      },
      {
        href: "/admin/gallery",
        label: "Gallery",
        icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
    ],
  },
  {
    title: "Commerce",
    requires: "super",
    items: [
      {
        href: "#shop-group",
        label: "Products",
        icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
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
      {
        href: "/admin/orders",
        label: "Orders",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      },
      {
        href: "/admin/withdrawals",
        label: "Withdrawals",
        icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
      },
    ],
  },
  {
    title: "Doctors",
    requires: "super",
    items: [
      {
        href: "/admin/applications",
        label: "Doctor Applications",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/doctor-invites",
        label: "Invite Doctors",
        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/doctors/verifications",
        label: "Verifications",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      },
      {
        href: "/admin/abdm",
        label: "ABDM (India)",
        icon: "M3 21h18M3 7l9-4 9 4M5 21V11h14v10M9 21V11M15 21V11",
      },
      {
        href: "/admin/dhis",
        label: "ABDM Incentive (DHIS)",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
      },
      {
        href: "/admin/doctor-earnings",
        label: "Doctor Earnings",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
      },
      {
        href: "/admin/letters",
        label: "Doctor Letters",
        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
    ],
  },
  {
    title: "Clinical",
    items: [
      {
        href: "/admin/patients",
        label: "Patients",
        requires: "patient",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      },
      {
        href: "/admin/patient-lookup",
        label: "Find a patient",
        requires: "core",
        icon: "M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z",
      },
      {
        href: "/admin/appointments",
        label: "Appointments",
        requires: "appointments",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/encounters",
        label: "Encounters",
        requires: "encounters",
        icon: "M19 14l-7 7m0 0l-7-7m7 7V3",
      },
      {
        href: "/admin/hospital-rx",
        label: "Hospital Rx",
        requires: "hospitalRx",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/lab-orders",
        label: "Lab Orders",
        requires: "lab",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/invoices",
        label: "Invoices",
        requires: "invoices",
        icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z",
      },
      {
        href: "/admin/inventory",
        label: "Inventory",
        requires: "inventory",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      },
      {
        href: "/admin/dispensing",
        label: "Pharmacy Dispense",
        requires: "pharmacyDispense",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
      },
      {
        href: "/admin/wards",
        label: "Wards & Beds",
        requires: "bedManagement",
        icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M3 7h18M9 21V11h6v10",
      },
      {
        href: "/admin/admissions",
        label: "Admissions (IPD)",
        requires: "ipd",
        icon: "M12 4v16m8-8H4",
      },
      {
        href: "/admin/surgeries",
        label: "Surgery / OT",
        requires: "otScheduling",
        icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
      },
      {
        href: "/admin/radiology",
        label: "Radiology",
        requires: "radiology",
        icon: "M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z",
      },
      {
        href: "/admin/staff",
        label: "Medical Staff",
        requires: "medicalStaff",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/admin/roster",
        label: "Shift Roster",
        requires: "shiftRoster",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      {
        href: "/admin/voice",
        label: "AI Voice",
        requires: "aiVoice",
        icon: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8",
      },
      {
        href: "/admin/blood-bank",
        label: "Blood Bank",
        requires: "bloodBank",
        icon: "M12 2l-5.5 9a6 6 0 1011 0L12 2z",
      },
      {
        href: "/admin/vitals",
        label: "Vitals & EWS",
        requires: "vitalsEws",
        icon: "M3 12h4l3-8 4 16 3-8h4",
      },
      {
        href: "/admin/insurance",
        label: "Insurance / TPA",
        requires: "insurance",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      },
      {
        href: "/admin/consent",
        label: "Consent Forms",
        requires: "consentForms",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/discharge",
        label: "Discharge Summaries",
        requires: "dischargeSummaries",
        icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
      },
      {
        href: "/admin/immunizations",
        label: "Immunizations",
        requires: "immunizations",
        icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
      },
      {
        href: "/admin/problems",
        label: "Allergies & Problems",
        requires: "allergiesProblems",
        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      },
      {
        href: "/admin/referrals",
        label: "Referrals",
        requires: "referrals",
        icon: "M17 8l4 4m0 0l-4 4m4-4H3",
      },
      {
        href: "/admin/incidents",
        label: "Incident Reports",
        requires: "incidentReports",
        icon: "M12 8v4m0 4h.01M4.062 19h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.33 16c-.77 1.333.192 3 1.732 3z",
      },
      {
        href: "/admin/biomedical",
        label: "Biomedical",
        requires: "biomedical",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
      },
      {
        href: "/admin/dietary",
        label: "Dietary Orders",
        requires: "diet",
        icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
      },
      {
        href: "/admin/cssd",
        label: "CSSD Sterilization",
        requires: "cssd",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/pharmacy-inventory",
        label: "Pharmacy Inventory",
        requires: "pharmacyInventory",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      },
      {
        href: "/admin/staff-schedule",
        label: "Staff Scheduling",
        requires: "staffScheduling",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/biowaste",
        label: "Biomedical Waste",
        requires: "biomedicalWaste",
        icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
      },
      {
        href: "/admin/ambulance",
        label: "Ambulance Dispatch",
        requires: "ambulance",
        icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
      },
      {
        href: "/admin/infection",
        label: "Infection Control",
        requires: "infectionControl",
        icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4v4m0 4h.01M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83m0-14.14l-2.83 2.83M7.76 16.24l-2.83 2.83",
      },
      {
        href: "/admin/queue",
        label: "OPD Queue",
        requires: "opdQueue",
        icon: "M4 6h16M4 12h16M4 18h7",
      },
      {
        href: "/admin/mortuary",
        label: "Mortuary",
        requires: "mortuary",
        icon: "M5 8h14M5 8a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2M9 12h6",
      },
      {
        href: "/admin/feedback",
        label: "Patient Feedback",
        requires: "patientFeedback",
        icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
      },
      {
        href: "/admin/housekeeping",
        label: "Housekeeping",
        requires: "housekeeping",
        icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
      },
      {
        href: "/admin/visitors",
        label: "Visitors",
        requires: "visitors",
        icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 012-2h0a2 2 0 012 2v2m-4 0h4m-4 6a3 3 0 106 0 3 3 0 00-6 0z",
      },
      {
        href: "/admin/handover",
        label: "Duty Handover",
        requires: "dutyHandover",
        icon: "M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4",
      },
      {
        href: "/admin/laundry",
        label: "Linen & Laundry",
        requires: "linenLaundry",
        icon: "M12 3l1.5 3L17 7l-2.5 2.5L15 13l-3-1.5L9 13l.5-3.5L7 7l3.5-1L12 3zM6 20h12a2 2 0 002-2v-2H4v2a2 2 0 002 2z",
      },
      {
        href: "/admin/dialysis",
        label: "Dialysis",
        requires: "dialysis",
        icon: "M12 2v4M8 6h8M6 10h12l-1 10a2 2 0 01-2 2H9a2 2 0 01-2-2L6 10zM10 14v4m4-4v4",
      },
      {
        href: "/admin/emergency-codes",
        label: "Emergency Codes",
        requires: "emergencyCodes",
        icon: "M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 005 19z",
      },
      {
        href: "/admin/maternity",
        label: "Labor & Delivery",
        requires: "laborDelivery",
        icon: "M12 14a4 4 0 100-8 4 4 0 000 8zm0 0v7m-4-4h8",
      },
      {
        href: "/admin/physio",
        label: "Physiotherapy",
        requires: "physiotherapy",
        icon: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        href: "/admin/oncology",
        label: "Oncology & Chemo",
        requires: "oncology",
        icon: "M7 11a4 4 0 118 0 4 4 0 01-8 0zm4-7v2m0 14v2m7-9h2M2 11h2m13.07-5.07l1.42 1.42M4.93 17.07l1.42-1.42m11.31 0l1.42 1.42M4.93 4.93l1.42 1.42",
      },
      {
        href: "/admin/icu",
        label: "ICU / Critical Care",
        requires: "icu",
        icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      },
      {
        href: "/admin/wound-care",
        label: "Wound Care",
        requires: "woundCare",
        icon: "M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364zM8 10l2 2m4-4l2 2",
      },
      {
        href: "/admin/endoscopy",
        label: "Endoscopy",
        requires: "endoscopy",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      },
      {
        href: "/admin/cardiology",
        label: "Cardiology",
        requires: "cardiology",
        icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      },
      {
        href: "/admin/pathology",
        label: "Pathology",
        requires: "pathology",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/telemedicine",
        label: "Telemedicine",
        requires: "telemedicine",
        icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
      },
      {
        href: "/admin/pac",
        label: "Pre-Anesthesia",
        requires: "preAnesthesia",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/pain",
        label: "Pain Management",
        requires: "painManagement",
        icon: "M3 12h4l3-8 4 16 3-8h4",
      },
      {
        href: "/admin/mrd",
        label: "Medical Records",
        requires: "patient",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      },
      {
        href: "/admin/ophthalmology",
        label: "Ophthalmology",
        requires: "opd",
        icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      },
      {
        href: "/admin/dental",
        label: "Dental",
        requires: "opd",
        icon: "M12 2c-1.5 0-3 1-3 3v2c0 1-1 2-2 2s-2 1-2 3c0 2 1 6 2 8s1 2 2 2 2-3 3-3 2 3 3 3 1 0 2-2 2-6 2-8c0-2-1-3-2-3s-2-1-2-2V5c0-2-1.5-3-3-3z",
      },
      {
        href: "/admin/psychiatry",
        label: "Psychiatry",
        requires: "opd",
        icon: "M12 2a10 10 0 00-10 10c0 3.5 1.8 6.5 4.5 8.3L7 22l2-1 3 1 3-1 2 1 .5-1.7A10 10 0 0012 2zm0 6a3 3 0 110 6 3 3 0 010-6z",
      },
      {
        href: "/admin/ent",
        label: "ENT",
        requires: "opd",
        icon: "M12 3c-3 0-6 2-6 6 0 2 1 3 1 5 0 3 2 5 5 5s3-1 3-3c0-3-3-3-3-5s2-3 2-5-1-3-2-3zM7 9a2 2 0 110 4 2 2 0 010-4z",
      },
      {
        href: "/admin/orthopedics",
        label: "Orthopedics",
        requires: "opd",
        icon: "M6 4l4 4-2 2 2 2-4 4m12-12l-4 4 2 2-2 2 4 4M10 10l4 4",
      },
      {
        href: "/admin/quality",
        label: "Quality (NABH)",
        requires: "core",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      },
      {
        href: "/admin/rehab",
        label: "Rehabilitation",
        requires: "ipd",
        icon: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        href: "/admin/credentialing",
        label: "Credentialing",
        requires: "core",
        icon: "M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14l-7-3-7 3V5a2 2 0 012-2z",
      },
      {
        href: "/admin/formulary",
        label: "Formulary",
        requires: "pharmacy",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9h-6L8 4zm0 0a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/admin/nursing-care",
        label: "Nursing Care",
        requires: "ipd",
        icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      },
      {
        href: "/admin/health-camps",
        label: "Health Camps",
        requires: "patient",
        icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
      },
      {
        href: "/admin/corporate-empanelment",
        label: "Empanelment",
        requires: "billing",
        icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/clinical-pathways",
        label: "Clinical Pathways",
        requires: "opd",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      },
      {
        href: "/admin/medical-gas",
        label: "Medical Gas",
        requires: "inventory",
        icon: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        href: "/admin/mortality-audit",
        label: "M&M Audit",
        requires: "core",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/tumor-board",
        label: "Tumor Board",
        requires: "ipd",
        icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4z",
      },
      {
        href: "/admin/antimicrobial-stewardship",
        label: "AMSP",
        requires: "pharmacy",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/employee-health",
        label: "Employee Health",
        requires: "core",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      },
      {
        href: "/admin/gl",
        label: "General Ledger",
        requires: "billing",
        icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/ap",
        label: "Accounts Payable",
        requires: "billing",
        icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/admin/ar-receipts",
        label: "AR Receipts",
        requires: "billing",
        icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        requires: "core",
        icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
      },
      {
        href: "/admin/audit-log",
        label: "Audit Log",
        requires: "core",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/ctms",
        label: "Clinical Trials",
        requires: "core",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/documents",
        label: "Documents",
        requires: "core",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/kpi-dashboard",
        label: "KPI Dashboard",
        requires: "core",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      },
      {
        href: "/admin/bed-census",
        label: "Bed Census",
        requires: "ipd",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
    ],
  },
  {
    title: "Enterprise",
    requires: "super",
    items: [
      {
        href: "/admin/organizations",
        label: "Organizations",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      },
      {
        href: "/admin/network",
        label: "Network & Transfers",
        // Two-circles-with-link icon — represents the partner-org graph.
        icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
      },
      {
        href: "/admin/rx-safety",
        label: "Rx Safety Bench",
        // Shield-with-pulse icon — clinical safety guardrail.
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      },
      {
        href: "/admin/clinical-ai",
        label: "Clinical AI Bench",
        // Brain-spark icon — DDx + ICD-10 copilots.
        icon: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        href: "/admin/discharge-summary",
        label: "Discharge Summary AI",
        // Document-with-checkmark icon — auto-coded summary.
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/ambient-bench",
        label: "Ambient Scribe Bench",
        // Microphone icon — live capture.
        icon: "M19 11a7 7 0 11-14 0m7 7v4m0 0H8m4 0h4m-7-9V5a3 3 0 016 0v8a3 3 0 11-6 0z",
      },
      {
        href: "/admin/passport-scan",
        label: "Passport Scanner",
        // QR-grid icon — health passport scanner.
        icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z",
      },
      {
        href: "/admin/privacy-requests",
        label: "Privacy Requests",
        // Lock-with-shield icon — DPDP requests review.
        icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
      },
      {
        href: "/admin/whatsapp",
        label: "WhatsApp Inbox",
        // Speech-bubble icon — staff conversation console.
        icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      },
      {
        href: "/admin/cashless",
        label: "Cashless Desk",
        // Credit-card icon — TPA pre-auth desk.
        icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      },
      {
        href: "/admin/rx-fulfillment",
        label: "Pharmacy Ops",
        // Pill / capsule icon — Rx fulfillment.
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9H9L8 4z",
      },
      {
        href: "/admin/teleicu",
        label: "Tele-ICU Center",
        // Heart-with-pulse icon — critical care monitoring.
        icon: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 12h2l1-3 2 6 1-3h2",
      },
      {
        href: "/admin/auto-roster",
        label: "Auto-Roster",
        // Calendar grid icon — shift roster solver.
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/procurement",
        label: "Procurement",
        // Box / cube icon — supply chain.
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      },
      {
        href: "/admin/voice-station",
        label: "Voice Station",
        // Microphone-with-pulse icon — bedside voice capture.
        icon: "M19 11a7 7 0 11-14 0m7 7v4m0 0H8m4 0h4m-7-9V5a3 3 0 016 0v8a3 3 0 11-6 0z",
      },
      {
        href: "/admin/audit-viewer",
        label: "Audit Log Viewer",
        // Magnifying-glass-on-document icon — audit trail.
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/revenue",
        label: "Revenue Dashboard",
        // Bar-chart icon — money in.
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      },
      {
        href: "/admin/lab-ops",
        label: "Lab Operations",
        // Test-tube icon — diagnostic chain ops.
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9H9L8 4z",
      },
      {
        href: "/admin/demo-wizard",
        label: "Demo Wizard",
        // Lightning bolt — one-click seed.
        icon: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        href: "/admin/enterprise-leads",
        label: "Demo Requests",
        icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/platform-audit",
        label: "Platform Audit",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
    ],
  },
  {
    title: "Marketing",
    requires: "super",
    items: [
      {
        href: "/admin/offers",
        label: "Special Offers",
        icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
      },
      {
        href: "/admin/coupons",
        label: "Coupon Codes",
        icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
      },
    ],
  },
  {
    title: "Engagement",
    requires: "super",
    items: [
      {
        href: "/admin/subscribers",
        label: "Subscribers",
        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/email",
        label: "Email Broadcast",
        icon: "M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2m18 0v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7m18 0l-9 6-9-6",
      },
      {
        href: "/admin/mailbox",
        label: "Mailbox",
        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/tickets",
        label: "Support Tickets",
        icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
      },
    ],
  },
  {
    title: "AI",
    requires: "super",
    items: [
      {
        href: "/admin/ai-usage",
        label: "AI Usage & Cost",
        icon: "M13 10V3L4 14h7v7l9-11h-7z",
      },
      {
        href: "/admin/ai-pricing",
        label: "AI Pricing Override",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      },
    ],
  },
  {
    // Add-ons section — previously hidden from org admins behind a
    // section-level `requires: "super"`, which silently blocked every
    // per-org add-on (branding, mini-website, surgery video,
    // biometric kiosk, anti-counterfeit, pharma supply chain,
    // vacancies, education partners). Each of those is a real org-
    // level feature flag, so we open the section and gate items
    // individually — only the add-ons toggled on /admin/organizations
    // surface for the org admin.
    title: "Add-ons",
    items: [
      { href: "/admin/branding", label: "Org Branding", requires: "orgBranding", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
      { href: "/admin/website", label: "Mini-Website", requires: "miniWebsite", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
      { href: "/admin/surgery-video", label: "Surgery Video", requires: "surgeryVideo", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
      { href: "/admin/biometric-kiosk", label: "Biometric Kiosk", requires: "biometricEmergency", icon: "M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" },
      { href: "/admin/anti-counterfeit-kiosk", label: "Anti-Counterfeit", requires: "antiCounterfeit", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
      { href: "/admin/pharma/drugs", label: "Pharma · Drugs", requires: "pharmaCatalogue", icon: "M19 14l-7 7m0 0l-7-7m7 7V3" },
      { href: "/admin/pharma/partners", label: "Pharma · Partners", requires: "pharmaPartners", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
      { href: "/admin/pharma/promo", label: "Pharma · Promo", requires: "pharmaPromo", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
      { href: "/admin/vacancies", label: "Org Vacancies", requires: "orgVacancies", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
      { href: "/admin/education", label: "Education Partners", requires: "educationPartner", icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/users",
        label: "Users & Roles",
        requires: "super",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/admin/verifications",
        label: "ID Verifications",
        requires: "super",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      },
      {
        href: "/admin/careers",
        label: "Careers",
        requires: "super",
        icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/customize",
        label: "Theme",
        requires: "super",
        icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        requires: "super",
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      },
      {
        href: "/admin/emergency-numbers",
        label: "Emergency numbers",
        requires: "super",
        icon: "M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z",
      },
      {
        href: "/admin/regional-pricing",
        label: "Regional pricing",
        requires: "super",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      {
        href: "/admin/fx-rates",
        label: "FX rates",
        requires: "super",
        icon: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4",
      },
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
