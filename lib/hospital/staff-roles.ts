// Staff role enum — pulled into its own file so client components can
// import the type without dragging in the staff-store's Postgres
// dependencies. Keep this 1:1 with the `role` field on StaffMember
// (lib/hospital/staff-store.ts).

export type StaffRole =
  | "doctor"
  | "resident"
  | "nurse"
  | "technician"
  | "pharmacist"
  | "radiographer"
  | "admin"
  | "housekeeping"
  | "other";

export const STAFF_ROLES: StaffRole[] = [
  "doctor",
  "resident",
  "nurse",
  "technician",
  "pharmacist",
  "radiographer",
  "admin",
  "housekeeping",
  "other",
];
