// Careers store (mock in-memory) — job vacancies + applications

export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship";

export interface JobVacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedAt: string;
  active: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string | null; // null = general application
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  cvFileName: string;
  submittedAt: string;
  status: "new" | "reviewing" | "shortlisted" | "rejected" | "hired";
}

const jobs: JobVacancy[] = [
  {
    id: "job-001",
    title: "Senior Cardiologist",
    department: "Cardiology",
    location: "New York, NY",
    employmentType: "Full-time",
    salary: "$250,000 - $350,000",
    description:
      "Join OduDoc's elite cardiology team. Provide advanced cardiac care via telehealth and in-clinic visits. Help shape our remote cardiology protocols.",
    responsibilities: [
      "Diagnose and treat cardiovascular conditions",
      "Conduct video consultations with patients",
      "Review cardiac imaging and test results",
      "Collaborate with multidisciplinary care teams",
    ],
    requirements: [
      "MD with board certification in Cardiology",
      "Minimum 8 years clinical experience",
      "Active medical license",
      "Experience with telehealth platforms preferred",
    ],
    postedAt: "2026-04-01T10:00:00.000Z",
    active: true,
  },
  {
    id: "job-002",
    title: "Pediatrician (Telehealth)",
    department: "Pediatrics",
    location: "Remote",
    employmentType: "Full-time",
    salary: "$180,000 - $230,000",
    description:
      "Fully remote pediatrician role. Provide virtual care for children and adolescents across the US.",
    responsibilities: [
      "Conduct video visits with pediatric patients",
      "Write prescriptions digitally",
      "Coordinate with in-person care when needed",
    ],
    requirements: [
      "MD with board certification in Pediatrics",
      "5+ years clinical experience",
      "Multi-state licensure a plus",
    ],
    postedAt: "2026-04-05T09:00:00.000Z",
    active: true,
  },
  {
    id: "job-003",
    title: "Full-Stack Engineer (Next.js)",
    department: "Engineering",
    location: "Remote / NYC",
    employmentType: "Full-time",
    salary: "$140,000 - $200,000",
    description:
      "Build and scale the OduDoc platform. Work across Next.js, TypeScript, Node, and PostgreSQL.",
    responsibilities: [
      "Ship patient + doctor-facing features",
      "Own services end-to-end",
      "Collaborate with clinical and design teams",
    ],
    requirements: [
      "4+ years React/Next.js experience",
      "Strong TypeScript skills",
      "Experience with healthcare a plus",
    ],
    postedAt: "2026-04-08T14:00:00.000Z",
    active: true,
  },
  {
    id: "job-004",
    title: "Customer Support Specialist",
    department: "Operations",
    location: "Austin, TX",
    employmentType: "Full-time",
    salary: "$45,000 - $60,000",
    description:
      "Help patients navigate OduDoc. Handle bookings, billing questions, and escalations.",
    responsibilities: [
      "Respond to patient inquiries via chat/email/phone",
      "Triage and escalate clinical issues",
      "Maintain CRM records",
    ],
    requirements: [
      "2+ years customer support experience",
      "Healthcare background a plus",
      "Excellent written communication",
    ],
    postedAt: "2026-04-10T11:00:00.000Z",
    active: true,
  },
];

const applications: JobApplication[] = [
  {
    id: "appl-001",
    jobId: "job-001",
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex.rivera@example.com",
    phone: "+1-555-0233",
    coverLetter: "15 years of interventional cardiology experience. Looking for telehealth-first role.",
    cvFileName: "alex_rivera_cv.pdf",
    submittedAt: "2026-04-12T09:30:00.000Z",
    status: "reviewing",
  },
  {
    id: "appl-002",
    jobId: "job-003",
    firstName: "Priya",
    lastName: "Shah",
    email: "priya.shah@example.com",
    phone: "+1-555-0199",
    cvFileName: "priya_shah_resume.pdf",
    submittedAt: "2026-04-13T14:22:00.000Z",
    status: "new",
  },
];

export function getJobs(activeOnly = false): JobVacancy[] {
  return activeOnly ? jobs.filter((j) => j.active) : [...jobs];
}

export function getJobById(id: string): JobVacancy | null {
  return jobs.find((j) => j.id === id) || null;
}

export function addJob(
  data: Omit<JobVacancy, "id" | "postedAt">
): JobVacancy {
  const job: JobVacancy = {
    ...data,
    id: `job-${String(jobs.length + 1).padStart(3, "0")}-${Date.now()}`,
    postedAt: new Date().toISOString(),
  };
  jobs.unshift(job);
  return job;
}

export function updateJob(id: string, data: Partial<JobVacancy>): JobVacancy | null {
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;
  Object.assign(job, data);
  return job;
}

export function deleteJob(id: string): boolean {
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return false;
  jobs.splice(idx, 1);
  return true;
}

export function getApplications(jobId?: string): JobApplication[] {
  const list = jobId ? applications.filter((a) => a.jobId === jobId) : [...applications];
  return list.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function addApplication(
  data: Omit<JobApplication, "id" | "submittedAt" | "status">
): JobApplication {
  const app: JobApplication = {
    ...data,
    id: `appl-${String(applications.length + 1).padStart(3, "0")}-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "new",
  };
  applications.push(app);
  return app;
}

export function updateApplicationStatus(
  id: string,
  status: JobApplication["status"]
): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  return app;
}
