// ============ TYPES ============

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  experience: number;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  fee: number;
  available: boolean;
  gender: "Male" | "Female";
  about: string;
  services: string[];
  timeSlots: string[];
  country: string;
  clinicAddress?: string;
  imageColor: string;
  initials: string;
  photoUrl?: string;
  instantAvailable?: boolean;
}

export interface Specialty {
  id: string;
  name: string;
  icon: string;
  doctorCount: number;
  description: string;
}

export interface HealthConcern {
  id: string;
  title: string;
  icon: string;
  price: number;
  color: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  doctor: string;
  initials: string;
}

export interface LabTest {
  id: string;
  name: string;
  description: string;
  parameters: number;
  price: number;
  originalPrice: number;
  popular: boolean;
  turnaround: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface FAQPageItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Review {
  name: string;
  rating: number;
  date: string;
  text: string;
}

// ============ DATA ============

export const doctors: Doctor[] = [];

export const specialties: Specialty[] = [
  { id: "general-physician", name: "General Physician", icon: "🩺", doctorCount: 1200, description: "For common health issues" },
  { id: "dentist", name: "Dentist", icon: "🦷", doctorCount: 890, description: "For teeth and gum care" },
  { id: "gynecologist", name: "Gynecologist", icon: "👩‍⚕️", doctorCount: 650, description: "For women's health" },
  { id: "dermatologist", name: "Dermatologist", icon: "✨", doctorCount: 780, description: "For skin and hair" },
  { id: "pediatrician", name: "Pediatrician", icon: "👶", doctorCount: 540, description: "For child health" },
  { id: "orthopedist", name: "Orthopedist", icon: "🦴", doctorCount: 430, description: "For bones and joints" },
  { id: "cardiologist", name: "Cardiologist", icon: "❤️", doctorCount: 320, description: "For heart health" },
  { id: "psychiatrist", name: "Psychiatrist", icon: "🧠", doctorCount: 280, description: "For mental health" },
  { id: "ent-specialist", name: "ENT Specialist", icon: "👂", doctorCount: 350, description: "For ear, nose, throat" },
  { id: "ophthalmologist", name: "Ophthalmologist", icon: "👁️", doctorCount: 290, description: "For eye care" },
  { id: "neurologist", name: "Neurologist", icon: "⚡", doctorCount: 210, description: "For brain & nerves" },
  { id: "urologist", name: "Urologist", icon: "💧", doctorCount: 180, description: "For urinary system" },
];

export const healthConcerns: HealthConcern[] = [
  { id: "period-doubts", title: "Period Doubts or Irregularity", icon: "🌸", price: 25, color: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "acne-skin", title: "Acne, Pimple or Skin Issues", icon: "✨", price: 30, color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "cold-cough", title: "Cold, Cough or Fever", icon: "🤒", price: 20, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "depression-anxiety", title: "Depression or Anxiety", icon: "💭", price: 35, color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { id: "child-health", title: "Child Not Feeling Well", icon: "👶", price: 25, color: "bg-green-50 border-green-200 text-green-700" },
  { id: "stomach-issues", title: "Stomach or Digestion Issues", icon: "🍽️", price: 25, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { id: "diabetes", title: "Diabetes Management", icon: "💉", price: 30, color: "bg-orange-50 border-orange-200 text-orange-700" },
  { id: "back-pain", title: "Back or Joint Pain", icon: "🦴", price: 35, color: "bg-red-50 border-red-200 text-red-700" },
];

export const testimonials: Testimonial[] = [];

export const labTests: LabTest[] = [];

export const faqs: FAQ[] = [
  {
    id: "1",
    question: "How do I book an online video consultation?",
    answer: "Booking a video consultation is simple: Select the specialty or health concern, choose a doctor from the list, pick a convenient time slot, make the payment, and you'll receive a link to join the video call at the scheduled time.",
  },
  {
    id: "2",
    question: "Are the doctors on OduDoc verified?",
    answer: "Yes, all doctors on OduDoc go through a rigorous verification process. We verify their medical registration, qualifications, and years of experience. Only licensed and qualified healthcare professionals are listed on our platform.",
  },
  {
    id: "3",
    question: "Can I get a prescription through video consultation?",
    answer: "Absolutely! After your video consultation, the doctor can provide a digital prescription that you can download and use at any pharmacy. The prescription is legally valid and includes detailed medication instructions.",
  },
  {
    id: "5",
    question: "What if I'm not satisfied with my consultation?",
    answer: "Your satisfaction is our priority. If you're not satisfied with your consultation, you can request a free follow-up consultation within 7 days or reach out to our support team for a full refund.",
  },
  {
    id: "6",
    question: "Is my health data secure on OduDoc?",
    answer: "We take data security very seriously. All your health data is encrypted and stored in HIPAA-compliant servers. We never share your personal health information with third parties without your explicit consent.",
  },
  {
    id: "7",
    question: "Do you offer emergency consultations?",
    answer: "Yes, we offer 24/7 emergency consultations for urgent health concerns. Simply select 'Emergency Consultation' while booking, and you'll be connected to a doctor within 15 minutes.",
  },
  {
    id: "8",
    question: "Can I consult with a specialist directly?",
    answer: "Yes, you can directly book a consultation with any specialist available on our platform. You can filter by specialty, experience, ratings, and availability to find the right doctor for your needs.",
  },
];

// ============ DEPARTMENTS ============

export interface Department {
  id: string;
  slug: string;
  name: string;
  icon: string;
  shortDescription: string;
  fullDescription: string;
  doctorCount: number;
  services: string[];
  relatedDepartments: string[];
  color: string;
}

export const departments: Department[] = [
  {
    id: "cardiology",
    slug: "cardiology",
    name: "Cardiology",
    icon: "❤️",
    shortDescription: "Diagnosis and treatment of heart diseases and cardiovascular conditions.",
    fullDescription: "Our Cardiology department provides comprehensive care for all heart-related conditions. From preventive screenings to complex interventional procedures, our team of experienced cardiologists uses state-of-the-art technology to deliver the best cardiac care. We specialize in coronary artery disease, heart failure, arrhythmias, and valvular heart disease.",
    doctorCount: 12,
    services: ["ECG & Echocardiography", "Cardiac Catheterization", "Angioplasty & Stenting", "Heart Failure Management", "Pacemaker Implantation", "Cardiac Rehabilitation", "Cholesterol Management", "Hypertension Treatment"],
    relatedDepartments: ["pulmonology", "neurology"],
    color: "bg-red-50 text-red-600 border-red-200",
  },
  {
    id: "neurology",
    slug: "neurology",
    name: "Neurology",
    icon: "🧠",
    shortDescription: "Expert care for brain, spinal cord, and nervous system disorders.",
    fullDescription: "The Neurology department at OduDoc offers advanced diagnostic and treatment services for neurological conditions. Our neurologists are trained in the latest techniques for managing epilepsy, stroke, multiple sclerosis, Parkinson's disease, and other nervous system disorders. We combine cutting-edge technology with compassionate care.",
    doctorCount: 8,
    services: ["EEG & EMG Testing", "Stroke Management", "Epilepsy Treatment", "Headache & Migraine Clinic", "Movement Disorder Therapy", "Nerve Conduction Studies", "Memory Disorder Assessment", "Neuromuscular Disease Treatment"],
    relatedDepartments: ["psychiatry", "orthopedics"],
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    id: "orthopedics",
    slug: "orthopedics",
    name: "Orthopedics",
    icon: "🦴",
    shortDescription: "Comprehensive musculoskeletal care including bones, joints, and spine.",
    fullDescription: "Our Orthopedics department specializes in the prevention, diagnosis, and treatment of disorders of the musculoskeletal system. From sports injuries to joint replacements, our surgeons perform thousands of successful procedures annually using minimally invasive techniques and advanced surgical robotics.",
    doctorCount: 10,
    services: ["Joint Replacement Surgery", "Arthroscopic Surgery", "Spine Surgery", "Sports Medicine", "Fracture Treatment", "Physical Rehabilitation", "Bone Density Testing", "Hand & Wrist Surgery"],
    relatedDepartments: ["neurology", "pediatrics"],
    color: "bg-orange-50 text-orange-600 border-orange-200",
  },
  {
    id: "pediatrics",
    slug: "pediatrics",
    name: "Pediatrics",
    icon: "👶",
    shortDescription: "Specialized healthcare for infants, children, and adolescents.",
    fullDescription: "The Pediatrics department provides comprehensive healthcare for children from birth through adolescence. Our pediatricians offer preventive care, immunizations, developmental assessments, and treatment for childhood illnesses in a child-friendly environment designed to make young patients feel comfortable.",
    doctorCount: 14,
    services: ["Well-Child Visits", "Vaccination Programs", "Growth & Development Monitoring", "Childhood Infection Treatment", "Asthma & Allergy Management", "Nutritional Counseling", "Behavioral Health Support", "Neonatal Care"],
    relatedDepartments: ["dermatology", "ent"],
    color: "bg-green-50 text-green-600 border-green-200",
  },
  {
    id: "dermatology",
    slug: "dermatology",
    name: "Dermatology",
    icon: "✨",
    shortDescription: "Treatment for skin, hair, and nail conditions with cosmetic solutions.",
    fullDescription: "Our Dermatology department offers expert diagnosis and treatment for a wide range of skin conditions. From common issues like acne and eczema to complex dermatological surgeries, our board-certified dermatologists provide personalized care using the latest treatments and technologies.",
    doctorCount: 9,
    services: ["Acne Treatment", "Psoriasis & Eczema Care", "Skin Cancer Screening", "Laser Therapy", "Hair Loss Treatment", "Cosmetic Dermatology", "Allergy Patch Testing", "Mole Removal"],
    relatedDepartments: ["pediatrics", "gynecology"],
    color: "bg-pink-50 text-pink-600 border-pink-200",
  },
  {
    id: "gynecology",
    slug: "gynecology",
    name: "Gynecology",
    icon: "👩‍⚕️",
    shortDescription: "Complete women's health services from adolescence through menopause.",
    fullDescription: "The Gynecology department provides comprehensive women's health services including routine examinations, prenatal care, fertility treatments, and gynecological surgeries. Our team of experienced gynecologists and obstetricians ensures compassionate, personalized care for every stage of a woman's life.",
    doctorCount: 11,
    services: ["Prenatal & Postnatal Care", "High-Risk Pregnancy Management", "Fertility Consultation", "PCOS Treatment", "Menopause Management", "Gynecological Surgery", "Pap Smear & Screening", "Family Planning"],
    relatedDepartments: ["pediatrics", "urology"],
    color: "bg-rose-50 text-rose-600 border-rose-200",
  },
  {
    id: "ophthalmology",
    slug: "ophthalmology",
    name: "Ophthalmology",
    icon: "👁️",
    shortDescription: "Complete eye care services from vision correction to complex surgeries.",
    fullDescription: "Our Ophthalmology department provides comprehensive eye care services including routine eye exams, vision correction, cataract surgery, glaucoma treatment, and retinal procedures. Using advanced diagnostic equipment and surgical technology, our ophthalmologists deliver precise, effective eye care.",
    doctorCount: 7,
    services: ["Comprehensive Eye Exams", "Cataract Surgery", "LASIK & Refractive Surgery", "Glaucoma Treatment", "Retina & Vitreous Surgery", "Pediatric Ophthalmology", "Corneal Transplant", "Diabetic Eye Care"],
    relatedDepartments: ["neurology", "dermatology"],
    color: "bg-cyan-50 text-cyan-600 border-cyan-200",
  },
  {
    id: "dentistry",
    slug: "dentistry",
    name: "Dentistry",
    icon: "🦷",
    shortDescription: "Full range of dental care from preventive to cosmetic procedures.",
    fullDescription: "The Dentistry department offers a full spectrum of dental services in a comfortable and modern setting. From routine cleanings and fillings to advanced procedures like dental implants and orthodontics, our dental professionals use the latest techniques to ensure optimal oral health and beautiful smiles.",
    doctorCount: 8,
    services: ["Dental Cleaning & Checkups", "Root Canal Therapy", "Dental Implants", "Orthodontics & Braces", "Teeth Whitening", "Wisdom Tooth Extraction", "Cosmetic Dentistry", "Pediatric Dentistry"],
    relatedDepartments: ["ent", "pediatrics"],
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    id: "psychiatry",
    slug: "psychiatry",
    name: "Psychiatry",
    icon: "💭",
    shortDescription: "Mental health care with therapy, counseling, and medication management.",
    fullDescription: "Our Psychiatry department provides compassionate mental health care for patients of all ages. Our psychiatrists specialize in diagnosing and treating a wide range of mental health conditions using evidence-based approaches including psychotherapy, medication management, and holistic wellness strategies.",
    doctorCount: 6,
    services: ["Depression & Anxiety Treatment", "Cognitive Behavioral Therapy", "PTSD & Trauma Therapy", "OCD Treatment", "Bipolar Disorder Management", "Addiction Counseling", "Child & Adolescent Psychiatry", "Stress Management Programs"],
    relatedDepartments: ["neurology", "pediatrics"],
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    id: "urology",
    slug: "urology",
    name: "Urology",
    icon: "💧",
    shortDescription: "Specialized care for urinary tract and male reproductive health.",
    fullDescription: "The Urology department offers comprehensive care for conditions affecting the urinary system and male reproductive organs. Our urologists are experts in both medical and surgical treatments, utilizing minimally invasive techniques and robotic-assisted surgery for optimal patient outcomes.",
    doctorCount: 5,
    services: ["Kidney Stone Treatment", "Prostate Care", "Urinary Tract Infection Treatment", "Bladder Disorder Management", "Male Infertility Treatment", "Robotic Urological Surgery", "Urinary Incontinence Treatment", "Vasectomy & Reversal"],
    relatedDepartments: ["gynecology", "gastroenterology"],
    color: "bg-sky-50 text-sky-600 border-sky-200",
  },
  {
    id: "gastroenterology",
    slug: "gastroenterology",
    name: "Gastroenterology",
    icon: "🍽️",
    shortDescription: "Diagnosis and treatment of digestive system disorders.",
    fullDescription: "Our Gastroenterology department specializes in the diagnosis, treatment, and prevention of diseases of the digestive system. From acid reflux to liver disease, our gastroenterologists provide expert care using advanced endoscopic procedures and the latest treatment protocols.",
    doctorCount: 7,
    services: ["Endoscopy & Colonoscopy", "Acid Reflux Treatment", "IBS & IBD Management", "Liver Disease Treatment", "Gallbladder Treatment", "Pancreatic Disorder Care", "Hepatitis Management", "Nutritional Counseling"],
    relatedDepartments: ["oncology", "urology"],
    color: "bg-yellow-50 text-yellow-600 border-yellow-200",
  },
  {
    id: "pulmonology",
    slug: "pulmonology",
    name: "Pulmonology",
    icon: "🫁",
    shortDescription: "Expert treatment for respiratory and lung-related conditions.",
    fullDescription: "The Pulmonology department provides comprehensive care for patients with respiratory conditions. Our pulmonologists specialize in the diagnosis and treatment of asthma, COPD, pneumonia, lung cancer, and sleep disorders using advanced pulmonary function testing and bronchoscopy procedures.",
    doctorCount: 6,
    services: ["Asthma Management", "COPD Treatment", "Pulmonary Function Testing", "Bronchoscopy", "Sleep Apnea Treatment", "Lung Cancer Screening", "Tuberculosis Treatment", "Respiratory Rehabilitation"],
    relatedDepartments: ["cardiology", "oncology"],
    color: "bg-teal-50 text-teal-600 border-teal-200",
  },
  {
    id: "oncology",
    slug: "oncology",
    name: "Oncology",
    icon: "🎗️",
    shortDescription: "Comprehensive cancer care from diagnosis through treatment and recovery.",
    fullDescription: "Our Oncology department provides compassionate, comprehensive cancer care. From early detection and diagnosis to surgery, chemotherapy, radiation therapy, and survivorship programs, our multidisciplinary team of oncologists works together to deliver personalized treatment plans for every patient.",
    doctorCount: 9,
    services: ["Cancer Screening & Diagnosis", "Chemotherapy", "Radiation Therapy", "Surgical Oncology", "Immunotherapy", "Targeted Therapy", "Palliative Care", "Cancer Rehabilitation"],
    relatedDepartments: ["pulmonology", "gastroenterology"],
    color: "bg-violet-50 text-violet-600 border-violet-200",
  },
  {
    id: "ent",
    slug: "ent",
    name: "ENT (Ear, Nose & Throat)",
    icon: "👂",
    shortDescription: "Specialized care for ear, nose, throat, and related head/neck conditions.",
    fullDescription: "The ENT department offers expert diagnosis and treatment for conditions affecting the ear, nose, throat, and related structures of the head and neck. Our ENT specialists provide both medical and surgical treatments for hearing disorders, sinus conditions, voice problems, and more.",
    doctorCount: 6,
    services: ["Hearing Tests & Hearing Aids", "Sinus Treatment & Surgery", "Tonsillectomy", "Voice & Swallowing Disorders", "Allergy Testing & Treatment", "Sleep Apnea Solutions", "Thyroid & Parathyroid Surgery", "Ear Infection Treatment"],
    relatedDepartments: ["pulmonology", "pediatrics"],
    color: "bg-amber-50 text-amber-600 border-amber-200",
  },
];

// ============ TIMETABLE ============

export interface TimetableEntry {
  id: string;
  doctorName: string;
  department: string;
  day: string;
  timeSlot: "morning" | "afternoon" | "evening";
  time: string;
  color: string;
}

export const timetableEntries: TimetableEntry[] = [];

// ============ PRICING PLANS ============

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: PricingFeature[];
  popular: boolean;
  cta: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 29,
    annualPrice: 299,
    description: "Essential healthcare coverage for individuals seeking basic medical support.",
    features: [
      { text: "2 Doctor Consultations/month", included: true },
      { text: "Basic Lab Tests (10% discount)", included: true },
      { text: "Digital Health Records", included: true },
      { text: "Email Support", included: true },
      { text: "Health Articles Access", included: true },
      { text: "Video Consultations", included: false },
      { text: "Priority Support 24/7", included: false },
      { text: "Family Coverage", included: false },
      { text: "Digital Prescriptions", included: false },
      { text: "Surgery Consultations", included: false },
      { text: "Dedicated Health Manager", included: false },
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 79,
    annualPrice: 799,
    description: "Comprehensive healthcare for individuals and small families who want more.",
    features: [
      { text: "Unlimited Doctor Consultations", included: true },
      { text: "All Lab Tests (25% discount)", included: true },
      { text: "Digital Health Records", included: true },
      { text: "Priority Support 24/7", included: true },
      { text: "Health Articles Access", included: true },
      { text: "Video Consultations", included: true },
      { text: "Family Coverage (up to 3)", included: true },
      { text: "Digital Prescriptions", included: true },
      { text: "Surgery Consultations", included: false },
      { text: "Dedicated Health Manager", included: false },
      { text: "Corporate Wellness Program", included: false },
    ],
    popular: true,
    cta: "Get Started",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 149,
    annualPrice: 1499,
    description: "Premium healthcare with VIP support for families and corporate wellness.",
    features: [
      { text: "Everything in Premium", included: true },
      { text: "Unlimited Family Coverage", included: true },
      { text: "Surgery Consultations", included: true },
      { text: "Dedicated Health Manager", included: true },
      { text: "Corporate Wellness Program", included: true },
      { text: "Custom Health Reports", included: true },
      { text: "VIP Support", included: true },
      { text: "Home Visit Doctors", included: true },
      { text: "International Coverage", included: true },
      { text: "Annual Executive Checkup", included: true },
      { text: "Mental Health Support", included: true },
    ],
    popular: false,
    cta: "Get Started",
  },
];

export const pricingFAQs: FAQ[] = [
  {
    id: "p1",
    question: "Can I switch plans at any time?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the change will take effect at the start of your next billing cycle.",
  },
  {
    id: "p2",
    question: "Is there a free trial available?",
    answer: "We offer a 14-day free trial on our Premium plan so you can experience all the features before committing. No credit card required to start your trial.",
  },
  {
    id: "p3",
    question: "What happens if I exceed my consultation limit?",
    answer: "On the Basic plan, additional consultations beyond your monthly limit are available at a discounted rate of $20 per session. Premium and Enterprise plans include unlimited consultations.",
  },
  {
    id: "p4",
    question: "Can I add family members to my plan?",
    answer: "The Premium plan covers up to 3 family members, while the Enterprise plan offers unlimited family coverage. Basic plan is for individual use only, but you can upgrade anytime.",
  },
  {
    id: "p5",
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee on all plans. If you're not satisfied with our service within the first 30 days, we'll provide a full refund, no questions asked.",
  },
  {
    id: "p6",
    question: "Are the annual plans auto-renewed?",
    answer: "Yes, annual plans auto-renew at the end of the subscription period. You'll receive a reminder email 7 days before renewal, and you can cancel anytime before the renewal date.",
  },
];

export const doctorReviews: Record<string, Review[]> = {};

// ============ SHOP / PHARMACY ============

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  fullDescription: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  prescriptionRequired: boolean;
  benefits: string[];
  ingredients?: string;
  howToUse?: string;
  sideEffects?: string;
  color: string;
}

export interface ProductReview {
  name: string;
  rating: number;
  date: string;
  text: string;
}

export const productCategories = [
  "Medicines",
  "Supplements",
  "Personal Care",
  "Medical Devices",
  "Baby Care",
  "Wellness",
];

export const products: Product[] = [];

export const productReviews: Record<string, ProductReview[]> = {};

// ============ FAQ PAGE DATA ============

export const faqPageData: FAQPageItem[] = [
  // General
  { id: "g1", category: "General", question: "What is OduDoc?", answer: "OduDoc is a comprehensive healthcare platform that connects patients with verified doctors for online and in-person consultations, lab test bookings, and health management tools." },
  { id: "g2", category: "General", question: "Is OduDoc available in my city?", answer: "OduDoc is currently available across major cities in the United States including New York, Chicago, Los Angeles, San Francisco, Houston, Boston, and Dallas. We are expanding rapidly to new locations." },
  { id: "g3", category: "General", question: "Are all doctors on OduDoc verified?", answer: "Yes, every doctor on OduDoc undergoes a rigorous verification process. We verify medical registration, qualifications, experience, and standing with medical boards before listing them." },
  { id: "g4", category: "General", question: "How do I create an account?", answer: "Simply click the Sign Up button on the top right corner, enter your name, email, and create a password. You can also sign up using your Google account for a quicker process." },
  { id: "g5", category: "General", question: "Is there a mobile app available?", answer: "Yes, OduDoc is available on both iOS (App Store) and Android (Google Play). The app offers the same features as the web platform with the added convenience of push notifications." },
  { id: "g6", category: "General", question: "What are your customer support hours?", answer: "Our customer support team is available Monday through Saturday, 8 AM to 10 PM. For emergencies, our 24/7 helpline +1 (302) 899-2625 is always available." },
  { id: "g7", category: "General", question: "How do I provide feedback about a doctor?", answer: "After each consultation, you will receive a prompt to rate and review your experience. You can also visit the Testimonials page to share detailed feedback." },
  { id: "g8", category: "General", question: "Is my personal information safe with OduDoc?", answer: "Absolutely. We are HIPAA compliant and use industry-standard encryption to protect all personal and health data. We never share your information with third parties without consent." },

  // Appointments
  { id: "a1", category: "Appointments", question: "How do I book an appointment?", answer: "Browse our list of doctors, select one that matches your needs, choose a convenient time slot from their availability, and confirm your booking. You will receive an email and SMS confirmation." },
  { id: "a2", category: "Appointments", question: "Can I reschedule an appointment?", answer: "Yes, you can reschedule an appointment up to 2 hours before the scheduled time. Go to your Dashboard, find the appointment, and click Reschedule to select a new time." },
  { id: "a3", category: "Appointments", question: "What is the cancellation policy?", answer: "You can cancel an appointment up to 4 hours before the scheduled time for a full refund. Cancellations within 4 hours may be subject to a 25% cancellation fee." },
  { id: "a4", category: "Appointments", question: "Can I book appointments for family members?", answer: "Yes, you can add family members to your profile and book appointments on their behalf. Each family member will have their own health records maintained separately." },
  { id: "a5", category: "Appointments", question: "How far in advance can I book?", answer: "You can book appointments up to 30 days in advance. Same-day appointments are also available with doctors who have open slots." },
  { id: "a6", category: "Appointments", question: "Will I receive appointment reminders?", answer: "Yes, we send reminders via email and SMS 24 hours before and 1 hour before your appointment. You can customize your notification preferences in Settings." },

  // Payments
  { id: "p1", category: "Payments", question: "What payment methods do you accept?", answer: "We accept all major credit and debit cards (Visa, MasterCard, Amex), PayPal, Apple Pay, Google Pay, and select insurance plans." },
  { id: "p2", category: "Payments", question: "Is my payment information secure?", answer: "Yes, all payments are processed through Stripe, a PCI-DSS Level 1 certified payment processor. We never store your full card details on our servers." },
  { id: "p3", category: "Payments", question: "How do refunds work?", answer: "Refunds for eligible cancellations are processed within 3-5 business days to your original payment method. You will receive an email confirmation when the refund is processed." },
  { id: "p4", category: "Payments", question: "Do you accept insurance?", answer: "We partner with several major insurance providers. During checkout, you can enter your insurance details to check if your plan covers the consultation or test." },
  { id: "p5", category: "Payments", question: "Are there any hidden fees?", answer: "No, the price you see is the price you pay. Consultation fees, lab test costs, and any applicable discounts are clearly displayed before you confirm the booking." },
  { id: "p6", category: "Payments", question: "Can I get a receipt for tax purposes?", answer: "Yes, a detailed receipt is automatically generated for every payment. You can download receipts from the Payments section in your Dashboard." },

  // Video Consultations
  { id: "v1", category: "Video Consultations", question: "What do I need for a video consultation?", answer: "You need a device with a camera and microphone (smartphone, tablet, or computer), a stable internet connection, and a quiet private space for the consultation." },
  { id: "v2", category: "Video Consultations", question: "How do I join a video consultation?", answer: "At the scheduled time, log into your OduDoc account and click the Join Consultation button that appears on your Dashboard. You can also join via the link sent to your email." },
  { id: "v3", category: "Video Consultations", question: "What if I face technical issues during the call?", answer: "Our technical support team is available to help. You can also try refreshing the page, switching browsers, or using the mobile app as an alternative. If issues persist, the consultation can be rescheduled at no extra cost." },
  { id: "v4", category: "Video Consultations", question: "Can the doctor prescribe medications via video?", answer: "Yes, doctors can issue digital prescriptions during video consultations. The prescription is legally valid and can be used at any pharmacy. It is also saved in your health records." },
  { id: "v5", category: "Video Consultations", question: "Is the video consultation recorded?", answer: "No, video consultations are not recorded to protect patient privacy. However, the doctor may take clinical notes that are saved to your health record with your consent." },
  { id: "v6", category: "Video Consultations", question: "Can I share documents during the consultation?", answer: "Yes, you can upload and share medical reports, images, and previous prescriptions through the consultation chat panel before or during the video call." },

  // Lab Tests
  { id: "l1", category: "Lab Tests", question: "How does home sample collection work?", answer: "After booking a lab test, a certified phlebotomist visits your home at the scheduled time. They collect the required samples following strict safety protocols and transport them to the lab." },
  { id: "l2", category: "Lab Tests", question: "Do I need to fast before a lab test?", answer: "Some tests require fasting (typically 8-12 hours). Fasting requirements are clearly mentioned on the test description page. We also send you preparation instructions after booking." },
  { id: "l3", category: "Lab Tests", question: "When will I receive my reports?", answer: "Report delivery times vary by test: most blood tests are ready within 12-48 hours, while specialized tests may take 3-5 days. You will receive a notification when reports are ready." },
  { id: "l4", category: "Lab Tests", question: "Are lab test results shared with my doctor?", answer: "If you booked the test through a doctor's recommendation, results are automatically shared with them. Otherwise, you can manually share results with any doctor on the platform." },
  { id: "l5", category: "Lab Tests", question: "What labs are you partnered with?", answer: "We partner with NABL-accredited and CAP-certified laboratories to ensure the highest accuracy and reliability of test results." },
  { id: "l6", category: "Lab Tests", question: "Can I book multiple tests together?", answer: "Yes, you can add multiple tests to your cart and book them together. We also offer bundled health packages at discounted prices for comprehensive health screening." },

  // Account
  { id: "ac1", category: "Account", question: "How do I reset my password?", answer: "Click on Login, then Forgot Password. Enter your registered email address and you will receive a password reset link. The link is valid for 24 hours." },
  { id: "ac2", category: "Account", question: "Can I change my email address?", answer: "Yes, go to Profile Settings and update your email. You will need to verify the new email address by clicking a confirmation link sent to it." },
  { id: "ac3", category: "Account", question: "How do I view my medical records?", answer: "All your consultation summaries, prescriptions, and lab reports are available in the Health Records section of your Dashboard. You can download or share them as needed." },
  { id: "ac4", category: "Account", question: "Can I delete my account?", answer: "Yes, you can request account deletion from Profile Settings. Please note that this action is irreversible and all your data will be permanently removed after a 30-day grace period." },
  { id: "ac5", category: "Account", question: "How do I manage notification preferences?", answer: "Go to Settings in your Dashboard to customize email, SMS, and push notification preferences. You can choose which types of notifications you want to receive." },
  { id: "ac6", category: "Account", question: "Can I have multiple profiles on one account?", answer: "Yes, you can add up to 5 family members under your account. Each member gets their own health profile with separate medical records and appointment history." },
];

// ============ BLOG TYPES ============

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorBio: string;
  authorInitials: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  featured: boolean;
  imageUrl?: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  name: string;
  date: string;
  text: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
}

export const blogCategories = ["All", "Wellness", "Nutrition", "Mental Health", "Fitness", "Medical Tips", "News"];

export const categoryGradients: Record<string, string> = {
  Wellness: "from-teal-400 to-cyan-500",
  Nutrition: "from-green-400 to-emerald-500",
  "Mental Health": "from-indigo-400 to-purple-500",
  Fitness: "from-orange-400 to-red-500",
  "Medical Tips": "from-blue-400 to-cyan-600",
  News: "from-pink-400 to-rose-500",
};

export const blogPosts: BlogPost[] = [];

export const blogComments: BlogComment[] = [];

export const galleryCategories = ["All", "Hospital", "Doctors", "Equipment", "Events", "Patient Stories"];

export const galleryItems: GalleryItem[] = [
  { id: "g1", title: "Main Hospital Building", description: "Our state-of-the-art 500-bed facility equipped with the latest medical technology.", category: "Hospital", color: "from-cyan-500 to-blue-600" },
  { id: "g2", title: "Cardiology Department", description: "Advanced cardiac care unit with 24/7 monitoring and catheterization lab.", category: "Hospital", color: "from-red-400 to-pink-600" },
  { id: "g3", title: "Dr. Sarah Johnson", description: "Leading physician with expertise in internal medicine and preventive care.", category: "Doctors", color: "from-teal-400 to-emerald-600" },
  { id: "g4", title: "Dr. David Brown", description: "Renowned cardiologist with over 22 years of experience.", category: "Doctors", color: "from-blue-400 to-indigo-600" },
  { id: "g5", title: "MRI Suite", description: "3T MRI machine providing high-resolution imaging for accurate diagnosis.", category: "Equipment", color: "from-gray-500 to-slate-700" },
  { id: "g6", title: "Robotic Surgery System", description: "Da Vinci surgical robot enabling minimally invasive procedures.", category: "Equipment", color: "from-violet-400 to-purple-600" },
  { id: "g7", title: "Annual Health Camp 2026", description: "Free health screening event serving over 2,000 community members.", category: "Events", color: "from-amber-400 to-orange-600" },
  { id: "g8", title: "Recovery Story - Maria G.", description: "After knee replacement surgery, Maria returned to her active lifestyle within 3 months.", category: "Patient Stories", color: "from-green-400 to-teal-600" },
  { id: "g9", title: "Pediatric Wing", description: "Child-friendly environment designed to make young patients feel safe.", category: "Hospital", color: "from-yellow-400 to-amber-500" },
  { id: "g10", title: "Emergency Department", description: "24/7 emergency services with rapid response teams.", category: "Hospital", color: "from-rose-500 to-red-600" },
  { id: "g11", title: "Dr. Emily Zhang", description: "Compassionate psychiatrist specializing in anxiety and mood disorders.", category: "Doctors", color: "from-indigo-400 to-violet-600" },
  { id: "g12", title: "Dr. James Wilson", description: "Dedicated pediatrician known for his gentle approach with children.", category: "Doctors", color: "from-emerald-400 to-green-600" },
  { id: "g13", title: "CT Scanner", description: "Latest-generation CT scanner for rapid, detailed imaging.", category: "Equipment", color: "from-slate-400 to-gray-600" },
  { id: "g14", title: "Laboratory", description: "Fully automated pathology lab delivering accurate results fast.", category: "Equipment", color: "from-sky-400 to-blue-600" },
  { id: "g15", title: "Medical Conference 2026", description: "Annual healthcare innovation summit with leading professionals.", category: "Events", color: "from-fuchsia-400 to-pink-600" },
  { id: "g16", title: "Charity Run for Heart Health", description: "Over 5,000 participants raising awareness for cardiovascular health.", category: "Events", color: "from-orange-400 to-red-500" },
  { id: "g17", title: "Recovery Story - John D.", description: "From cardiac surgery to completing his first marathon.", category: "Patient Stories", color: "from-cyan-400 to-blue-500" },
  { id: "g18", title: "Recovery Story - Sarah K.", description: "Overcoming chronic pain with comprehensive orthopedic care.", category: "Patient Stories", color: "from-lime-400 to-green-500" },
  { id: "g19", title: "Pharmacy", description: "In-house pharmacy with comprehensive medication inventory.", category: "Hospital", color: "from-teal-500 to-cyan-600" },
  { id: "g20", title: "Blood Donation Drive", description: "Regular blood donation camps in partnership with the national blood bank.", category: "Events", color: "from-red-500 to-rose-600" },
];

// ============ HERO / HOMEPAGE VARIANT DATA ============

export const heroSliderWords: string[] = ["Health", "Wellness", "Care", "Life"];

export const workingProcessSteps = [
  { number: 1, title: "Make Appointment", description: "Choose your preferred doctor and book an appointment at your convenience." },
  { number: 2, title: "Meet Doctor", description: "Visit the doctor in person or connect online via video consultation." },
  { number: 3, title: "Get Treatment", description: "Receive a personalized treatment plan tailored to your health needs." },
  { number: 4, title: "Recovery", description: "Follow up with your doctor and get back to your healthy, active life." },
];

export const partnerLogos = [
  { name: "MedTech Labs", color: "bg-blue-500" },
  { name: "HealthFirst", color: "bg-teal-500" },
  { name: "BioGenix", color: "bg-purple-500" },
  { name: "CarePlus", color: "bg-green-500" },
  { name: "MedSync", color: "bg-cyan-500" },
  { name: "PharmaCo", color: "bg-indigo-500" },
  { name: "VitalCare", color: "bg-rose-500" },
  { name: "NovaMed", color: "bg-amber-500" },
  { name: "LifeScience", color: "bg-emerald-500" },
  { name: "WellPath", color: "bg-sky-500" },
];

export const coreValues = [
  { title: "Compassion", description: "We treat every patient with empathy, respect, and genuine care for their well-being.", color: "rose" },
  { title: "Excellence", description: "We strive for the highest standards in medical care, technology, and patient outcomes.", color: "blue" },
  { title: "Innovation", description: "We embrace cutting-edge technology and research to advance healthcare solutions.", color: "amber" },
  { title: "Integrity", description: "We uphold honesty and transparency in everything we do, building trust with our patients.", color: "emerald" },
];

// ============ TEAM MEMBERS (extended) ============

export interface TeamMember {
  id: string;
  name: string;
  specialty: string;
  designation: string;
  experience: number;
  imageColor: string;
  initials: string;
  socialLinks: { platform: string; url: string }[];
}

export const teamMembers: TeamMember[] = [
  { id: "tm1", name: "Dr. Sarah Johnson", specialty: "General Physician", designation: "Chief Medical Officer", experience: 14, imageColor: "bg-teal-500", initials: "SJ", socialLinks: [{ platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }] },
  { id: "tm2", name: "Dr. Michael Chen", specialty: "Dermatologist", designation: "Head of Dermatology", experience: 10, imageColor: "bg-blue-500", initials: "MC", socialLinks: [{ platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }] },
  { id: "tm3", name: "Dr. Priya Patel", specialty: "Gynecologist", designation: "Senior Consultant", experience: 18, imageColor: "bg-pink-500", initials: "PP", socialLinks: [{ platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }] },
  { id: "tm4", name: "Dr. James Wilson", specialty: "Pediatrician", designation: "Head of Pediatrics", experience: 12, imageColor: "bg-green-500", initials: "JW", socialLinks: [{ platform: "facebook", url: "#" }, { platform: "linkedin", url: "#" }, { platform: "instagram", url: "#" }] },
  { id: "tm5", name: "Dr. David Brown", specialty: "Cardiologist", designation: "Director of Cardiology", experience: 22, imageColor: "bg-red-500", initials: "DB", socialLinks: [{ platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }] },
  { id: "tm6", name: "Dr. Emily Zhang", specialty: "Psychiatrist", designation: "Mental Health Lead", experience: 8, imageColor: "bg-indigo-500", initials: "EZ", socialLinks: [{ platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }, { platform: "instagram", url: "#" }] },
];

// ============ WHY CHOOSE US FEATURES ============

export interface WhyChooseUsFeature {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export const whyChooseUsFeatures: WhyChooseUsFeature[] = [
  { id: "wcu1", title: "Expert Doctors", description: "Board-certified physicians with extensive experience across all medical specialties.", iconName: "users" },
  { id: "wcu2", title: "24/7 Emergency", description: "Round-the-clock emergency services with rapid response teams ready to help.", iconName: "clock" },
  { id: "wcu3", title: "Modern Equipment", description: "State-of-the-art diagnostic and treatment equipment for precise medical care.", iconName: "beaker" },
  { id: "wcu4", title: "Affordable Prices", description: "Quality healthcare at transparent, competitive prices with flexible payment options.", iconName: "currency" },
];
