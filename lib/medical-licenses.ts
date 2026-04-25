// Medical-license metadata per jurisdiction.
//
// Drives the label, placeholder, and (loose) format hint shown on the
// doctor registration form. We deliberately don't enforce a strict
// regex per jurisdiction — license-number formats change, exceptions
// abound, and a too-strict client check will lock out doctors for the
// sake of a server-side admin review that catches the same issues.
//
// Used by:
//   - app/for-doctors/register/page.tsx (label/placeholder/help text)
//   - lib/doctor-baa.ts (selects HIPAA BAA vs GDPR DPA wording)
//   - lib/doctors-store.ts (canonicalising the licenseCountry field)

export interface LicenseMeta {
  /** ISO 3166-1 alpha-2 — the value stored in doctor.licenseCountry. */
  country: string;
  /** Display name used in the country dropdown. */
  countryName: string;
  /** What the license is called locally — drives the field label. */
  authorityName: string;
  /** Short label shown above the license-number input. */
  fieldLabel: string;
  /** Placeholder shown inside the license-number input. */
  placeholder: string;
  /** Brief help text shown under the license-number input. */
  helpText: string;
  /** Which compliance framework this jurisdiction uses. Drives
   *  whether the registration form shows a HIPAA BAA, an EU GDPR DPA,
   *  or a generic data-processing agreement. */
  framework: "HIPAA_BAA" | "GDPR_DPA" | "GENERIC_DPA";
}

export const LICENSE_META: Record<string, LicenseMeta> = {
  US: {
    country: "US",
    countryName: "United States",
    authorityName: "NPI / state medical board",
    fieldLabel: "NPI number (10-digit)",
    placeholder: "1234567890",
    helpText: "Enter your 10-digit National Provider Identifier (NPI). State board number is also acceptable.",
    framework: "HIPAA_BAA",
  },
  GB: {
    country: "GB",
    countryName: "United Kingdom",
    authorityName: "GMC",
    fieldLabel: "GMC reference number",
    placeholder: "1234567",
    helpText: "Your General Medical Council reference number, as shown on the GMC online register.",
    framework: "GDPR_DPA",
  },
  IN: {
    country: "IN",
    countryName: "India",
    authorityName: "MCI / State Medical Council",
    fieldLabel: "MCI / State Council registration #",
    placeholder: "MCI-12345 or state reg.",
    helpText: "Medical Council of India registration number, or your state council registration.",
    framework: "GENERIC_DPA",
  },
  AU: {
    country: "AU",
    countryName: "Australia",
    authorityName: "AHPRA",
    fieldLabel: "AHPRA registration number",
    placeholder: "MED0001234567",
    helpText: "Your Australian Health Practitioner Regulation Agency registration number.",
    framework: "GENERIC_DPA",
  },
  CA: {
    country: "CA",
    countryName: "Canada",
    authorityName: "Provincial College of Physicians",
    fieldLabel: "Provincial license #",
    placeholder: "12345",
    helpText: "License number issued by your province's College of Physicians and Surgeons.",
    framework: "HIPAA_BAA", // PHIPA / PIPEDA — close enough that BAA-style language applies
  },
  AE: {
    country: "AE",
    countryName: "United Arab Emirates",
    authorityName: "DHA / HAAD / MOHAP",
    fieldLabel: "DHA / HAAD / MOHAP license #",
    placeholder: "DHA-P-0001234",
    helpText: "Health-authority license — Dubai (DHA), Abu Dhabi (HAAD), or federal (MOHAP).",
    framework: "GENERIC_DPA",
  },
  DE: {
    country: "DE",
    countryName: "Germany",
    authorityName: "Approbation / Landesärztekammer",
    fieldLabel: "Approbation number",
    placeholder: "Arzt-Reg. 12345",
    helpText: "Your medical Approbation number, as issued by the Landesärztekammer.",
    framework: "GDPR_DPA",
  },
  FR: {
    country: "FR",
    countryName: "France",
    authorityName: "Ordre des Médecins (RPPS)",
    fieldLabel: "RPPS number",
    placeholder: "12345678901",
    helpText: "Répertoire Partagé des Professionnels de Santé (11-digit).",
    framework: "GDPR_DPA",
  },
  IE: {
    country: "IE",
    countryName: "Ireland",
    authorityName: "Medical Council of Ireland",
    fieldLabel: "MCRN",
    placeholder: "012345",
    helpText: "Your Medical Council Registration Number.",
    framework: "GDPR_DPA",
  },
  SG: {
    country: "SG",
    countryName: "Singapore",
    authorityName: "Singapore Medical Council",
    fieldLabel: "SMC registration #",
    placeholder: "M12345A",
    helpText: "Singapore Medical Council registration number.",
    framework: "GENERIC_DPA",
  },
  ZA: {
    country: "ZA",
    countryName: "South Africa",
    authorityName: "HPCSA",
    fieldLabel: "HPCSA registration #",
    placeholder: "MP1234567",
    helpText: "Health Professions Council of South Africa registration number.",
    framework: "GENERIC_DPA",
  },
  NG: {
    country: "NG",
    countryName: "Nigeria",
    authorityName: "MDCN",
    fieldLabel: "MDCN folio #",
    placeholder: "MDCN/R/12345",
    helpText: "Medical and Dental Council of Nigeria folio number.",
    framework: "GENERIC_DPA",
  },
};

/** Default fallback when the chosen country isn't in the table. */
export const DEFAULT_LICENSE_META: LicenseMeta = {
  country: "",
  countryName: "Other / not listed",
  authorityName: "Medical authority",
  fieldLabel: "Medical license #",
  placeholder: "Your license / registration number",
  helpText: "Issuing authority + registration number. Admin will verify against your uploaded license.",
  framework: "GENERIC_DPA",
};

/** Look up by ISO 3166-1 alpha-2; case-insensitive. */
export function licenseMetaFor(countryCode: string | undefined | null): LicenseMeta {
  if (!countryCode) return DEFAULT_LICENSE_META;
  return LICENSE_META[countryCode.toUpperCase()] ?? DEFAULT_LICENSE_META;
}

/** Ordered list for the country dropdown — alphabetically by display name. */
export function listLicenseCountries(): LicenseMeta[] {
  return Object.values(LICENSE_META).sort((a, b) =>
    a.countryName.localeCompare(b.countryName),
  );
}
