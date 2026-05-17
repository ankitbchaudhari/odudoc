// Country → medical council label.
//
// Renders "NMC Reg" for India, "NPI" for US, "GMC" for UK, etc. on
// the public doctor profile. Keeps the licenseNumber field generic
// in the data model while still presenting an authoritative-looking
// badge to patients.

const COUNCILS: Record<string, { label: string; full: string }> = {
  IN: { label: "NMC", full: "National Medical Commission" },
  US: { label: "NPI", full: "National Provider Identifier" },
  GB: { label: "GMC", full: "General Medical Council" },
  AE: { label: "MOH", full: "Ministry of Health & Prevention" },
  SA: { label: "SCFHS", full: "Saudi Commission for Health Specialties" },
  SG: { label: "SMC", full: "Singapore Medical Council" },
  AU: { label: "AHPRA", full: "Australian Health Practitioner Regulation Agency" },
  CA: { label: "CPSO", full: "College of Physicians & Surgeons" },
  PK: { label: "PMC", full: "Pakistan Medical Commission" },
  BD: { label: "BMDC", full: "Bangladesh Medical & Dental Council" },
  LK: { label: "SLMC", full: "Sri Lanka Medical Council" },
  NP: { label: "NMC", full: "Nepal Medical Council" },
};

export function councilLabelFor(countryIso2?: string): { label: string; full: string } {
  if (!countryIso2) return { label: "Reg. No.", full: "Medical Registration Number" };
  return COUNCILS[countryIso2.toUpperCase()] || { label: "Reg. No.", full: "Medical Registration Number" };
}
