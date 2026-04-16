// Doctor registration applications store (mock in-memory)

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface DoctorApplication {
  id: string;
  // Step 1
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  // Step 2
  licenseNumber: string;
  specialty: string;
  subSpecialty: string;
  yearsExperience: number;
  qualifications: string;
  affiliations: string;
  languages: string[];
  // Step 3 - documents (file names only, mock)
  documents: {
    medicalLicense?: string;
    governmentId?: string;
    medicalDegree?: string;
    professionalPhoto?: string;
    specialtyCertifications?: string[];
    hospitalAffiliationLetter?: string;
  };
  // Step 4
  plan: "free" | "premium";
  fee: number;
  // Meta
  submittedAt: string;
  status: ApplicationStatus;
  adminNotes?: string;
}

const applications: DoctorApplication[] = [
  {
    id: "app-001",
    fullName: "Dr. Sarah Chen",
    email: "sarah.chen@example.com",
    phone: "+1-555-0101",
    dateOfBirth: "1985-06-12",
    gender: "Female",
    address: "450 Medical Plaza, San Francisco, CA",
    licenseNumber: "MD-CA-98271",
    specialty: "Cardiology",
    subSpecialty: "Interventional Cardiology",
    yearsExperience: 12,
    qualifications: "MD, Stanford University; Fellowship in Interventional Cardiology, UCSF",
    affiliations: "UCSF Medical Center; California Pacific Medical Center",
    languages: ["English", "Mandarin"],
    documents: {
      medicalLicense: "license_chen.pdf",
      governmentId: "passport_chen.pdf",
      medicalDegree: "md_degree_chen.pdf",
      professionalPhoto: "sarah_chen.jpg",
      specialtyCertifications: ["cardiology_board_cert.pdf"],
    },
    plan: "premium",
    fee: 300,
    submittedAt: "2026-04-10T09:15:00.000Z",
    status: "pending",
  },
  {
    id: "app-002",
    fullName: "Dr. Marcus Johnson",
    email: "marcus.j@example.com",
    phone: "+1-555-0199",
    dateOfBirth: "1978-11-03",
    gender: "Male",
    address: "22 Clinic Road, Austin, TX",
    licenseNumber: "MD-TX-44201",
    specialty: "Dermatology",
    subSpecialty: "Pediatric Dermatology",
    yearsExperience: 18,
    qualifications: "MD, Baylor College of Medicine; Dermatology Residency, Mayo Clinic",
    affiliations: "Austin Skin Clinic",
    languages: ["English", "Spanish"],
    documents: {
      medicalLicense: "license_johnson.pdf",
      governmentId: "dl_johnson.pdf",
      medicalDegree: "degree_johnson.pdf",
      professionalPhoto: "marcus_johnson.jpg",
    },
    plan: "free",
    fee: 180,
    submittedAt: "2026-04-08T14:22:00.000Z",
    status: "approved",
  },
  {
    id: "app-003",
    fullName: "Dr. Priya Patel",
    email: "priya.p@example.com",
    phone: "+1-555-0154",
    dateOfBirth: "1990-02-20",
    gender: "Female",
    address: "988 Health Ave, Jersey City, NJ",
    licenseNumber: "MD-NJ-77310",
    specialty: "Pediatrics",
    subSpecialty: "Neonatology",
    yearsExperience: 7,
    qualifications: "MD, Rutgers Medical School",
    affiliations: "Jersey City General Hospital",
    languages: ["English", "Hindi", "Gujarati"],
    documents: {
      medicalLicense: "license_patel.pdf",
      governmentId: "id_patel.pdf",
      medicalDegree: "degree_patel.pdf",
      professionalPhoto: "priya_patel.jpg",
    },
    plan: "free",
    fee: 150,
    submittedAt: "2026-04-05T11:00:00.000Z",
    status: "rejected",
    adminNotes: "Missing specialty certification documents. Please resubmit.",
  },
];

export function getApplications(): DoctorApplication[] {
  return [...applications];
}

export function getApplicationById(id: string): DoctorApplication | null {
  return applications.find((a) => a.id === id) || null;
}

export function addApplication(
  data: Omit<DoctorApplication, "id" | "submittedAt" | "status">
): DoctorApplication {
  const app: DoctorApplication = {
    ...data,
    id: `app-${String(applications.length + 1).padStart(3, "0")}-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  applications.push(app);
  return app;
}

export function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  adminNotes?: string
): DoctorApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  if (adminNotes !== undefined) app.adminNotes = adminNotes;
  return app;
}
