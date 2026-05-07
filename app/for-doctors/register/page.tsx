"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import { listLicenseCountries, licenseMetaFor } from "@/lib/medical-licenses";
import PhoneInput from "@/components/PhoneInput";

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

// Comprehensive language list — global + all major Indian languages.
// Keep alphabetised within each group so the picker is scannable.
const LANGUAGE_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Global",
    items: [
      "English",
      "Mandarin",
      "Spanish",
      "Arabic",
      "French",
      "Portuguese",
      "Russian",
      "German",
      "Japanese",
      "Korean",
      "Italian",
      "Dutch",
      "Polish",
      "Ukrainian",
      "Romanian",
      "Greek",
      "Hebrew",
      "Turkish",
      "Persian (Farsi)",
      "Swedish",
      "Norwegian",
      "Danish",
      "Finnish",
      "Czech",
      "Hungarian",
      "Serbian",
      "Croatian",
      "Bulgarian",
      "Slovak",
      "Catalan",
      "Basque",
      "Irish",
      "Welsh",
    ],
  },
  {
    label: "Indian",
    items: [
      "Hindi",
      "Bengali",
      "Marathi",
      "Telugu",
      "Tamil",
      "Gujarati",
      "Urdu",
      "Kannada",
      "Odia",
      "Malayalam",
      "Punjabi",
      "Assamese",
      "Maithili",
      "Santali",
      "Kashmiri",
      "Nepali",
      "Konkani",
      "Sindhi",
      "Dogri",
      "Manipuri",
      "Bodo",
      "Sanskrit",
      "Bhojpuri",
      "Rajasthani",
      "Haryanvi",
      "Tulu",
      "Khasi",
      "Mizo",
    ],
  },
  {
    label: "African",
    items: [
      "Swahili",
      "Hausa",
      "Yoruba",
      "Igbo",
      "Amharic",
      "Zulu",
      "Xhosa",
      "Afrikaans",
      "Somali",
      "Oromo",
      "Shona",
      "Tigrinya",
      "Wolof",
      "Fula",
      "Kinyarwanda",
      "Luganda",
      "Akan",
      "Chichewa",
    ],
  },
  {
    label: "Southeast & East Asian",
    items: [
      "Tagalog",
      "Vietnamese",
      "Thai",
      "Indonesian",
      "Malay",
      "Burmese",
      "Khmer",
      "Lao",
      "Cantonese",
      "Mongolian",
      "Sinhala",
      "Dhivehi",
    ],
  },
  {
    label: "Central & Middle-Eastern",
    items: [
      "Pashto",
      "Dari",
      "Kurdish",
      "Azerbaijani",
      "Armenian",
      "Georgian",
      "Uzbek",
      "Kazakh",
      "Tajik",
      "Turkmen",
      "Kyrgyz",
    ],
  },
];

const LANGUAGES = LANGUAGE_GROUPS.flatMap((g) => g.items);

interface UploadedFile {
  name: string;
  size: number;
  // Populated after the file has been uploaded to Vercel Blob storage.
  // Empty string while upload is in progress.
  url: string;
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
  licenseCountry: string;
  licenseNumber: string;
  licenseExpiry: string;
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
  // Compliance acceptance — typed-name signature against the
  // jurisdiction-appropriate BAA / DPA / generic DPA shown in Step 5.
  complianceAccepted: boolean;
  complianceSignature: string;
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
  licenseCountry: "",
  licenseNumber: "",
  licenseExpiry: "",
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
  complianceAccepted: false,
  complianceSignature: "",
};

const STEPS = [
  { num: 1, label: "Personal" },
  { num: 2, label: "Professional" },
  { num: 3, label: "Documents" },
  { num: 4, label: "Fees" },
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
      if (!form.dateOfBirth) {
        e.dateOfBirth = "Date of birth is required";
      } else {
        // Must be at least 18 years old on today's date.
        const dob = new Date(form.dateOfBirth);
        if (Number.isNaN(dob.getTime())) {
          e.dateOfBirth = "Invalid date";
        } else {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          if (dob > today) e.dateOfBirth = "Date of birth can't be in the future";
          else if (age < 18) e.dateOfBirth = "You must be at least 18 years old to register";
        }
      }
      if (!form.gender) e.gender = "Gender is required";
      if (!form.address.trim()) e.address = "Address is required";
      if (!form.country) e.country = "Country is required";
    }
    if (s === 2) {
      if (!form.licenseCountry) e.licenseCountry = "Select the country that issued your license";
      if (!form.licenseNumber.trim()) e.licenseNumber = "License number is required";
      if (!form.licenseExpiry) {
        e.licenseExpiry = "License expiry date is required";
      } else {
        const expiry = new Date(form.licenseExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(expiry.getTime())) e.licenseExpiry = "Invalid date";
        else if (expiry < today) e.licenseExpiry = "License is already expired — please renew before applying";
      }
      if (!form.specialty) e.specialty = "Specialty is required";
      if (!form.yearsExperience) e.yearsExperience = "Experience is required";
      if (!form.qualifications.trim()) e.qualifications = "Qualifications required";
      if (form.languages.length === 0) e.languages = "Select at least one language";
    }
    if (s === 3) {
      // Require both presence AND a finished upload (url populated).
      const needUrl = (f: UploadedFile | null) => !f || !f.url;
      if (needUrl(form.documents.medicalLicense))
        e.medicalLicense = form.documents.medicalLicense
          ? "Still uploading — please wait"
          : "Required";
      if (needUrl(form.documents.governmentId))
        e.governmentId = form.documents.governmentId
          ? "Still uploading — please wait"
          : "Required";
      if (needUrl(form.documents.medicalDegree))
        e.medicalDegree = form.documents.medicalDegree
          ? "Still uploading — please wait"
          : "Required";
      if (needUrl(form.documents.professionalPhoto))
        e.professionalPhoto = form.documents.professionalPhoto
          ? "Still uploading — please wait"
          : "Required";
    }
    if (s === 4) {
      const feeNum = parseFloat(form.fee);
      if (isNaN(feeNum) || feeNum < 20 || feeNum > 1000)
        e.fee = `Fee must be between $20 and $1,000`;
    }
    if (s === 5) {
      if (!form.acceptTerms) e.acceptTerms = "You must accept the terms";
      if (!form.acceptPrivacy) e.acceptPrivacy = "You must accept the privacy policy";
      if (!form.complianceAccepted) {
        e.complianceSignature = "Tick the data-protection agreement box to continue";
      } else if (!form.complianceSignature.trim() || form.complianceSignature.trim().length < 2) {
        e.complianceSignature = "Type your full name to sign the agreement";
      }
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
        licenseCountry: form.licenseCountry,
        licenseNumber: form.licenseNumber,
        licenseExpiry: form.licenseExpiry,
        complianceSignature: form.complianceSignature,
        specialty: form.specialty,
        subSpecialty: form.subSpecialty,
        yearsExperience: parseInt(form.yearsExperience) || 0,
        qualifications: form.qualifications,
        affiliations: form.affiliations,
        languages: form.languages,
        documents: {
          // Send the Blob URL (where the file actually lives) — admins open
          // this URL to view/download. If upload is still in-flight or
          // failed, fall back to the filename so the record isn't empty.
          medicalLicense:
            form.documents.medicalLicense?.url || form.documents.medicalLicense?.name,
          governmentId:
            form.documents.governmentId?.url || form.documents.governmentId?.name,
          medicalDegree:
            form.documents.medicalDegree?.url || form.documents.medicalDegree?.name,
          professionalPhoto:
            form.documents.professionalPhoto?.url ||
            form.documents.professionalPhoto?.name,
          specialtyCertifications: form.documents.specialtyCertifications.map(
            (f) => f.url || f.name
          ),
          hospitalAffiliationLetter:
            form.documents.hospitalAffiliationLetter?.url ||
            form.documents.hospitalAffiliationLetter?.name,
        },
        plan: form.plan,
        fee: parseFloat(form.fee),
      };
      // Carry through the referral code if one was captured during the
      // applicant's earlier browsing (URL ?ref or 30-day localStorage).
      // Server applies it with inviteAs="doctor" so the eventual
      // qualify event pays out at the doctor-to-doctor rate.
      if (typeof window !== "undefined") {
        try {
          const fromUrl = new URLSearchParams(window.location.search).get("ref");
          let stored: string | undefined;
          const raw = window.localStorage.getItem("odudoc_ref");
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { code?: string; expiresAt?: string };
              if (
                parsed.code &&
                (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() > Date.now())
              ) {
                stored = parsed.code;
              }
            } catch {
              // Older format (raw string) — accept it directly.
              stored = raw;
            }
          }
          const code = (fromUrl || stored || "").trim().toUpperCase();
          if (code.length >= 4 && code.length <= 16) {
            (payload as Record<string, unknown>).referralCode = code;
          }
        } catch {
          // localStorage blocked / parsing failed — proceed without code.
        }
      }
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/40 py-12">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-48 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-700 shadow-sm backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Verified doctor program
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Join OduDoc as a <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">trusted physician</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 sm:text-base">
            Complete five quick steps to submit your application. Verification usually takes 24–48 hours.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-10 rounded-2xl border border-gray-100 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300 ${
                      step > s.num
                        ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white"
                        : step === s.num
                          ? "bg-gradient-to-br from-primary-500 to-indigo-600 text-white ring-4 ring-primary-100"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step > s.num ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className={`mt-2 hidden text-xs font-semibold sm:block ${
                      step >= s.num ? "text-primary-700" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-500 ${
                        step > s.num ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white/90 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur md:p-10">
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

          <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
            <button
              onClick={prev}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <p className="hidden text-xs text-gray-400 sm:block">
              Step <span className="font-bold text-gray-700">{step}</span> of {STEPS.length}
            </p>
            {step < 5 ? (
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/40"
              >
                Continue
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Application
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
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
  icon,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        {icon && <span className="text-primary-500">{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100";

const ICONS = {
  user: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  email: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  phone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
    </svg>
  ),
  calendar: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  location: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  globe: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  ),
  building: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-3m-6 0H5m0 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
    </svg>
  ),
  gender: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a4 4 0 100-8 4 4 0 000 8zm0 0v7m-3-3h6" />
    </svg>
  ),
};

// Upper bound for the DOB picker: today's date minus 18 years, formatted
// as YYYY-MM-DD so <input type="date" max={…}/> honours it.
const MAX_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
})();

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
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-md">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
          <p className="text-sm text-gray-500">Tell us about yourself — we keep this private.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field label="Full Name" error={errors.fullName} required icon={ICONS.user}>
          <input
            className={inputClass}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="Dr. Jane Smith"
          />
        </Field>
        <Field label="Email" error={errors.email} required icon={ICONS.email}>
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="doctor@example.com"
          />
        </Field>
        <Field label="Phone" error={errors.phone} required icon={ICONS.phone}>
          <PhoneInput
            value={form.phone}
            onChange={(next) => update("phone", next)}
          />
        </Field>
        <Field
          label="Date of Birth"
          error={errors.dateOfBirth}
          required
          icon={ICONS.calendar}
          hint="You must be at least 18 years old to register."
        >
          <input
            type="date"
            className={inputClass}
            value={form.dateOfBirth}
            max={MAX_DOB}
            onChange={(e) => update("dateOfBirth", e.target.value)}
          />
        </Field>

        {/* Gender — pill toggle, Male / Female only */}
        <Field label="Gender" error={errors.gender} required icon={ICONS.gender}>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  v: "Male",
                  svg: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="10" cy="14" r="5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l6-6m0 0h-4m4 0v4" />
                    </svg>
                  ),
                },
                {
                  v: "Female",
                  svg: (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="10" r="5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v6m-3-3h6" />
                    </svg>
                  ),
                },
              ] as const
            ).map(({ v, svg }) => {
              const on = form.gender === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => update("gender", v)}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    on
                      ? "border-primary-500 bg-gradient-to-br from-primary-50 to-indigo-50 text-primary-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {svg}
                  {v}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Address" error={errors.address} required icon={ICONS.location}>
          <input
            className={inputClass}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="City, State"
          />
        </Field>
        <Field label="Country" error={errors.country} required icon={ICONS.globe}>
          <select
            className={inputClass}
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
          >
            <option value="">Select a country...</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Clinic / Hospital Address" icon={ICONS.building} hint="Optional — helps patients find your practice.">
            <textarea
              rows={3}
              className={inputClass}
              value={form.clinicAddress}
              onChange={(e) => update("clinicAddress", e.target.value)}
              placeholder="Full address of your clinic or hospital"
            />
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
  const [langQuery, setLangQuery] = useState("");

  const PROFESSIONAL_ICONS = {
    license: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-2-14H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-6-6z" />
      </svg>
    ),
    specialty: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    subspecialty: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    experience: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    qualifications: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    hospital: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6m15 6a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    chat: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-7 8l4-4h8a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h1v4z" />
      </svg>
    ),
  };

  const q = langQuery.trim().toLowerCase();
  const filteredGroups = q
    ? LANGUAGE_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((l) => l.toLowerCase().includes(q)),
      })).filter((g) => g.items.length > 0)
    : LANGUAGE_GROUPS;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-md">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        </span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Professional Details</h2>
          <p className="text-sm text-gray-500">Your medical background and credentials.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field
          label="License Country"
          required
          icon={PROFESSIONAL_ICONS.license}
          hint="The country that issued your medical license. Drives the field labels below."
        >
          <select
            className={inputClass}
            value={form.licenseCountry}
            onChange={(e) => update("licenseCountry", e.target.value)}
          >
            <option value="">Select issuing country…</option>
            {listLicenseCountries().map((m) => (
              <option key={m.country} value={m.country}>
                {m.countryName} — {m.authorityName}
              </option>
            ))}
            <option value="OTHER">Other / not listed</option>
          </select>
        </Field>
        <Field
          label={licenseMetaFor(form.licenseCountry).fieldLabel}
          error={errors.licenseNumber}
          required
          icon={PROFESSIONAL_ICONS.license}
          hint={licenseMetaFor(form.licenseCountry).helpText}
        >
          <input
            className={inputClass}
            value={form.licenseNumber}
            onChange={(e) => update("licenseNumber", e.target.value)}
            placeholder={licenseMetaFor(form.licenseCountry).placeholder}
          />
        </Field>
        <Field
          label="License Expiry"
          required
          icon={PROFESSIONAL_ICONS.license}
          hint="Date your current license expires. We email reminders 30 / 14 / 3 days out."
        >
          <input
            type="date"
            className={inputClass}
            value={form.licenseExpiry}
            onChange={(e) => update("licenseExpiry", e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Specialty" error={errors.specialty} required icon={PROFESSIONAL_ICONS.specialty}>
          <select
            className={inputClass}
            value={form.specialty}
            onChange={(e) => update("specialty", e.target.value)}
          >
            <option value="">Select a specialty...</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sub-specialty" icon={PROFESSIONAL_ICONS.subspecialty} hint="Optional — focus area within your specialty.">
          <input
            className={inputClass}
            value={form.subSpecialty}
            onChange={(e) => update("subSpecialty", e.target.value)}
            placeholder="e.g., Interventional Cardiology"
          />
        </Field>
        <Field label="Years of Experience" error={errors.yearsExperience} required icon={PROFESSIONAL_ICONS.experience}>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={form.yearsExperience}
            onChange={(e) => update("yearsExperience", e.target.value)}
            placeholder="e.g., 8"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Qualifications" error={errors.qualifications} required icon={PROFESSIONAL_ICONS.qualifications}>
            <textarea
              rows={3}
              className={inputClass}
              value={form.qualifications}
              onChange={(e) => update("qualifications", e.target.value)}
              placeholder="MD, MBBS, Board certifications, fellowships…"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Hospital / Clinic Affiliations"
            icon={PROFESSIONAL_ICONS.hospital}
            hint="Where do you currently practise? Separate multiple with commas."
          >
            <textarea
              rows={2}
              className={inputClass}
              value={form.affiliations}
              onChange={(e) => update("affiliations", e.target.value)}
              placeholder="Apollo Hospital Bangalore, Manipal Clinic…"
            />
          </Field>
        </div>

        {/* Languages */}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-4">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <span className="text-primary-500">{PROFESSIONAL_ICONS.chat}</span>
              Languages Spoken <span className="text-red-500">*</span>
            </label>
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-bold text-primary-700">
              {form.languages.length} selected
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-primary-50/30 p-4 shadow-sm">
            {/* Search */}
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
              </svg>
              <input
                value={langQuery}
                onChange={(e) => setLangQuery(e.target.value)}
                placeholder={`Search ${LANGUAGES.length}+ languages…`}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm transition-all placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
            </div>

            {/* Selected chips on top */}
            {form.languages.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
                {form.languages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    {lang}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Groups */}
            <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
              {filteredGroups.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No languages match &quot;{langQuery}&quot;.</p>
              ) : (
                filteredGroups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      {g.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((lang) => {
                        const on = form.languages.includes(lang);
                        return (
                          <button
                            type="button"
                            key={lang}
                            onClick={() => toggleLanguage(lang)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                              on
                                ? "border-primary-500 bg-primary-500/10 text-primary-700"
                                : "border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:bg-primary-50/50"
                            }`}
                          >
                            {on ? "✓ " : ""}
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {errors.languages && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errors.languages}
            </p>
          )}
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handlePick(f: File) {
    if (f.size > 4 * 1024 * 1024) {
      setUploadError("File exceeds 4MB");
      return;
    }
    setUploadError(null);
    setUploading(true);
    onChange({ name: f.name, size: f.size, url: "" });
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/blob/upload-doctor-doc", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      onChange({ name: f.name, size: f.size, url: data.url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      onChange(null);
    } finally {
      setUploading(false);
    }
  }

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
          <p className="text-xs text-gray-400">PDF, PNG, JPG (max 4MB)</p>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePick(f);
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary-100 text-primary-700">
            {uploading ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : file.url ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB
              {uploading && <span className="ml-2 text-primary-600">· uploading…</span>}
              {!uploading && file.url && <span className="ml-2 text-emerald-600">· uploaded ✓</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove file"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {(error || uploadError) && (
        <p className="mt-1 text-xs text-red-600">{uploadError || error}</p>
      )}
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
              onChange={async (e) => {
                const picked = Array.from(e.target.files || []);
                if (picked.length === 0) return;
                // Placeholder rows while each file uploads in parallel
                const placeholders: UploadedFile[] = picked.map((f) => ({
                  name: f.name,
                  size: f.size,
                  url: "",
                }));
                setDoc("specialtyCertifications", [
                  ...form.documents.specialtyCertifications,
                  ...placeholders,
                ]);
                const failed: string[] = [];
                const uploaded = await Promise.all(
                  picked.map(async (f) => {
                    if (f.size > 10 * 1024 * 1024) {
                      failed.push(`${f.name}: file is over 10 MB. Compress or shrink before uploading.`);
                      return { name: f.name, size: f.size, url: "" };
                    }
                    try {
                      const fd = new FormData();
                      fd.append("file", f);
                      const res = await fetch(
                        "/api/blob/upload-doctor-doc",
                        { method: "POST", body: fd }
                      );
                      const data = (await res.json()) as {
                        url?: string;
                        error?: string;
                      };
                      if (!res.ok || !data.url) {
                        throw new Error(data.error || `HTTP ${res.status}`);
                      }
                      return { name: f.name, size: f.size, url: data.url };
                    } catch (err) {
                      failed.push(`${f.name}: ${(err as Error).message || "upload failed"}`);
                      return { name: f.name, size: f.size, url: "" };
                    }
                  })
                );
                // Surface failures clearly — silent failures were producing
                // application records with filenames-only that the admin
                // couldn't open. Better to make the doctor re-upload now.
                if (failed.length > 0) {
                  alert(
                    `Some certifications didn't upload:\n\n${failed.join("\n")}\n\nThese rows will appear unresolved — re-upload them before submitting the application.`
                  );
                }
                // Swap placeholders for fully-uploaded rows
                setForm((fs) => ({
                  ...fs,
                  documents: {
                    ...fs.documents,
                    specialtyCertifications: [
                      ...fs.documents.specialtyCertifications.filter(
                        (x) => !placeholders.some((p) => p.name === x.name && p.url === "" && x.url === "")
                      ),
                      ...uploaded,
                    ],
                  },
                }));
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
  const feeNum = parseFloat(form.fee) || 0;
  const commission = Math.round(feeNum * 0.3 * 100) / 100;
  const payout = Math.round((feeNum - commission) * 100) / 100;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Set Your Fee</h2>
      <p className="mt-1 text-sm text-gray-500">
        No subscription. No monthly fee. OduDoc takes a flat 30% commission per successful consultation.
      </p>

      {/* Commission explainer */}
      <div className="mt-6 rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h3 className="text-base font-bold text-primary-900">How You Earn</h3>
        </div>
        <p className="mt-3 text-sm text-primary-900">
          You set your per-consultation fee. For every successful consultation, you keep
          <strong> 70% </strong> and OduDoc takes <strong>30%</strong> (covers payment processing, hosting, and patient acquisition).
          No charge on cancellations or no-shows.
        </p>
      </div>

      {/* Fee input */}
      <div className="mt-6 rounded-xl border border-gray-200 p-5">
        <Field label="Your per-consultation fee ($20 – $1,000)" error={errors.fee} required>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">$</span>
            <input
              type="number"
              min="20"
              max="1000"
              className={inputClass}
              value={form.fee}
              onChange={(e) => update("fee", e.target.value)}
              placeholder="150"
            />
          </div>
        </Field>

        {feeNum > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs text-gray-500">Patient Pays</div>
              <div className="mt-1 text-xl font-bold text-gray-900">${feeNum.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <div className="text-xs text-green-700">You Get (70%)</div>
              <div className="mt-1 text-xl font-bold text-green-700">${payout.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-primary-50 p-3 text-center">
              <div className="text-xs text-primary-700">OduDoc (30%)</div>
              <div className="mt-1 text-xl font-bold text-primary-700">${commission.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-green-900">No payment required to register</h4>
            <p className="mt-1 text-xs text-green-800">
              Free signup. Free verification. Free dashboard access. You only share revenue when you earn from a consultation.
            </p>
          </div>
        </div>
      </div>
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
        <Summary title="Earnings Model">
          <Row k="Model" v="Commission-based (no monthly fee)" />
          <Row k="Per-Consultation Fee" v={`$${form.fee}`} />
          <Row k="You Keep" v={`$${(parseFloat(form.fee || "0") * 0.7).toFixed(2)} per consultation (70%)`} />
          <Row k="OduDoc Commission" v={`$${(parseFloat(form.fee || "0") * 0.3).toFixed(2)} per consultation (30%)`} />
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

        {/* Compliance acceptance — wording branches off the license
            country picked in Step 2. Captures a typed-name signature
            so the audit log has a defensible artefact, not just a
            checkbox. */}
        {(() => {
          const meta = licenseMetaFor(form.licenseCountry);
          const titles: Record<typeof meta.framework, string> = {
            HIPAA_BAA: "HIPAA Business Associate Agreement",
            GDPR_DPA: "GDPR Data Processing Agreement",
            GENERIC_DPA: "Data Processing Agreement",
          };
          const summaries: Record<typeof meta.framework, string> = {
            HIPAA_BAA:
              "OduDoc acts as a Business Associate under HIPAA. We process Protected Health Information only to deliver consultations you book through the platform; we do not sell PHI; we apply administrative, physical, and technical safeguards; we will report any breach to you within 60 days and to HHS as required.",
            GDPR_DPA:
              "OduDoc acts as a Processor under GDPR / UK GDPR. We process personal data only on your documented instructions, apply Article 32 security measures, transfer data outside the EEA only under Standard Contractual Clauses, and assist with data-subject-rights requests within statutory windows.",
            GENERIC_DPA:
              "OduDoc processes patient data on your behalf solely to deliver booked consultations. We apply industry-standard encryption in transit (TLS 1.3) and at rest (AES-256), keep audit logs of every read and write, and notify you within 72 hours of any confirmed security incident.",
          };
          return (
            <div className="mt-4 rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-teal-50 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary-700">
                Required — {titles[meta.framework]}
              </p>
              <p className="mb-3 text-sm text-gray-700">{summaries[meta.framework]}</p>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.complianceAccepted}
                  onChange={(e) => update("complianceAccepted", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and accept the <strong>{titles[meta.framework]}</strong>. I confirm I am authorised to bind my practice to this agreement.
                </span>
              </label>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Type your full name as a signature *
                </label>
                <input
                  className={inputClass}
                  value={form.complianceSignature}
                  onChange={(e) => update("complianceSignature", e.target.value)}
                  placeholder={form.fullName || "Dr. Your Name"}
                />
              </div>
              {errors.complianceSignature && (
                <p className="mt-1 text-xs text-red-600">{errors.complianceSignature}</p>
              )}
            </div>
          );
        })()}
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
