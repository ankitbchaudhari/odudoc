// Careers store — job vacancies + applications, Postgres-backed.

import { bindPersistentArray } from "./persistent-array";

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
  jobId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  cvFileName: string;
  cvStoredFilename?: string;
  submittedAt: string;
  status: "new" | "reviewing" | "shortlisted" | "rejected" | "hired";
  archivedAt?: string | null;
}

const jobs: JobVacancy[] = [];
const { hydrate: hydrateJobs, flush: flushJobs } = bindPersistentArray<JobVacancy>(
  "careers-jobs",
  jobs,
);

const applications: JobApplication[] = [];
const { hydrate: hydrateApps, flush: flushApps } = bindPersistentArray<JobApplication>(
  "careers-applications",
  applications,
  () => []
);

await Promise.all([hydrateJobs(), hydrateApps()]);

// One-time cleanup: drop the demo job listings + demo applications that
// shipped with the initial seed. IDs are specific so this is safe to
// re-run and won't touch real data.
(function removeLegacySeedCareers() {
  const legacyJobIds = new Set(["job-001", "job-002", "job-003", "job-004"]);
  const legacyApplIds = new Set(["appl-001", "appl-002"]);
  let jobsDirty = false;
  let applsDirty = false;
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (legacyJobIds.has(jobs[i].id)) {
      jobs.splice(i, 1);
      jobsDirty = true;
    }
  }
  for (let i = applications.length - 1; i >= 0; i--) {
    if (legacyApplIds.has(applications[i].id)) {
      applications.splice(i, 1);
      applsDirty = true;
    }
  }
  if (jobsDirty) flushJobs();
  if (applsDirty) flushApps();
})();

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
  flushJobs();
  return job;
}

export function updateJob(id: string, data: Partial<JobVacancy>): JobVacancy | null {
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;
  Object.assign(job, data);
  flushJobs();
  return job;
}

export function deleteJob(id: string): boolean {
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return false;
  jobs.splice(idx, 1);
  flushJobs();
  return true;
}

export function getApplications(
  jobId?: string,
  opts: { includeArchived?: boolean; onlyArchived?: boolean } = {}
): JobApplication[] {
  let list = jobId ? applications.filter((a) => a.jobId === jobId) : [...applications];
  if (opts.onlyArchived) {
    list = list.filter((a) => !!a.archivedAt);
  } else if (!opts.includeArchived) {
    list = list.filter((a) => !a.archivedAt);
  }
  return list.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function getApplicationById(id: string): JobApplication | null {
  return applications.find((a) => a.id === id) || null;
}

export function archiveApplication(id: string): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.archivedAt = new Date().toISOString();
  flushApps();
  return app;
}

export function unarchiveApplication(id: string): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.archivedAt = null;
  flushApps();
  return app;
}

export function deleteApplication(id: string): boolean {
  const idx = applications.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  applications.splice(idx, 1);
  flushApps();
  return true;
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
  flushApps();
  return app;
}

export function updateApplicationStatus(
  id: string,
  status: JobApplication["status"]
): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  flushApps();
  return app;
}
