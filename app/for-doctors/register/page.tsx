"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DoctorPlanComparison from "@/components/DoctorPlanComparison";

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Gynecology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Urology",
];

const LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Hindi",
  "Arabic",
  "French",
  "Portuguese",
  "Russian",
  "Bengali",
  "Japanese",
  "German",
  "Italian",
  "Korean",
  "Turkish",
  "Urdu",
  "Swahili",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Amharic",
  "Persian (Farsi)",
  "Tagalog",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Dutch",
  "Polish",
  "Ukrainian",
  "Romanian",
  "Greek",
  "Hebrew",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Kannada",
  "Malayalam",
  "Somali",
];

interface UploadedFile {
  name: string;
  size: number;
}

interface FormState {
  // Step 1
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  country: string;
  clinicAddress: string;
  // Step 2
  licenseNumber: string;
  specialty: string;
  subSpecialty: string;
  yearsExperience: string;
  qualifications: string;
  affiliations: string;
  languages: string[];
  // Step 3
  documents: {
    medicalLicense: UploadedFile | null;
    governmentId: UploadedFile | null;
    medicalDegree: UploadedFile | null;
    professionalPhoto: UploadedFile | null;
    specialtyCertifications: UploadedFile[];
    hospitalAffiliationLetter: UploadedFile | null;
  };
  // Step 4
  plan: "free" | "premium";
  fee: string;
  // Step 5
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  country: "",
  clinicAddress: "",
  licenseNumber: "",
  specialty: "",
  subSpecialty: "",
  yearsExperience: "",
  qualifications: "",
  affiliations: "",
  languages: [],
  documents: {
    medicalLicense: null,
    governmentId: null,
    medicalDegree: null,
    professionalPhoto: null,
    specialtyCertifications: [],
    hospitalAffiliationLetter: null,
  },
  plan: "free",
  fee: "150",
  acceptTerms: false,
  acceptPrivacy: false,
};

const STEPS = [
  { num: 1, label: "Personal" },
  { num: 2, label: "Professional" },
  { num: 3, label: "Documents" },
  { num: 4, label: "Plan" },
  { num: 5, label: "Review" },
];

function DoctorRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get("plan") as "free" | "premium") || "free";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ ...initialState, plan: initialPlan });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleLanguage = (lang: string) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.fullName.trim()) e.fullName = "Full name is required";
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "Invalid email format";
      if (!form.phone.trim()) e.phone = "Phone is required";
      else if (!/^[+]?[\d\s()-]{7,}$/.test(form.phone))
        e.phone = "Invalid phone format";
      if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required";
      if (!form.gender) e.gender = "Gender is required";
      if (!form.address.trim()) e.address = "Address is required";
      if (!form.country) e.country = "Country is required";
    }
    if (s === 2) {
      if (!form.licenseNumber.trim()) e.licenseNumber = "License number is required";
      if (!form.specialty) e.specialty = "Specialty is required";
      if (!form.yearsExperience) e.yearsExperience = "Experience is required";
      if (!form.qualifications.trim()) e.qualifications = "Qualifications required";
      if (form.languages.length === 0) e.languages = "Select at least one language";
    }
    if (s === 3) {
      if (!form.documents.medicalLicense) e.medicalLicense = "Required";
      if (!form.documents.governmentId) e.governmentId = "Required";
      if (!form.documents.medicalDegree) e.medicalDegree = "Required";
      if (!form.documents.professionalPhoto) e.professionalPhoto = "Required";
    }
    if (s === 4) {
      const feeNum = parseFloat(form.fee);
      const min = 100;
      const max = form.plan === "premium" ? 500 : 250;
      if (isNaN(feeNum) || feeNum < min || feeNum > max)
        e.fee = `Fee must be between $${min} and $${max}`;
    }
    if (s === 5) {
      if (!form.acceptTerms) e.acceptTerms = "You must accept the terms";
      if (!form.acceptPrivacy) e.acceptPrivacy = "You must accept the privacy policy";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(5, s + 1));
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!validateStep(5)) return;
    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: form.address,
        country: form.country,
        clinicAddress: form.clinicAddress,
        licenseNumber: form.licenseNumber,
        specialty: form.specialty,
        subSpecialty: form.subSpecialty,
        yearsExperience: parseInt(form.yearsExperience) || 0,
        qualifications: form.qualifications,
        affiliations: form.affiliations,
        languages: form.languages,
        documents: {
          medicalLicense: form.documents.medicalLicense?.name,
          governmentId: form.documents.governmentId?.name,
          medicalDegree: form.documents.medicalDegree?.name,
          professionalPhoto: form.documents.professionalPhoto?.name,
          specialtyCertifications: form.documents.specialtyCertifications.map((f) => f.name),
          hospitalAffiliationLetter: form.documents.hospitalAffiliationLetter?.name,
        },
        plan: form.plan,
        fee: parseFloat(form.fee),
      };
      const res = await fetch("/api/doctors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/for-doctors/register/success?id=${data.id}`);
      } else {
        alert("Submission failed. Please try again.");
      }
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Doctor Registration</h1>
          <p className="mt-2 text-gray-600">Complete all steps to submit your application</p>
        </div>

        {/* Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      step > s.num
                        ? "bg-primary-600 text-white"
                        : step === s.num
                          ? "bg-primary-600 text-white ring-4 ring-primary-100"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > s.num ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span className="mt-2 hidden text-xs font-medium text-gray-600 sm:block">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-colors ${
                      step > s.num ? "bg-primary-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm md:p-10">
          {step === 1 && (
            <Step1 form={form} update={update} errors={errors} />
          )}
          {step === 2 && (
            <Step2
              form={form}
              update={update}
              errors={errors}
              toggleLanguage={toggleLanguage}
            />
          )}
          {step === 3 && (
            <Step3 form={form} setForm={setForm} errors={errors} />
          )}
          {step === 4 && <Step4 form={form} update={update} errors={errors} />}
          {step === 5 && <Step5 form={form} update={update} errors={errors} />}

          <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              onClick={prev}
              disabled={step === 1}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-50"
            >
              Back
            </button>
            {step < 5 ? (
              <button
                onClick={next}
                className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DoctorRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12 text-center text-gray-500">Loading...</div>}>
      <DoctorRegisterForm />
    </Suspense>
  );
}

function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100";

function Step1({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
      <p className="mt-1 text-sm text-gray-500">Tell us about yourself</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" error={errors.fullName} required>
          <input className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Dr. Jane Smith" />
        </Field>
        <Field label="Email" error={errors.email} required>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="doctor@example.com" />
        </Field>
        <Field label="Phone" error={errors.phone} required>
          <input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 555 0100" />
        </Field>
        <Field label="Date of Birth" error={errors.dateOfBirth} required>
          <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
        </Field>
        <Field label="Gender" error={errors.gender} required>
          <select className={inputClass} value={form.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="">Select...</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </Field>
        <Field label="Address" error={errors.address} required>
          <input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="City, State" />
        </Field>
        <Field label="Country" error={errors.country} required>
          <select className={inputClass} value={form.country} onChange={(e) => update("country", e.target.value)}>
            <option value="">Select a country...</option>
            <option>United States</option>
            <option>United Kingdom</option>
            <option>Canada</option>
            <option>Australia</option>
            <option>India</option>
            <option>Germany</option>
            <option>France</option>
            <option>Brazil</option>
            <option>Nigeria</option>
            <option>South Africa</option>
            <option>Mexico</option>
            <option>Japan</option>
            <option>China</option>
            <option>South Korea</option>
            <option>United Arab Emirates</option>
            <option>Saudi Arabia</option>
            <option>Singapore</option>
            <option>Philippines</option>
            <option>Pakistan</option>
            <option>Egypt</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Clinic/Hospital Address">
            <textarea rows={2} className={inputClass} value={form.clinicAddress} onChange={(e) => update("clinicAddress", e.target.value)} placeholder="Full address of your clinic or hospital" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Step2({
  form,
  update,
  errors,
  toggleLanguage,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
  toggleLanguage: (l: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Professional Details</h2>
      <p className="mt-1 text-sm text-gray-500">Your medical background</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Medical License Number" error={errors.licenseNumber} required>
          <input className={inputClass} value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
        </Field>
        <Field label="Specialty" error={errors.specialty} required>
          <select className={inputClass} value={form.specialty} onChange={(e) => update("specialty", e.target.value)}>
            <option value="">Select a specialty...</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Sub-specialty">
          <input className={inputClass} value={form.subSpecialty} onChange={(e) => update("subSpecialty", e.target.value)} placeholder="e.g., Interventional Cardiology" />
        </Field>
        <Field label="Years of Experience" error={errors.yearsExperience} required>
          <input type="number" min="0" className={inputClass} value={form.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Qualifications" error={errors.qualifications} required>
            <textarea rows={3} className={inputClass} value={form.qualifications} onChange={(e) => update("qualifications", e.target.value)} placeholder="MD, MBBS, Board certifications, etc." />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Hospital/Clinic Affiliations">
            <textarea rows={2} className={inputClass} value={form.affiliations} onChange={(e) => update("affiliations", e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Languages Spoken" error={errors.languages} required>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const on = form.languages.includes(lang);
                return (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      on
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  label,
  file,
  onChange,
  error,
  required,
}: {
  label: string;
  file: UploadedFile | null;
  onChange: (f: UploadedFile | null) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {!file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary-500 hover:bg-primary-50/30">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm text-gray-600"><span className="font-semibold text-primary-600">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-400">PDF, PNG, JPG (max 5MB)</p>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 5 * 1024 * 1024) {
                  alert("File exceeds 5MB");
                  return;
                }
                onChange({ name: f.name, size: f.size });
              }
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary-100 text-primary-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Step3({
  form,
  setForm,
  errors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
}) {
  const setDoc = <K extends keyof FormState["documents"]>(key: K, val: FormState["documents"][K]) => {
    setForm((f) => ({ ...f, documents: { ...f.documents, [key]: val } }));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Document Upload</h2>
      <p className="mt-1 text-sm text-gray-500">
        Upload clear scans or photos. Required documents marked with *.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <DropZone
          label="Medical License Certificate"
          required
          file={form.documents.medicalLicense}
          onChange={(f) => setDoc("medicalLicense", f)}
          error={errors.medicalLicense}
        />
        <DropZone
          label="Government ID Proof"
          required
          file={form.documents.governmentId}
          onChange={(f) => setDoc("governmentId", f)}
          error={errors.governmentId}
        />
        <DropZone
          label="Medical Degree Certificate"
          required
          file={form.documents.medicalDegree}
          onChange={(f) => setDoc("medicalDegree", f)}
          error={errors.medicalDegree}
        />
        <DropZone
          label="Professional Photo"
          required
          file={form.documents.professionalPhoto}
          onChange={(f) => setDoc("professionalPhoto", f)}
          error={errors.professionalPhoto}
        />
        <DropZone
          label="Hospital Affiliation Letter"
          file={form.documents.hospitalAffiliationLetter}
          onChange={(f) => setDoc("hospitalAffiliationLetter", f)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Specialty Certifications (multiple)
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-500 hover:bg-primary-50/30">
            <span className="text-sm font-semibold text-primary-600">+ Add Certification</span>
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                const files = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
                setDoc("specialtyCertifications", [...form.documents.specialtyCertifications, ...files]);
              }}
            />
          </label>
          {form.documents.specialtyCertifications.length > 0 && (
            <ul className="mt-3 space-y-2">
              {form.documents.specialtyCertifications.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDoc(
                        "specialtyCertifications",
                        form.documents.specialtyCertifications.filter((_, j) => j !== i),
                      )
                    }
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Step4({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const maxFee = form.plan === "premium" ? 500 : 250;
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Choose Your Plan</h2>
      <p className="mt-1 text-sm text-gray-500">You can change this anytime from your dashboard</p>
      <div className="mt-6">
        <DoctorPlanComparison
          selectedPlan={form.plan}
          onSelect={(p) => update("plan", p)}
          showCta={false}
        />
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 p-5">
        <Field label={`Your per-consultation fee ($100 - $${maxFee})`} error={errors.fee} required>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">$</span>
            <input
              type="number"
              min="100"
              max={maxFee}
              className={inputClass}
              value={form.fee}
              onChange={(e) => update("fee", e.target.value)}
            />
          </div>
        </Field>
      </div>

      {form.plan === "premium" && (
        <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5">
          <h3 className="font-semibold text-primary-900">Payment (Placeholder)</h3>
          <p className="mt-1 text-sm text-primary-800">
            $250/month will be charged after your application is approved. No payment required now.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="Card Number" />
            <input className={inputClass} placeholder="MM / YY" />
          </div>
        </div>
      )}
    </div>
  );
}

function Step5({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Review & Submit</h2>
      <p className="mt-1 text-sm text-gray-500">Please review your information before submitting</p>

      <div className="mt-6 space-y-5">
        <Summary title="Personal Information">
          <Row k="Full Name" v={form.fullName} />
          <Row k="Email" v={form.email} />
          <Row k="Phone" v={form.phone} />
          <Row k="Date of Birth" v={form.dateOfBirth} />
          <Row k="Gender" v={form.gender} />
          <Row k="Address" v={form.address} />
          <Row k="Country" v={form.country} />
          <Row k="Clinic/Hospital Address" v={form.clinicAddress || "-"} />
        </Summary>
        <Summary title="Professional Details">
          <Row k="License #" v={form.licenseNumber} />
          <Row k="Specialty" v={form.specialty} />
          <Row k="Sub-specialty" v={form.subSpecialty || "-"} />
          <Row k="Experience" v={`${form.yearsExperience} years`} />
          <Row k="Qualifications" v={form.qualifications} />
          <Row k="Affiliations" v={form.affiliations || "-"} />
          <Row k="Languages" v={form.languages.join(", ")} />
        </Summary>
        <Summary title="Documents">
          <Row k="Medical License" v={form.documents.medicalLicense?.name || "-"} />
          <Row k="Government ID" v={form.documents.governmentId?.name || "-"} />
          <Row k="Medical Degree" v={form.documents.medicalDegree?.name || "-"} />
          <Row k="Photo" v={form.documents.professionalPhoto?.name || "-"} />
          <Row
            k="Specialty Certs"
            v={
              form.documents.specialtyCertifications.length
                ? form.documents.specialtyCertifications.map((f) => f.name).join(", ")
                : "-"
            }
          />
        </Summary>
        <Summary title="Subscription">
          <Row k="Plan" v={form.plan === "premium" ? "Premium ($250/mo)" : "Free"} />
          <Row k="Per-Consultation Fee" v={`$${form.fee}`} />
        </Summary>
      </div>

      <div className="mt-8 space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => update("acceptTerms", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            I agree to the <a className="font-semibold text-primary-600 underline">Terms &amp; Conditions</a> for medical professionals.
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-red-600">{errors.acceptTerms}</p>}

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.acceptPrivacy}
            onChange={(e) => update("acceptPrivacy", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            I agree to the <a className="font-semibold text-primary-600 underline">Privacy Policy</a> and consent to document verification.
          </span>
        </label>
        {errors.acceptPrivacy && <p className="text-xs text-red-600">{errors.acceptPrivacy}</p>}
      </div>
    </div>
  );
}

function Summary({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      <dl className="grid gap-2 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-sm">
      <dt className="text-gray-500">{k}</dt>
      <dd className="font-medium text-gray-900">{v || "-"}</dd>
    </div>
  );
}
