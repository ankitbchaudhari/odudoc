// Shared helper used by the super-admin "Seed demo org" button and the
// "Create demo for this lead" button on the enterprise-leads page.
// Produces a fully populated demo tenant (org + admin user + doctors +
// staff + sample patients/appointments/notifications) and returns the
// login credentials the caller should hand to the prospect.

import { createOrganization } from "@/lib/organizations-store";
import { createPatient } from "@/lib/patients-store";
import { createAppointment } from "@/lib/hospital/appointments-store";
import { createNotification } from "@/lib/hospital/notifications-store";
import { createUser, findUserByEmail, markEmailVerified } from "@/lib/users-store";
import { createMembership } from "@/lib/memberships-store";

const FIRST_NAMES = ["Aarav", "Priya", "Rohan", "Ananya", "Kabir", "Ishita", "Vihaan", "Meera", "Arjun", "Saanvi", "Reyansh", "Diya", "Ayaan", "Aditi", "Krishna", "Pooja"];
const LAST_NAMES = ["Sharma", "Patel", "Iyer", "Khan", "Reddy", "Singh", "Das", "Nair", "Gupta", "Joshi", "Menon", "Rao"];
const CITIES = ["Mumbai", "Bengaluru", "Delhi", "Chennai", "Hyderabad", "Pune", "Kolkata"];
const CONDITIONS = [[], ["Hypertension"], ["Diabetes Type 2"], ["Asthma"], ["Hypertension", "Diabetes Type 2"]];
const ALLERGIES = [[], ["Penicillin"], ["Peanuts"], ["Dust"]];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

export interface SeedDemoResult {
  org: { id: string; slug: string; name: string; trialEndsAt?: string };
  counts: { patients: number; appointments: number; notifications: number; doctors: number; staff: number };
  login: { url: string; email: string; password: string };
  staff: Array<{ name: string; email: string; password: string; title: string }>;
  demoUserId: string;
}

export function seedDemoOrg(input: { name?: string } = {}): SeedDemoResult {
  const orgName = (input.name?.trim() || `Demo Hospital ${new Date().toISOString().slice(0, 10)}`).slice(0, 80);

  const org = createOrganization({
    name: orgName,
    contactEmail: `demo-${Date.now().toString(36)}@odudoc.example`,
    country: "IN",
    plan: "trial",
    trialDays: 30,
  });

  const today = new Date();
  const isoDate = (offsetDays: number) => {
    const d = new Date(today.getTime() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const createdPatients: string[] = [];
  for (let i = 0; i < 12; i++) {
    const first = pick(FIRST_NAMES, i);
    const last = pick(LAST_NAMES, i + 3);
    const year = 1960 + ((i * 7) % 50);
    const month = String(1 + (i % 12)).padStart(2, "0");
    const day = String(1 + ((i * 13) % 27)).padStart(2, "0");
    const p = createPatient(org.id, {
      firstName: first,
      lastName: last,
      gender: i % 2 === 0 ? "male" : "female",
      dateOfBirth: `${year}-${month}-${day}`,
      phone: `+9198${String(10000000 + i * 12345).slice(0, 8)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${i}@example.com`,
      city: pick(CITIES, i + 1),
      country: "IN",
      chronicConditions: pick(CONDITIONS, i),
      allergies: pick(ALLERGIES, i + 2),
    });
    createdPatients.push(p.id);
  }

  let apptCount = 0;
  const providerIds = ["prov-demo-1", "prov-demo-2"];
  for (let i = 0; i < createdPatients.length; i++) {
    const offset = (i % 10) - 3;
    const hour = 9 + (i % 8);
    const startTime = `${String(hour).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
    const res = createAppointment(org.id, {
      patientId: createdPatients[i],
      providerId: providerIds[i % providerIds.length],
      type: i % 3 === 0 ? "follow_up" : "consultation",
      date: isoDate(offset),
      startTime,
      durationMin: 20,
      reason: pick(["Routine check", "Fever", "Follow-up", "Vaccination", "Blood pressure review"], i),
    });
    if (res.ok) apptCount++;
  }

  let notifCount = 0;
  for (let i = 0; i < 6; i++) {
    const r = createNotification(org.id, {
      channel: i % 2 === 0 ? "sms" : "email",
      category: pick(["appointment", "reminder", "result"], i),
      recipientName: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i)}`,
      recipientContact: i % 2 === 0 ? `+91981234${String(1000 + i).slice(-4)}` : `demo${i}@example.com`,
      subject: "Appointment reminder",
      body: "This is a demo notification. Your appointment is scheduled for tomorrow at 10:00.",
      status: i < 4 ? "sent" : "queued",
      sentAt: i < 4 ? new Date(Date.now() - i * 3600000).toISOString() : undefined,
    });
    if (r.ok) notifCount++;
  }

  const slugKey = org.slug.slice(-6).toUpperCase();
  const demoEmail = `demo-${org.slug}@odudoc.com`;
  const demoPassword = `Demo@${slugKey}2026`;
  let demoUser = findUserByEmail(demoEmail);
  if (!demoUser) {
    demoUser = createUser({
      name: `${org.name} Demo Admin`,
      email: demoEmail,
      phone: "+910000000000",
      password: demoPassword,
      role: "admin",
    });
  }
  // Demo accounts use throwaway emails the prospect will never receive mail
  // at, so skip the "verify your email" gate — otherwise sign-in is blocked
  // on a verification link they can't click.
  markEmailVerified(demoEmail);
  createMembership({
    userId: demoUser.id,
    organizationId: org.id,
    role: "admin",
    title: "Hospital Admin (demo)",
  });

  const staffSeed: Array<{
    role: "doctor" | "staff"; orgRole: "doctor" | "receptionist";
    first: string; last: string; title: string;
  }> = [
    { role: "doctor", orgRole: "doctor", first: "Anika", last: "Desai", title: "General Physician" },
    { role: "doctor", orgRole: "doctor", first: "Rahul", last: "Verma", title: "Cardiologist" },
    { role: "doctor", orgRole: "doctor", first: "Sneha", last: "Kulkarni", title: "Pediatrician" },
    { role: "staff",  orgRole: "receptionist", first: "Kiran", last: "Shah", title: "Receptionist" },
  ];
  const staffCreds: Array<{ name: string; email: string; password: string; title: string }> = [];
  for (const s of staffSeed) {
    const email = `${s.first.toLowerCase()}.${s.last.toLowerCase()}.${org.slug}@odudoc.example`;
    const pw = `${s.first}@${slugKey}`;
    let u = findUserByEmail(email);
    if (!u) {
      u = createUser({
        name: `${s.first} ${s.last}`,
        email,
        phone: "+910000000000",
        password: pw,
        role: s.role,
      });
    }
    markEmailVerified(email);
    createMembership({
      userId: u.id,
      organizationId: org.id,
      role: s.orgRole,
      title: s.title,
    });
    staffCreds.push({ name: `${s.first} ${s.last}`, email, password: pw, title: s.title });
  }

  return {
    org: { id: org.id, slug: org.slug, name: org.name, trialEndsAt: org.trialEndsAt },
    counts: {
      patients: createdPatients.length,
      appointments: apptCount,
      notifications: notifCount,
      doctors: 3,
      staff: 1,
    },
    login: { url: "/auth/login", email: demoEmail, password: demoPassword },
    staff: staffCreds,
    demoUserId: demoUser.id,
  };
}
