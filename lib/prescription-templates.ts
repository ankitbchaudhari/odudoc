// 15 prescription template definitions
// Each template is a self-contained React component rendered with prescription data.

export interface PrescriptionData {
  // Doctor
  doctorName: string;
  doctorQualification: string;
  doctorRegistration: string;
  doctorSpecialty: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  logo?: string;
  // Patient
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientId?: string;
  patientPhone?: string;
  date: string;
  // Clinical
  symptoms?: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  tests?: string[];
  advice?: string;
  followUp?: string;
  signature?: string;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  style: "classic" | "modern" | "minimal" | "colorful" | "professional";
  accentColor: string;
  previewBg: string;
}

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: "classic-blue",
    name: "Classic Blue",
    description: "Traditional Rx header with clean blue accents — timeless and professional.",
    style: "classic",
    accentColor: "#0E7490",
    previewBg: "#F0F9FF",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean sans-serif with generous whitespace. Black accents only.",
    style: "minimal",
    accentColor: "#111827",
    previewBg: "#FFFFFF",
  },
  {
    id: "teal-gradient",
    name: "Teal Gradient",
    description: "Soft teal gradient header with modern icon ornament.",
    style: "modern",
    accentColor: "#14B8A6",
    previewBg: "#F0FDFA",
  },
  {
    id: "corporate-navy",
    name: "Corporate Navy",
    description: "Dark navy header with gold accents. Ideal for hospital groups.",
    style: "professional",
    accentColor: "#1E3A8A",
    previewBg: "#EFF6FF",
  },
  {
    id: "emerald-fresh",
    name: "Emerald Fresh",
    description: "Fresh green palette evoking health and wellness.",
    style: "modern",
    accentColor: "#10B981",
    previewBg: "#ECFDF5",
  },
  {
    id: "rose-elegance",
    name: "Rose Elegance",
    description: "Soft rose-pink — popular for gynecology and pediatric clinics.",
    style: "colorful",
    accentColor: "#E11D48",
    previewBg: "#FFF1F2",
  },
  {
    id: "purple-royal",
    name: "Purple Royal",
    description: "Rich purple with gold Rx symbol. Distinctive and bold.",
    style: "colorful",
    accentColor: "#7C3AED",
    previewBg: "#FAF5FF",
  },
  {
    id: "orange-sunshine",
    name: "Orange Sunshine",
    description: "Warm orange — friendly, approachable. Great for family medicine.",
    style: "colorful",
    accentColor: "#EA580C",
    previewBg: "#FFF7ED",
  },
  {
    id: "dark-elegant",
    name: "Dark Elegant",
    description: "Dark slate background with white text. Bold and modern.",
    style: "modern",
    accentColor: "#334155",
    previewBg: "#F1F5F9",
  },
  {
    id: "watermark-rx",
    name: "Watermark Rx",
    description: "Large translucent Rx watermark in background. Classic apothecary feel.",
    style: "classic",
    accentColor: "#DC2626",
    previewBg: "#FEFCE8",
  },
  {
    id: "double-column",
    name: "Double Column",
    description: "Patient info left, medications right — maximum info density.",
    style: "professional",
    accentColor: "#0891B2",
    previewBg: "#ECFEFF",
  },
  {
    id: "bordered-formal",
    name: "Bordered Formal",
    description: "Full page border with decorative corners. Formal, legal-style.",
    style: "classic",
    accentColor: "#78350F",
    previewBg: "#FEFCE8",
  },
  {
    id: "pediatric-playful",
    name: "Pediatric Playful",
    description: "Rounded corners, bright pastels, icon accents for kids' clinics.",
    style: "colorful",
    accentColor: "#F59E0B",
    previewBg: "#FEF3C7",
  },
  {
    id: "dental-clean",
    name: "Dental Clean",
    description: "Pure white with mint accents. Tooth icon in header.",
    style: "minimal",
    accentColor: "#059669",
    previewBg: "#F0FDF4",
  },
  {
    id: "telehealth-digital",
    name: "Telehealth Digital",
    description: "Digital-first layout with QR code slot and e-signature area.",
    style: "modern",
    accentColor: "#2563EB",
    previewBg: "#EFF6FF",
  },
];

export function getTemplateById(id: string): PrescriptionTemplate | undefined {
  return PRESCRIPTION_TEMPLATES.find((t) => t.id === id);
}

export const DEFAULT_TEMPLATE_ID = "classic-blue";

// Sample data for previews
export const SAMPLE_PRESCRIPTION: PrescriptionData = {
  doctorName: "Dr. Sarah Johnson",
  doctorQualification: "MD, MBBS, FRCP",
  doctorRegistration: "Reg No. MCI-98271",
  doctorSpecialty: "General Physician",
  clinicName: "OduDoc Medical Center",
  clinicAddress: "123 Medical Center Dr, New York, NY 10001",
  clinicPhone: "+1 (555) 000-1234",
  clinicEmail: "clinic@odudoc.com",
  patientName: "John Smith",
  patientAge: "34 years",
  patientGender: "Male",
  patientId: "P-10023",
  patientPhone: "+1 (555) 123-4567",
  date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  symptoms: "Persistent cough, mild fever, sore throat for 4 days",
  diagnosis: "Acute upper respiratory tract infection (viral)",
  medications: [
    { name: "Amoxicillin 500mg", dose: "1 capsule", frequency: "3 times daily", duration: "7 days", instructions: "After meals" },
    { name: "Paracetamol 650mg", dose: "1 tablet", frequency: "If fever > 100°F", duration: "As needed", instructions: "Max 4 per day" },
    { name: "Cough Syrup (10ml)", dose: "10 ml", frequency: "3 times daily", duration: "5 days", instructions: "Shake well before use" },
  ],
  tests: ["CBC (Complete Blood Count)", "Chest X-Ray (if symptoms persist)"],
  advice: "Rest adequately. Drink plenty of fluids. Warm salt water gargle 3x daily. Avoid cold drinks.",
  followUp: "Review after 7 days, or sooner if symptoms worsen.",
  signature: "Dr. Sarah Johnson",
};
