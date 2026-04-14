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
  imageColor: string;
  initials: string;
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

export const doctors: Doctor[] = [
  {
    id: "dr-sarah-johnson",
    name: "Dr. Sarah Johnson",
    specialty: "General Physician",
    qualifications: "MBBS, MD (Internal Medicine)",
    experience: 14,
    location: "MedCare Clinic, Downtown",
    city: "New York",
    rating: 4.8,
    reviewCount: 342,
    fee: 40,
    available: true,
    gender: "Female",
    about: "Dr. Sarah Johnson is a highly experienced general physician with over 14 years of practice. She specializes in preventive care, chronic disease management, and comprehensive health assessments. Known for her patient-centric approach, she ensures each patient receives personalized attention.",
    services: ["General Consultation", "Preventive Health Checkup", "Chronic Disease Management", "Diabetes Care", "Hypertension Management", "Thyroid Disorders"],
    timeSlots: ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "2:00 PM", "2:30 PM", "3:00 PM", "4:00 PM"],
    imageColor: "bg-teal-500",
    initials: "SJ",
  },
  {
    id: "dr-michael-chen",
    name: "Dr. Michael Chen",
    specialty: "Dermatologist",
    qualifications: "MBBS, MD (Dermatology), FAAD",
    experience: 10,
    location: "Skin & Glow Clinic, Midtown",
    city: "New York",
    rating: 4.9,
    reviewCount: 518,
    fee: 50,
    available: true,
    gender: "Male",
    about: "Dr. Michael Chen is a board-certified dermatologist with expertise in medical and cosmetic dermatology. With 10 years of experience, he treats everything from common skin conditions to advanced aesthetic procedures.",
    services: ["Acne Treatment", "Skin Allergy", "Hair Loss Treatment", "Cosmetic Dermatology", "Psoriasis Treatment", "Laser Therapy"],
    timeSlots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"],
    imageColor: "bg-blue-500",
    initials: "MC",
  },
  {
    id: "dr-priya-patel",
    name: "Dr. Priya Patel",
    specialty: "Gynecologist",
    qualifications: "MBBS, MS (OB-GYN), DNB",
    experience: 18,
    location: "Women's Health Center, Uptown",
    city: "Chicago",
    rating: 4.7,
    reviewCount: 289,
    fee: 55,
    available: true,
    gender: "Female",
    about: "Dr. Priya Patel is a renowned gynecologist and obstetrician with 18 years of experience. She provides comprehensive women's health care, from routine check-ups to complex gynecological surgeries.",
    services: ["Prenatal Care", "High-Risk Pregnancy", "PCOS Treatment", "Fertility Consultation", "Menopause Management", "Gynecological Surgery"],
    timeSlots: ["9:00 AM", "9:30 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "3:30 PM"],
    imageColor: "bg-pink-500",
    initials: "PP",
  },
  {
    id: "dr-james-wilson",
    name: "Dr. James Wilson",
    specialty: "Pediatrician",
    qualifications: "MBBS, MD (Pediatrics), Fellowship in Neonatology",
    experience: 12,
    location: "Kids Care Hospital, West Side",
    city: "Los Angeles",
    rating: 4.9,
    reviewCount: 456,
    fee: 45,
    available: true,
    gender: "Male",
    about: "Dr. James Wilson is a compassionate pediatrician dedicated to children's health. With 12 years of experience and a fellowship in neonatology, he provides expert care for newborns through adolescents.",
    services: ["Newborn Care", "Vaccination", "Growth Monitoring", "Childhood Infections", "Asthma Management", "Nutritional Counseling"],
    timeSlots: ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "2:00 PM", "2:30 PM", "3:00 PM"],
    imageColor: "bg-green-500",
    initials: "JW",
  },
  {
    id: "dr-anita-sharma",
    name: "Dr. Anita Sharma",
    specialty: "Dentist",
    qualifications: "BDS, MDS (Orthodontics)",
    experience: 9,
    location: "Bright Smile Dental, Central",
    city: "San Francisco",
    rating: 4.6,
    reviewCount: 198,
    fee: 35,
    available: true,
    gender: "Female",
    about: "Dr. Anita Sharma is a skilled dentist specializing in orthodontics and cosmetic dentistry. With 9 years of experience, she combines the latest technology with gentle care to provide the best dental treatments.",
    services: ["Dental Cleaning", "Root Canal", "Orthodontics", "Teeth Whitening", "Dental Implants", "Wisdom Tooth Extraction"],
    timeSlots: ["10:00 AM", "10:30 AM", "11:00 AM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"],
    imageColor: "bg-purple-500",
    initials: "AS",
  },
  {
    id: "dr-robert-kumar",
    name: "Dr. Robert Kumar",
    specialty: "Orthopedist",
    qualifications: "MBBS, MS (Orthopedics), Fellowship in Joint Replacement",
    experience: 20,
    location: "OrthoPlus Hospital, East Side",
    city: "Houston",
    rating: 4.8,
    reviewCount: 367,
    fee: 60,
    available: true,
    gender: "Male",
    about: "Dr. Robert Kumar is a leading orthopedic surgeon with over 20 years of experience. He specializes in joint replacements, sports injuries, and spine surgery, having performed over 5,000 successful surgeries.",
    services: ["Joint Replacement", "Sports Injury Treatment", "Spine Surgery", "Fracture Treatment", "Arthroscopy", "Physical Rehabilitation"],
    timeSlots: ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"],
    imageColor: "bg-orange-500",
    initials: "RK",
  },
  {
    id: "dr-emily-zhang",
    name: "Dr. Emily Zhang",
    specialty: "Psychiatrist",
    qualifications: "MBBS, MD (Psychiatry), DPM",
    experience: 11,
    location: "MindWell Clinic, North Side",
    city: "Boston",
    rating: 4.7,
    reviewCount: 231,
    fee: 65,
    available: true,
    gender: "Female",
    about: "Dr. Emily Zhang is a compassionate psychiatrist with 11 years of experience in treating mental health disorders. She takes a holistic approach combining medication management with therapy techniques.",
    services: ["Depression Treatment", "Anxiety Disorders", "PTSD Therapy", "OCD Treatment", "Bipolar Disorder", "Counseling & Psychotherapy"],
    timeSlots: ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"],
    imageColor: "bg-indigo-500",
    initials: "EZ",
  },
  {
    id: "dr-david-brown",
    name: "Dr. David Brown",
    specialty: "Cardiologist",
    qualifications: "MBBS, MD (Cardiology), DM, FACC",
    experience: 22,
    location: "HeartCare Institute, South Side",
    city: "Dallas",
    rating: 4.9,
    reviewCount: 589,
    fee: 75,
    available: true,
    gender: "Male",
    about: "Dr. David Brown is one of the most respected cardiologists in the country with 22 years of experience. He specializes in interventional cardiology and has pioneered several minimally invasive heart procedures.",
    services: ["Cardiac Consultation", "ECG & Echocardiography", "Angioplasty", "Heart Failure Management", "Cholesterol Management", "Cardiac Rehabilitation"],
    timeSlots: ["9:00 AM", "9:30 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM"],
    imageColor: "bg-red-500",
    initials: "DB",
  },
];

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

export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Jennifer Martinez",
    location: "New York, NY",
    rating: 5,
    text: "OduDoc made it so easy to find a great doctor near me. The online booking saved me from long waiting times. Highly recommend this platform to everyone!",
    doctor: "Dr. Sarah Johnson",
    initials: "JM",
  },
  {
    id: "2",
    name: "Rajesh Gupta",
    location: "Chicago, IL",
    rating: 5,
    text: "The video consultation feature is a lifesaver. I was able to consult with a specialist from the comfort of my home. The doctor was thorough and professional.",
    doctor: "Dr. Michael Chen",
    initials: "RG",
  },
  {
    id: "3",
    name: "Amanda Thompson",
    location: "Los Angeles, CA",
    rating: 4,
    text: "Booked a full body checkup through OduDoc. The sample collection at home was very convenient. Got my reports on time with detailed explanations. Great service!",
    doctor: "Lab Test Package",
    initials: "AT",
  },
  {
    id: "4",
    name: "Kevin O'Brien",
    location: "San Francisco, CA",
    rating: 5,
    text: "As a parent, having quick access to pediatricians through this platform gives me peace of mind. Dr. Wilson is amazing with kids and always available on OduDoc.",
    doctor: "Dr. James Wilson",
    initials: "KO",
  },
  {
    id: "5",
    name: "Sophia Lee",
    location: "Boston, MA",
    rating: 5,
    text: "I've been using OduDoc for my regular dermatology appointments. The platform is user-friendly and the doctors are top-notch. The digital prescriptions are very convenient.",
    doctor: "Dr. Michael Chen",
    initials: "SL",
  },
  {
    id: "6",
    name: "Carlos Rivera",
    location: "Houston, TX",
    rating: 5,
    text: "Had an emergency consultation at midnight and got connected within 10 minutes. The doctor was thorough and prescribed exactly what I needed. Incredible service!",
    doctor: "Dr. Sarah Johnson",
    initials: "CR",
  },
  {
    id: "7",
    name: "Priya Nair",
    location: "Dallas, TX",
    rating: 5,
    text: "The lab test booking was seamless. The phlebotomist came to my home, collected the sample, and I received detailed reports within 24 hours. Very impressive!",
    doctor: "Lab Test Package",
    initials: "PN",
  },
  {
    id: "8",
    name: "Thomas Wright",
    location: "Seattle, WA",
    rating: 4,
    text: "Dr. Brown helped me understand my cardiac condition with great patience. The follow-up system is excellent and I feel very well taken care of.",
    doctor: "Dr. David Brown",
    initials: "TW",
  },
  {
    id: "9",
    name: "Lisa Chang",
    location: "Portland, OR",
    rating: 5,
    text: "I was nervous about my first online therapy session but Dr. Zhang made me feel completely at ease. The video quality was excellent and the session was very productive.",
    doctor: "Dr. Emily Zhang",
    initials: "LC",
  },
  {
    id: "10",
    name: "Ahmed Hassan",
    location: "Miami, FL",
    rating: 5,
    text: "OduDoc transformed how I manage my diabetes. Regular consultations with Dr. Johnson and easy access to lab tests have made a huge difference in my health.",
    doctor: "Dr. Sarah Johnson",
    initials: "AH",
  },
  {
    id: "11",
    name: "Rachel Kim",
    location: "Austin, TX",
    rating: 4,
    text: "My orthodontic treatment with Dr. Sharma has been wonderful. She explains every step clearly and the results are already visible. Highly recommend!",
    doctor: "Dr. Anita Sharma",
    initials: "RK",
  },
  {
    id: "12",
    name: "Michael O'Connor",
    location: "Denver, CO",
    rating: 5,
    text: "After my knee surgery by Dr. Kumar, I recovered faster than expected. His expertise and the rehabilitation guidance through OduDoc were exceptional.",
    doctor: "Dr. Robert Kumar",
    initials: "MO",
  },
  {
    id: "13",
    name: "Sarah Patel",
    location: "Phoenix, AZ",
    rating: 5,
    text: "The prenatal care I received through Dr. Patel was outstanding. She was always available for my concerns and the whole experience was stress-free.",
    doctor: "Dr. Priya Patel",
    initials: "SP",
  },
  {
    id: "14",
    name: "David Washington",
    location: "Atlanta, GA",
    rating: 5,
    text: "Booking appointments is so easy and the reminders are very helpful. The whole platform feels modern and professional. Great work, OduDoc team!",
    doctor: "Dr. James Wilson",
    initials: "DW",
  },
  {
    id: "15",
    name: "Emma Rodriguez",
    location: "San Diego, CA",
    rating: 4,
    text: "The skin treatment plan Dr. Chen created for me worked wonders. My confidence has improved so much. The online follow-ups saved me a lot of travel time.",
    doctor: "Dr. Michael Chen",
    initials: "ER",
  },
  {
    id: "16",
    name: "James Foster",
    location: "Nashville, TN",
    rating: 5,
    text: "I have been using OduDoc for my entire family's healthcare needs. From pediatric checkups to my own cardiology consultations, it has been consistently excellent.",
    doctor: "Dr. David Brown",
    initials: "JF",
  },
  {
    id: "17",
    name: "Olivia Bennett",
    location: "Charlotte, NC",
    rating: 5,
    text: "The convenience of having prescriptions sent directly to my pharmacy is amazing. Combined with thorough video consultations, OduDoc is a game-changer.",
    doctor: "Dr. Sarah Johnson",
    initials: "OB",
  },
];

export const labTests: LabTest[] = [
  {
    id: "full-body-checkup",
    name: "Full Body Checkup",
    description: "Comprehensive health screening including CBC, liver function, kidney function, thyroid profile, lipid profile, blood sugar and more.",
    parameters: 72,
    price: 79,
    originalPrice: 150,
    popular: true,
    turnaround: "24-48 hours",
  },
  {
    id: "diabetes-screening",
    name: "Diabetes Screening",
    description: "Complete diabetes panel including fasting blood sugar, HbA1c, insulin levels, and glucose tolerance test.",
    parameters: 12,
    price: 39,
    originalPrice: 65,
    popular: true,
    turnaround: "12-24 hours",
  },
  {
    id: "thyroid-profile",
    name: "Thyroid Profile",
    description: "Complete thyroid assessment including T3, T4, TSH, and thyroid antibodies for comprehensive thyroid health evaluation.",
    parameters: 8,
    price: 35,
    originalPrice: 55,
    popular: true,
    turnaround: "12-24 hours",
  },
  {
    id: "heart-health",
    name: "Heart Health Package",
    description: "Comprehensive cardiac risk assessment including lipid profile, hs-CRP, homocysteine, and ECG.",
    parameters: 28,
    price: 99,
    originalPrice: 180,
    popular: false,
    turnaround: "24-48 hours",
  },
  {
    id: "vitamin-check",
    name: "Vitamin & Mineral Check",
    description: "Test for essential vitamins including Vitamin D, B12, Iron, Calcium, and other key micronutrients.",
    parameters: 15,
    price: 59,
    originalPrice: 95,
    popular: false,
    turnaround: "24-48 hours",
  },
  {
    id: "womens-health",
    name: "Women's Health Package",
    description: "Comprehensive screening designed for women including hormonal panel, CBC, thyroid, iron studies, and Pap smear.",
    parameters: 38,
    price: 89,
    originalPrice: 160,
    popular: true,
    turnaround: "48-72 hours",
  },
  {
    id: "allergy-panel",
    name: "Allergy Panel",
    description: "Comprehensive allergy testing for common food and environmental allergens including dust, pollen, and pet dander.",
    parameters: 42,
    price: 69,
    originalPrice: 120,
    popular: false,
    turnaround: "3-5 days",
  },
  {
    id: "senior-citizen",
    name: "Senior Citizen Package",
    description: "Age-appropriate health screening including bone density markers, prostate/breast markers, cardiac risk, and organ function tests.",
    parameters: 55,
    price: 109,
    originalPrice: 200,
    popular: false,
    turnaround: "48-72 hours",
  },
];

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
    id: "4",
    question: "How do I get my lab test samples collected?",
    answer: "Once you book a lab test, a certified phlebotomist will visit your home at the scheduled time for sample collection. You'll receive your reports digitally within the specified turnaround time.",
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

export const timetableEntries: TimetableEntry[] = [
  // Monday
  { id: "t1", doctorName: "Dr. David Brown", department: "Cardiology", day: "Monday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "t2", doctorName: "Dr. Sarah Johnson", department: "General Physician", day: "Monday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { id: "t3", doctorName: "Dr. James Wilson", department: "Pediatrics", day: "Monday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "t4", doctorName: "Dr. Emily Zhang", department: "Psychiatry", day: "Monday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "t5", doctorName: "Dr. Michael Chen", department: "Dermatology", day: "Monday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-pink-100 text-pink-700 border-pink-200" },
  // Tuesday
  { id: "t6", doctorName: "Dr. Priya Patel", department: "Gynecology", day: "Tuesday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: "t7", doctorName: "Dr. Robert Kumar", department: "Orthopedics", day: "Tuesday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "t8", doctorName: "Dr. David Brown", department: "Cardiology", day: "Tuesday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "t9", doctorName: "Dr. Anita Sharma", department: "Dentistry", day: "Tuesday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "t10", doctorName: "Dr. Sarah Johnson", department: "General Physician", day: "Tuesday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-teal-100 text-teal-700 border-teal-200" },
  // Wednesday
  { id: "t11", doctorName: "Dr. Michael Chen", department: "Dermatology", day: "Wednesday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "t12", doctorName: "Dr. Emily Zhang", department: "Psychiatry", day: "Wednesday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "t13", doctorName: "Dr. James Wilson", department: "Pediatrics", day: "Wednesday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "t14", doctorName: "Dr. Robert Kumar", department: "Orthopedics", day: "Wednesday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "t15", doctorName: "Dr. Priya Patel", department: "Gynecology", day: "Wednesday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-rose-100 text-rose-700 border-rose-200" },
  // Thursday
  { id: "t16", doctorName: "Dr. David Brown", department: "Cardiology", day: "Thursday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "t17", doctorName: "Dr. Anita Sharma", department: "Dentistry", day: "Thursday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "t18", doctorName: "Dr. Sarah Johnson", department: "General Physician", day: "Thursday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { id: "t19", doctorName: "Dr. Michael Chen", department: "Dermatology", day: "Thursday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "t20", doctorName: "Dr. Emily Zhang", department: "Psychiatry", day: "Thursday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  // Friday
  { id: "t21", doctorName: "Dr. James Wilson", department: "Pediatrics", day: "Friday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "t22", doctorName: "Dr. Priya Patel", department: "Gynecology", day: "Friday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: "t23", doctorName: "Dr. Robert Kumar", department: "Orthopedics", day: "Friday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "t24", doctorName: "Dr. David Brown", department: "Cardiology", day: "Friday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "t25", doctorName: "Dr. Anita Sharma", department: "Dentistry", day: "Friday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-blue-100 text-blue-700 border-blue-200" },
  // Saturday
  { id: "t26", doctorName: "Dr. Sarah Johnson", department: "General Physician", day: "Saturday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { id: "t27", doctorName: "Dr. Michael Chen", department: "Dermatology", day: "Saturday", timeSlot: "morning", time: "8:00 AM - 12:00 PM", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "t28", doctorName: "Dr. James Wilson", department: "Pediatrics", day: "Saturday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "t29", doctorName: "Dr. Emily Zhang", department: "Psychiatry", day: "Saturday", timeSlot: "afternoon", time: "12:00 PM - 4:00 PM", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "t30", doctorName: "Dr. Robert Kumar", department: "Orthopedics", day: "Saturday", timeSlot: "evening", time: "4:00 PM - 8:00 PM", color: "bg-orange-100 text-orange-700 border-orange-200" },
];

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

export const doctorReviews: Record<string, Review[]> = {
  "dr-sarah-johnson": [
    { name: "Mark S.", rating: 5, date: "2 weeks ago", text: "Dr. Johnson was very thorough and patient. She took the time to explain everything clearly." },
    { name: "Lisa R.", rating: 5, date: "1 month ago", text: "Best general physician I've visited. She diagnosed my issue quickly and the treatment worked perfectly." },
    { name: "Tom H.", rating: 4, date: "1 month ago", text: "Very professional and knowledgeable. The wait time was a bit long but the consultation was worth it." },
  ],
  "dr-michael-chen": [
    { name: "Amy W.", rating: 5, date: "1 week ago", text: "Dr. Chen completely transformed my skin. My acne cleared up within a month of his treatment plan." },
    { name: "Daniel K.", rating: 5, date: "3 weeks ago", text: "Excellent dermatologist. Very modern approach and uses latest techniques." },
    { name: "Rachel M.", rating: 5, date: "2 months ago", text: "I'm so happy with my results. Dr. Chen is truly the best in his field." },
  ],
  "dr-priya-patel": [
    { name: "Sandra L.", rating: 5, date: "1 week ago", text: "Dr. Patel made me feel so comfortable. She answered all my questions with patience." },
    { name: "Karen J.", rating: 4, date: "1 month ago", text: "Very experienced doctor. Helped me through my pregnancy with great care." },
  ],
  "dr-james-wilson": [
    { name: "Michelle P.", rating: 5, date: "3 days ago", text: "Dr. Wilson is amazing with kids! My son actually looks forward to his checkups now." },
    { name: "Brian T.", rating: 5, date: "2 weeks ago", text: "The best pediatrician we've ever had. So gentle and thorough." },
    { name: "Nancy G.", rating: 5, date: "1 month ago", text: "Highly recommended for any parent. Dr. Wilson truly cares about his patients." },
  ],
  "dr-anita-sharma": [
    { name: "Chris A.", rating: 5, date: "1 week ago", text: "Best dental experience ever. Painless treatment and great results." },
    { name: "Julie F.", rating: 4, date: "3 weeks ago", text: "Very skilled dentist. My teeth look amazing after the treatment." },
  ],
  "dr-robert-kumar": [
    { name: "Peter M.", rating: 5, date: "2 weeks ago", text: "Dr. Kumar performed my knee replacement and I'm walking pain-free now." },
    { name: "Helen W.", rating: 5, date: "1 month ago", text: "Exceptional orthopedic surgeon. Very skilled and compassionate." },
  ],
  "dr-emily-zhang": [
    { name: "Alex R.", rating: 5, date: "1 week ago", text: "Dr. Zhang helped me through a very difficult time. Her approach is both scientific and compassionate." },
    { name: "Maria G.", rating: 5, date: "3 weeks ago", text: "Life-changing consultations. I feel so much better after working with Dr. Zhang." },
  ],
  "dr-david-brown": [
    { name: "George S.", rating: 5, date: "1 week ago", text: "One of the best cardiologists in the city. Very thorough and explains everything clearly." },
    { name: "Patricia D.", rating: 5, date: "2 weeks ago", text: "Dr. Brown literally saved my life. Forever grateful for his expertise." },
    { name: "William T.", rating: 5, date: "1 month ago", text: "Exceptional care and follow-up. Dr. Brown and his team are top-notch." },
  ],
};

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

export const products: Product[] = [
  {
    id: "paracetamol-500",
    name: "Paracetamol 500mg",
    slug: "paracetamol-500",
    description: "Effective pain reliever and fever reducer for adults.",
    fullDescription: "Paracetamol 500mg tablets are a trusted over-the-counter medication for the relief of mild to moderate pain, including headaches, toothache, muscle pain, and period pain. Also effective for reducing fever. Each tablet contains 500mg of paracetamol as the active ingredient.",
    category: "Medicines",
    price: 4.99,
    originalPrice: 6.99,
    rating: 4.7,
    reviewCount: 234,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Fast-acting pain relief", "Reduces fever effectively", "Gentle on the stomach", "Suitable for adults and children over 12"],
    ingredients: "Active: Paracetamol 500mg. Inactive: Maize starch, potassium sorbate, purified talc, stearic acid, povidone, soluble starch.",
    howToUse: "Adults and children over 12: Take 1-2 tablets every 4-6 hours as needed. Do not exceed 8 tablets in 24 hours. Swallow with water.",
    sideEffects: "Side effects are rare at recommended doses. Allergic reactions (rash, swelling) are uncommon. Seek medical help if you experience any unusual symptoms.",
    color: "from-blue-400 to-blue-600",
  },
  {
    id: "ibuprofen-400",
    name: "Ibuprofen 400mg",
    slug: "ibuprofen-400",
    description: "Anti-inflammatory pain relief for aches and swelling.",
    fullDescription: "Ibuprofen 400mg provides effective relief from pain, inflammation, and fever. It belongs to the NSAID class of medications and is commonly used for headaches, dental pain, menstrual cramps, muscle aches, and arthritis. Each tablet contains 400mg of ibuprofen.",
    category: "Medicines",
    price: 5.49,
    rating: 4.5,
    reviewCount: 189,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Reduces inflammation and swelling", "Effective for muscular pain", "Lowers fever", "Works within 30 minutes"],
    ingredients: "Active: Ibuprofen 400mg. Inactive: Lactose, hypromellose, sodium starch glycollate, magnesium stearate, titanium dioxide.",
    howToUse: "Adults: Take 1 tablet every 6-8 hours with food. Do not exceed 3 tablets in 24 hours. Take with or after food.",
    sideEffects: "May cause stomach upset, nausea, or dizziness. Not recommended for those with stomach ulcers or severe kidney/liver problems. Consult a doctor if symptoms persist.",
    color: "from-green-400 to-green-600",
  },
  {
    id: "amoxicillin-500",
    name: "Amoxicillin 500mg",
    slug: "amoxicillin-500",
    description: "Broad-spectrum antibiotic for bacterial infections.",
    fullDescription: "Amoxicillin 500mg is a prescription antibiotic used to treat a variety of bacterial infections including respiratory tract infections, ear infections, urinary tract infections, and skin infections. It belongs to the penicillin group of antibiotics.",
    category: "Medicines",
    price: 12.99,
    originalPrice: 16.99,
    rating: 4.6,
    reviewCount: 156,
    inStock: true,
    prescriptionRequired: true,
    benefits: ["Broad-spectrum antibiotic coverage", "Effective against common bacterial infections", "Well-absorbed when taken orally", "Available in capsule form for easy dosing"],
    ingredients: "Active: Amoxicillin trihydrate equivalent to 500mg amoxicillin. Inactive: Magnesium stearate, gelatin capsule shell.",
    howToUse: "Take as directed by your physician. Typical dose: 1 capsule every 8 hours for 7-10 days. Complete the full course even if you feel better.",
    sideEffects: "Common: diarrhea, nausea, skin rash. Rare: severe allergic reactions. Tell your doctor if you are allergic to penicillin.",
    color: "from-red-400 to-red-600",
  },
  {
    id: "vitamin-d3-1000",
    name: "Vitamin D3 1000 IU",
    slug: "vitamin-d3-1000",
    description: "Essential vitamin for bone health and immune support.",
    fullDescription: "Vitamin D3 1000 IU supplements help maintain healthy bones, teeth, and immune function. Vitamin D3 (cholecalciferol) is the most bioavailable form of vitamin D, essential for calcium absorption and overall wellness, especially in regions with limited sunlight.",
    category: "Supplements",
    price: 8.99,
    originalPrice: 11.99,
    rating: 4.8,
    reviewCount: 412,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Supports strong bones and teeth", "Boosts immune system function", "Aids calcium absorption", "May improve mood and energy levels"],
    ingredients: "Vitamin D3 (Cholecalciferol) 1000 IU, Olive oil, Gelatin, Glycerin.",
    howToUse: "Take 1 softgel daily with a meal, or as directed by your healthcare provider.",
    sideEffects: "Generally well tolerated. Excessive intake may cause nausea, vomiting, weakness, or kidney problems. Do not exceed recommended dosage.",
    color: "from-yellow-400 to-orange-500",
  },
  {
    id: "omega-3-fish-oil",
    name: "Omega-3 Fish Oil 1000mg",
    slug: "omega-3-fish-oil",
    description: "Premium fish oil for heart and brain health.",
    fullDescription: "Omega-3 Fish Oil 1000mg softgels provide essential EPA and DHA fatty acids sourced from deep-sea fish. These essential fatty acids support cardiovascular health, brain function, joint mobility, and overall wellness. Molecularly distilled for purity.",
    category: "Supplements",
    price: 14.99,
    originalPrice: 19.99,
    rating: 4.6,
    reviewCount: 328,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Supports heart health", "Promotes brain function and memory", "Reduces joint inflammation", "Molecularly distilled for purity"],
    ingredients: "Fish Oil Concentrate 1000mg (EPA 360mg, DHA 240mg), Gelatin, Glycerin, Purified Water, Vitamin E (as antioxidant).",
    howToUse: "Take 1-2 softgels daily with meals, or as directed by your healthcare provider.",
    sideEffects: "May cause fishy aftertaste, burping, or mild digestive discomfort. Take with food to minimize. Consult a doctor if you are on blood thinners.",
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "multivitamin-daily",
    name: "Daily Multivitamin Complex",
    slug: "multivitamin-daily",
    description: "Complete daily multivitamin with essential minerals.",
    fullDescription: "A comprehensive daily multivitamin formula providing essential vitamins and minerals for optimal health. Contains Vitamins A, B-complex, C, D, E, K along with key minerals like Iron, Zinc, Magnesium, and Selenium. Designed to fill nutritional gaps in your diet.",
    category: "Supplements",
    price: 11.99,
    rating: 4.4,
    reviewCount: 267,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Complete daily nutrition support", "Boosts energy and vitality", "Strengthens immune system", "Supports healthy skin, hair, and nails"],
    ingredients: "Vitamin A, B1, B2, B3, B5, B6, B12, C, D3, E, K1, Folic Acid, Biotin, Iron, Zinc, Magnesium, Selenium, Chromium, Manganese.",
    howToUse: "Take 1 tablet daily with breakfast. Do not exceed the recommended dose.",
    sideEffects: "Generally well tolerated. May cause mild nausea if taken on an empty stomach. Iron content may cause dark stools.",
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "protein-powder-chocolate",
    name: "Whey Protein Powder - Chocolate",
    slug: "protein-powder-chocolate",
    description: "Premium whey protein for muscle recovery and growth.",
    fullDescription: "High-quality whey protein isolate with 25g of protein per serving in a delicious chocolate flavor. Ideal for post-workout recovery, muscle building, and meeting daily protein requirements. Low in sugar and fat with fast absorption for maximum results.",
    category: "Supplements",
    price: 34.99,
    originalPrice: 44.99,
    rating: 4.7,
    reviewCount: 198,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["25g protein per serving", "Fast-absorbing whey isolate", "Low sugar and fat", "Supports muscle recovery and growth"],
    ingredients: "Whey Protein Isolate, Cocoa Powder, Natural Flavoring, Sucralose, Soy Lecithin, Digestive Enzyme Blend (Protease, Lactase).",
    howToUse: "Mix 1 scoop (30g) with 200-300ml water or milk. Shake well. Best consumed within 30 minutes post-workout or as a protein supplement between meals.",
    sideEffects: "May cause bloating or digestive discomfort in lactose-sensitive individuals. Contains soy. Not suitable for those with milk protein allergy.",
    color: "from-amber-700 to-amber-900",
  },
  {
    id: "calcium-d3-tablets",
    name: "Calcium + Vitamin D3",
    slug: "calcium-d3-tablets",
    description: "Bone health formula with calcium and vitamin D3.",
    fullDescription: "Each tablet provides 600mg of elemental calcium along with 400 IU of Vitamin D3 for optimal calcium absorption. Essential for maintaining strong bones and teeth, preventing osteoporosis, and supporting muscle and nerve function.",
    category: "Supplements",
    price: 9.99,
    rating: 4.5,
    reviewCount: 175,
    inStock: false,
    prescriptionRequired: false,
    benefits: ["Strengthens bones and teeth", "Prevents osteoporosis", "Enhanced absorption with Vitamin D3", "Supports muscle function"],
    ingredients: "Calcium Carbonate (600mg elemental calcium), Vitamin D3 400 IU, Microcrystalline Cellulose, Croscarmellose Sodium, Magnesium Stearate.",
    howToUse: "Take 1 tablet twice daily with meals, or as directed by your healthcare provider.",
    sideEffects: "May cause constipation, gas, or bloating. Take with plenty of water. High doses may increase risk of kidney stones.",
    color: "from-gray-300 to-gray-500",
  },
  {
    id: "hand-sanitizer-500ml",
    name: "Hand Sanitizer 500ml",
    slug: "hand-sanitizer-500ml",
    description: "70% alcohol-based sanitizer with moisturizing aloe vera.",
    fullDescription: "Hospital-grade hand sanitizer with 70% isopropyl alcohol that kills 99.9% of germs. Enriched with aloe vera and vitamin E to prevent skin drying. Quick-drying, non-sticky formula in a convenient pump bottle for home or office use.",
    category: "Personal Care",
    price: 6.99,
    originalPrice: 9.99,
    rating: 4.3,
    reviewCount: 543,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Kills 99.9% of germs", "Moisturizing aloe vera formula", "Quick-drying and non-sticky", "Convenient pump bottle"],
    ingredients: "Isopropyl Alcohol 70%, Aloe Vera Gel, Vitamin E, Glycerin, Carbomer, Purified Water.",
    howToUse: "Apply a coin-sized amount to palms. Rub hands together covering all surfaces until dry. No water needed.",
    sideEffects: "For external use only. May cause skin irritation in sensitive individuals. Keep away from eyes. Flammable - keep away from fire.",
    color: "from-sky-300 to-sky-500",
  },
  {
    id: "n95-face-masks",
    name: "N95 Face Masks (Pack of 10)",
    slug: "n95-face-masks",
    description: "Medical-grade N95 respirator masks for superior protection.",
    fullDescription: "NIOSH-approved N95 respirator masks providing at least 95% filtration of airborne particles. Features adjustable nose clip for secure fit, soft inner lining for comfort, and multi-layer filtration technology. Individually sealed for hygiene.",
    category: "Personal Care",
    price: 15.99,
    rating: 4.6,
    reviewCount: 321,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["95% filtration efficiency", "Adjustable nose clip", "Comfortable for extended wear", "Individually sealed packaging"],
    ingredients: "Outer layer: Spunbond polypropylene. Filter layer: Melt-blown polypropylene. Inner layer: Soft non-woven fabric. Nose clip: Aluminum.",
    howToUse: "Place mask over nose and mouth. Adjust nose clip for snug fit. Ensure no gaps around edges. Replace after single use or when damp/damaged.",
    sideEffects: "May cause discomfort during prolonged use. Not suitable for children under 2. Remove if breathing becomes difficult.",
    color: "from-white to-gray-300",
  },
  {
    id: "digital-thermometer",
    name: "Digital Thermometer",
    slug: "digital-thermometer",
    description: "Fast and accurate digital thermometer with LCD display.",
    fullDescription: "Clinical-grade digital thermometer with fast 10-second reading and high accuracy (+/- 0.1 degrees Celsius). Features a large LCD display, fever alert beep, flexible tip for comfort, and memory recall of the last reading. Water-resistant and easy to clean.",
    category: "Medical Devices",
    price: 8.49,
    originalPrice: 12.99,
    rating: 4.4,
    reviewCount: 287,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Fast 10-second reading", "High accuracy (+/- 0.1C)", "Flexible comfortable tip", "Fever alert beep"],
    howToUse: "Press the power button. Wait for the ready signal. Place under tongue, in armpit, or rectally. Wait for the beep indicating measurement is complete. Read temperature on LCD display.",
    sideEffects: "No side effects. Clean with alcohol wipe before and after each use. Replace battery when display dims.",
    color: "from-teal-400 to-teal-600",
  },
  {
    id: "bp-monitor-auto",
    name: "Automatic Blood Pressure Monitor",
    slug: "bp-monitor-auto",
    description: "Upper arm BP monitor with irregular heartbeat detection.",
    fullDescription: "Clinically validated automatic blood pressure monitor for upper arm use. Features one-touch operation, irregular heartbeat detection, WHO blood pressure classification indicator, and memory storage for 60 readings (2 users x 30). Large digital display for easy reading.",
    category: "Medical Devices",
    price: 39.99,
    originalPrice: 54.99,
    rating: 4.7,
    reviewCount: 156,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Clinically validated accuracy", "Irregular heartbeat detection", "60-reading memory (2 users)", "WHO classification indicator"],
    howToUse: "Sit quietly for 5 minutes before measuring. Wrap cuff around upper left arm at heart level. Press START button. Remain still during measurement. Record your readings.",
    sideEffects: "Not a substitute for professional medical monitoring. Consult your doctor for blood pressure management. Cuff may cause temporary discomfort.",
    color: "from-indigo-400 to-indigo-600",
  },
  {
    id: "baby-lotion-200ml",
    name: "Gentle Baby Lotion 200ml",
    slug: "baby-lotion-200ml",
    description: "Hypoallergenic moisturizing lotion for delicate baby skin.",
    fullDescription: "Ultra-gentle, hypoallergenic baby lotion formulated for the delicate skin of newborns and infants. Enriched with shea butter, chamomile, and vitamin E to nourish and protect. Dermatologically tested, paraben-free, and fragrance-free for maximum safety.",
    category: "Baby Care",
    price: 7.99,
    rating: 4.8,
    reviewCount: 198,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Hypoallergenic formula", "Paraben and fragrance free", "Dermatologically tested", "24-hour moisturization"],
    ingredients: "Purified Water, Shea Butter, Glycerin, Chamomile Extract, Vitamin E, Sunflower Seed Oil, Cetearyl Alcohol, Dimethicone.",
    howToUse: "Apply generously to baby's skin after bath or as needed. Gently massage until absorbed. Suitable for daily use from birth.",
    sideEffects: "For external use only. Discontinue if rash or irritation occurs. Keep away from eyes.",
    color: "from-pink-300 to-pink-400",
  },
  {
    id: "diaper-cream-100g",
    name: "Zinc Oxide Diaper Cream 100g",
    slug: "diaper-cream-100g",
    description: "Protective barrier cream for diaper rash prevention.",
    fullDescription: "Thick, protective barrier cream with 40% zinc oxide to prevent and treat diaper rash. Creates a moisture barrier to keep baby's skin dry and comfortable. Enriched with aloe vera and calendula for soothing relief. Pediatrician recommended formula.",
    category: "Baby Care",
    price: 6.49,
    originalPrice: 8.99,
    rating: 4.6,
    reviewCount: 145,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["40% zinc oxide protection", "Prevents and treats diaper rash", "Soothing aloe vera and calendula", "Pediatrician recommended"],
    ingredients: "Zinc Oxide 40%, White Petrolatum, Aloe Vera, Calendula Extract, Beeswax, Coconut Oil, Vitamin E.",
    howToUse: "Apply a thick layer to clean, dry skin at each diaper change. Pay special attention to areas prone to rash. Clean and reapply at every change.",
    sideEffects: "For external use only. Avoid contact with eyes. Discontinue if irritation or allergic reaction occurs.",
    color: "from-orange-300 to-orange-400",
  },
  {
    id: "gripe-water-150ml",
    name: "Baby Gripe Water 150ml",
    slug: "gripe-water-150ml",
    description: "Natural relief for baby colic, gas, and hiccups.",
    fullDescription: "All-natural gripe water formulated to gently ease baby's discomfort from colic, gas, hiccups, and teething pain. Made with a blend of ginger, fennel, and chamomile extracts. Alcohol-free, paraben-free, and suitable for babies from 2 weeks old.",
    category: "Baby Care",
    price: 5.99,
    rating: 4.3,
    reviewCount: 167,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Natural herbal ingredients", "Relieves colic and gas", "Alcohol and paraben free", "Safe from 2 weeks old"],
    ingredients: "Purified Water, Vegetable Glycerin, Ginger Extract, Fennel Extract, Chamomile Extract, Sodium Bicarbonate, Citric Acid.",
    howToUse: "Shake well before use. 2-4 weeks: 2.5ml, 1-6 months: 5ml, 6+ months: 10ml. Administer with dropper before or after feeding. Up to 6 times daily.",
    sideEffects: "Generally safe when used as directed. Discontinue if allergic reaction occurs. Consult a pediatrician if symptoms persist.",
    color: "from-lime-300 to-lime-500",
  },
  {
    id: "green-tea-extract",
    name: "Green Tea Extract Capsules",
    slug: "green-tea-extract",
    description: "Antioxidant-rich green tea extract for metabolism support.",
    fullDescription: "Concentrated green tea extract capsules standardized to 50% EGCG for maximum antioxidant potency. Supports healthy metabolism, weight management, and cellular health. Each capsule equivalent to 10 cups of green tea antioxidant power without the caffeine jitters.",
    category: "Wellness",
    price: 13.99,
    originalPrice: 17.99,
    rating: 4.5,
    reviewCount: 203,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["Powerful antioxidant protection", "Supports healthy metabolism", "Standardized 50% EGCG", "Promotes cellular health"],
    ingredients: "Green Tea Leaf Extract (Camellia sinensis) 500mg (standardized to 50% EGCG), Vegetable Cellulose Capsule, Rice Flour.",
    howToUse: "Take 1 capsule twice daily with meals. Do not take on an empty stomach. Best taken in the morning and early afternoon.",
    sideEffects: "Contains natural caffeine. May cause insomnia if taken late in the day. May cause stomach upset on an empty stomach. Not recommended during pregnancy.",
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "probiotics-daily",
    name: "Daily Probiotics 50 Billion CFU",
    slug: "probiotics-daily",
    description: "Advanced probiotic blend for digestive and immune health.",
    fullDescription: "Advanced multi-strain probiotic formula with 50 billion CFU from 12 clinically studied strains. Supports digestive health, immune function, and nutrient absorption. Delayed-release capsules ensure probiotics survive stomach acid and reach the intestines alive.",
    category: "Wellness",
    price: 22.99,
    originalPrice: 29.99,
    rating: 4.7,
    reviewCount: 276,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["50 billion CFU per capsule", "12 clinically studied strains", "Delayed-release technology", "Supports gut-immune connection"],
    ingredients: "Probiotic Blend (Lactobacillus acidophilus, L. rhamnosus, L. plantarum, Bifidobacterium lactis, B. longum, and 7 more strains), Prebiotic FOS, Vegetable Capsule.",
    howToUse: "Take 1 capsule daily, preferably on an empty stomach or 30 minutes before a meal. Refrigerate after opening for maximum potency.",
    sideEffects: "Mild bloating or gas may occur during the first few days as your gut adjusts. These effects typically subside. Consult a doctor if you are immunocompromised.",
    color: "from-violet-400 to-purple-600",
  },
  {
    id: "turmeric-curcumin",
    name: "Turmeric Curcumin with BioPerine",
    slug: "turmeric-curcumin",
    description: "Anti-inflammatory turmeric supplement with enhanced absorption.",
    fullDescription: "Premium turmeric curcumin supplement with 95% standardized curcuminoids and BioPerine (black pepper extract) for 2000% enhanced absorption. Powerful anti-inflammatory and antioxidant properties support joint health, heart health, and overall wellness.",
    category: "Wellness",
    price: 16.99,
    rating: 4.6,
    reviewCount: 189,
    inStock: true,
    prescriptionRequired: false,
    benefits: ["95% standardized curcuminoids", "2000% enhanced absorption with BioPerine", "Natural anti-inflammatory", "Supports joint and heart health"],
    ingredients: "Turmeric Root Extract (95% Curcuminoids) 1500mg, BioPerine (Black Pepper Extract) 15mg, Vegetable Cellulose Capsule, Rice Flour.",
    howToUse: "Take 2 capsules daily with a meal containing healthy fats for best absorption. Can be taken in divided doses.",
    sideEffects: "May cause mild stomach upset. Not recommended for those with gallbladder problems. May interact with blood thinners. Consult a doctor if pregnant.",
    color: "from-amber-400 to-amber-600",
  },
];

export const productReviews: Record<string, ProductReview[]> = {
  "paracetamol-500": [
    { name: "John D.", rating: 5, date: "1 week ago", text: "Works quickly for headaches. Always keep this in my medicine cabinet." },
    { name: "Sarah M.", rating: 5, date: "2 weeks ago", text: "Gentle on my stomach unlike some other painkillers. Very effective." },
    { name: "Mike T.", rating: 4, date: "1 month ago", text: "Good basic pain reliever. Does what it says on the box." },
    { name: "Emily R.", rating: 5, date: "1 month ago", text: "Great value for money. Fast delivery too." },
  ],
  "ibuprofen-400": [
    { name: "Chris P.", rating: 5, date: "3 days ago", text: "Excellent for muscle pain after workouts. Works within 20 minutes." },
    { name: "Laura K.", rating: 4, date: "2 weeks ago", text: "Effective but I need to take it with food to avoid stomach issues." },
    { name: "David H.", rating: 5, date: "1 month ago", text: "My go-to for inflammation and joint pain. Highly recommend." },
  ],
  "amoxicillin-500": [
    { name: "James L.", rating: 5, date: "1 week ago", text: "Cleared my throat infection in 5 days. Doctor prescribed this through OduDoc." },
    { name: "Anna S.", rating: 4, date: "3 weeks ago", text: "Effective antibiotic. Make sure to complete the full course." },
    { name: "Robert W.", rating: 5, date: "1 month ago", text: "Quick delivery of prescription medication. Very convenient service." },
  ],
  "vitamin-d3-1000": [
    { name: "Melissa G.", rating: 5, date: "5 days ago", text: "My vitamin D levels have improved significantly after 3 months of use." },
    { name: "Paul B.", rating: 5, date: "2 weeks ago", text: "Great quality and very affordable. Easy to swallow softgels." },
    { name: "Lisa T.", rating: 4, date: "1 month ago", text: "Good supplement. Noticed improvement in my energy levels." },
    { name: "Kevin N.", rating: 5, date: "2 months ago", text: "Doctor recommended this brand. Very happy with the results." },
  ],
  "omega-3-fish-oil": [
    { name: "Steve R.", rating: 5, date: "1 week ago", text: "No fishy aftertaste! Best omega-3 I have tried so far." },
    { name: "Diana C.", rating: 4, date: "3 weeks ago", text: "Good quality fish oil. My cholesterol numbers have improved." },
    { name: "Mark J.", rating: 5, date: "1 month ago", text: "Great for joint health. Noticeable difference in stiffness." },
  ],
  "multivitamin-daily": [
    { name: "Rachel A.", rating: 4, date: "1 week ago", text: "Good comprehensive multivitamin. I feel more energetic." },
    { name: "Tom S.", rating: 5, date: "2 weeks ago", text: "Great daily supplement. Easy to take, no stomach issues." },
    { name: "Nancy P.", rating: 4, date: "1 month ago", text: "Decent multivitamin for the price. Covers all the basics." },
  ],
  "protein-powder-chocolate": [
    { name: "Alex M.", rating: 5, date: "3 days ago", text: "Amazing taste! Mixes well with both water and milk." },
    { name: "Jason K.", rating: 5, date: "1 week ago", text: "Best protein powder I have used. Great macros and taste." },
    { name: "Ryan T.", rating: 4, date: "3 weeks ago", text: "Good quality protein. Slight clumping with water but fine with milk." },
    { name: "Sam W.", rating: 5, date: "1 month ago", text: "Excellent post-workout recovery. Chocolate flavor is on point." },
  ],
  "calcium-d3-tablets": [
    { name: "Martha H.", rating: 5, date: "2 weeks ago", text: "My doctor recommended this for osteoporosis prevention. Easy to take." },
    { name: "Helen G.", rating: 4, date: "1 month ago", text: "Good calcium supplement. Tablets are a bit large but effective." },
  ],
  "hand-sanitizer-500ml": [
    { name: "Amy L.", rating: 4, date: "1 week ago", text: "Great sanitizer that does not dry out hands. Love the pump bottle." },
    { name: "Brian N.", rating: 5, date: "2 weeks ago", text: "Perfect for the office. Aloe vera makes a real difference." },
    { name: "Carol D.", rating: 4, date: "1 month ago", text: "Good value for the size. Keeps hands clean on the go." },
  ],
  "n95-face-masks": [
    { name: "Peter Y.", rating: 5, date: "4 days ago", text: "Genuine N95 quality. Fits well and breathable for long periods." },
    { name: "Julia R.", rating: 4, date: "2 weeks ago", text: "Good masks. Individually sealed which is convenient." },
    { name: "Frank S.", rating: 5, date: "1 month ago", text: "Excellent filtration. Use these for hospital visits." },
  ],
  "digital-thermometer": [
    { name: "Linda M.", rating: 5, date: "1 week ago", text: "Very fast and accurate readings. Must-have for every household." },
    { name: "George B.", rating: 4, date: "3 weeks ago", text: "Easy to use and read. Flexible tip is a plus for kids." },
    { name: "Susan K.", rating: 5, date: "1 month ago", text: "Reliable thermometer. Battery lasts a long time." },
  ],
  "bp-monitor-auto": [
    { name: "Richard P.", rating: 5, date: "5 days ago", text: "Accurate readings that match my doctor's office readings." },
    { name: "Dorothy W.", rating: 5, date: "2 weeks ago", text: "Easy to use. The memory feature is great for tracking trends." },
    { name: "Charles H.", rating: 4, date: "1 month ago", text: "Good monitor. The cuff fits comfortably and results are consistent." },
  ],
  "baby-lotion-200ml": [
    { name: "Jennifer F.", rating: 5, date: "3 days ago", text: "Perfect for my newborn. No irritation and keeps skin soft all day." },
    { name: "Amanda T.", rating: 5, date: "2 weeks ago", text: "Best baby lotion we have tried. Fragrance-free is important to us." },
    { name: "Katie R.", rating: 5, date: "1 month ago", text: "Dermatologist recommended. Very gentle on baby's delicate skin." },
  ],
  "diaper-cream-100g": [
    { name: "Monica S.", rating: 5, date: "1 week ago", text: "Cleared our baby's diaper rash overnight! Amazing product." },
    { name: "Stephanie L.", rating: 4, date: "3 weeks ago", text: "Thick and protective. A little goes a long way." },
    { name: "Beth A.", rating: 5, date: "1 month ago", text: "Pediatrician recommended. Works better than any other brand we tried." },
  ],
  "gripe-water-150ml": [
    { name: "Ashley M.", rating: 4, date: "1 week ago", text: "Helped with our baby's colic. Natural ingredients give peace of mind." },
    { name: "Nicole P.", rating: 5, date: "2 weeks ago", text: "Lifesaver for a colicky baby! Works within minutes." },
    { name: "Tiffany W.", rating: 4, date: "1 month ago", text: "Good product. Baby does not mind the taste at all." },
  ],
  "green-tea-extract": [
    { name: "Victoria C.", rating: 5, date: "5 days ago", text: "Noticed an improvement in my energy and metabolism. Great supplement." },
    { name: "Nathan R.", rating: 4, date: "2 weeks ago", text: "Good quality extract. Take it in the morning for best results." },
    { name: "Emma J.", rating: 5, date: "1 month ago", text: "Love this product. Antioxidant levels are impressive." },
  ],
  "probiotics-daily": [
    { name: "Hannah B.", rating: 5, date: "3 days ago", text: "My digestion has improved dramatically. No more bloating!" },
    { name: "Oliver M.", rating: 5, date: "1 week ago", text: "High quality probiotic. Noticed improvements within a week." },
    { name: "Sophia L.", rating: 4, date: "3 weeks ago", text: "Good probiotic. Minor bloating for the first two days then great." },
    { name: "Ethan K.", rating: 5, date: "1 month ago", text: "Best probiotic on the market. The delayed-release really works." },
  ],
  "turmeric-curcumin": [
    { name: "Isabella G.", rating: 5, date: "1 week ago", text: "Joint pain has reduced significantly. The BioPerine makes a difference." },
    { name: "William D.", rating: 4, date: "2 weeks ago", text: "Good anti-inflammatory supplement. Take with meals for best results." },
    { name: "Charlotte F.", rating: 5, date: "1 month ago", text: "Excellent quality turmeric supplement. Very effective for inflammation." },
  ],
};

// ============ FAQ PAGE DATA ============

export const faqPageData: FAQPageItem[] = [
  // General
  { id: "g1", category: "General", question: "What is OduDoc?", answer: "OduDoc is a comprehensive healthcare platform that connects patients with verified doctors for online and in-person consultations, lab test bookings, and health management tools." },
  { id: "g2", category: "General", question: "Is OduDoc available in my city?", answer: "OduDoc is currently available across major cities in the United States including New York, Chicago, Los Angeles, San Francisco, Houston, Boston, and Dallas. We are expanding rapidly to new locations." },
  { id: "g3", category: "General", question: "Are all doctors on OduDoc verified?", answer: "Yes, every doctor on OduDoc undergoes a rigorous verification process. We verify medical registration, qualifications, experience, and standing with medical boards before listing them." },
  { id: "g4", category: "General", question: "How do I create an account?", answer: "Simply click the Sign Up button on the top right corner, enter your name, email, and create a password. You can also sign up using your Google account for a quicker process." },
  { id: "g5", category: "General", question: "Is there a mobile app available?", answer: "Yes, OduDoc is available on both iOS (App Store) and Android (Google Play). The app offers the same features as the web platform with the added convenience of push notifications." },
  { id: "g6", category: "General", question: "What are your customer support hours?", answer: "Our customer support team is available Monday through Saturday, 8 AM to 10 PM. For emergencies, our 24/7 helpline 1-800-ODUDOC is always available." },
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

export const blogPosts: BlogPost[] = [
  {
    id: "1", slug: "10-habits-for-a-healthier-heart", title: "10 Daily Habits for a Healthier Heart",
    excerpt: "Heart disease remains the leading cause of death worldwide. Discover ten simple daily habits backed by research that can significantly reduce your cardiovascular risk.",
    content: `<h2>Why Heart Health Matters</h2><p>Cardiovascular disease accounts for nearly one-third of all deaths globally. The good news is that up to 80% of premature heart disease is preventable through lifestyle changes.</p><h2>1. Start Your Day with Movement</h2><p>Morning exercise, even just a brisk 20-minute walk, kickstarts your metabolism and gets your blood flowing. Studies show that people who exercise in the morning are more consistent with their fitness routines.</p><h2>2. Eat a Heart-Healthy Breakfast</h2><p>Swap refined carbohydrates for whole grains, fresh fruits, and healthy fats. Oatmeal topped with berries and walnuts is an excellent choice.</p><blockquote>A study published in the Journal of the American College of Cardiology found that people who skip breakfast have a 87% higher risk of cardiovascular mortality.</blockquote><h2>3. Manage Stress Effectively</h2><p>Chronic stress raises cortisol levels, which can increase blood pressure and cholesterol. Practice mindfulness or meditation for at least 10 minutes daily.</p><h3>Simple Stress-Relief Techniques:</h3><ul><li>Box breathing: inhale for 4 counts, hold for 4, exhale for 4, hold for 4</li><li>Progressive muscle relaxation</li><li>Guided meditation using apps like Calm or Headspace</li><li>Journaling your thoughts and gratitude</li></ul><h2>4. Stay Hydrated</h2><p>Adequate water intake helps your heart pump blood more efficiently. Aim for at least 8 glasses of water daily.</p><h2>5. Prioritize Sleep</h2><p>Poor sleep is linked to higher rates of obesity, high blood pressure, and heart attacks. Adults should aim for 7-9 hours of quality sleep per night.</p><h2>6. Limit Sodium Intake</h2><p>Excess sodium raises blood pressure. The American Heart Association recommends no more than 2,300 mg per day.</p><h2>7. Include Omega-3 Fatty Acids</h2><p>Omega-3s reduce inflammation and lower triglycerides. Include fatty fish like salmon in your diet at least twice a week.</p><h2>8. Monitor Your Numbers</h2><p>Know your blood pressure, cholesterol, and blood sugar levels. Regular check-ups allow you to catch potential problems early.</p><h2>9. Quit Smoking</h2><p>Smoking damages blood vessels and accelerates plaque buildup. Within one year of quitting, your risk drops to about half that of a smoker.</p><h2>10. Nurture Social Connections</h2><p>Loneliness is as harmful to heart health as smoking 15 cigarettes a day. Maintain strong relationships and make time for people who matter.</p><h2>The Bottom Line</h2><p>Heart health is about consistent, small habits that compound over time. Start with one or two and gradually add more.</p>`,
    author: "Dr. David Brown", authorBio: "Dr. David Brown is a board-certified cardiologist with over 22 years of experience in interventional cardiology and preventive heart care.", authorInitials: "DB",
    category: "Wellness", tags: ["Heart Health", "Cardiovascular", "Prevention", "Lifestyle"], date: "2026-04-10", readTime: "8 min read", featured: true,
  },
  {
    id: "2", slug: "understanding-gut-health-microbiome", title: "Understanding Gut Health: Your Microbiome Explained",
    excerpt: "Your gut is home to trillions of bacteria that influence everything from digestion to mood. Learn how to nurture your microbiome for better overall health.",
    content: `<h2>The Hidden World Inside You</h2><p>Your gastrointestinal tract houses approximately 100 trillion microorganisms, collectively known as the gut microbiome. This complex ecosystem plays a crucial role in your health.</p><h2>How Your Microbiome Affects Health</h2><p>Research has linked gut health to digestion, immune function, mental health, skin clarity, and weight management.</p><h3>Key Functions of Gut Bacteria:</h3><ul><li>Breaking down complex carbohydrates and fiber</li><li>Producing essential vitamins like B12 and K</li><li>Training and regulating the immune system</li><li>Producing neurotransmitters like serotonin</li><li>Protecting against pathogenic organisms</li></ul><blockquote>Approximately 70% of your immune system resides in your gut, making microbiome health essential for overall immunity.</blockquote><h2>Signs of an Unhealthy Gut</h2><p>Common symptoms include bloating, gas, constipation, diarrhea, food intolerances, fatigue, skin problems, and frequent infections.</p><h2>Foods That Support Your Microbiome</h2><p>A diverse, plant-rich diet is the cornerstone of good gut health. Include fermented foods like yogurt, kefir, sauerkraut, and kimchi. Prebiotic-rich foods like garlic, onions, and bananas feed your beneficial bacteria.</p><h2>When to See a Doctor</h2><p>Persistent digestive issues warrant professional evaluation. A gastroenterologist can rule out conditions like inflammatory bowel disease or celiac disease.</p>`,
    author: "Dr. Sarah Johnson", authorBio: "Dr. Sarah Johnson is a general physician specializing in preventive care with 14 years of experience.", authorInitials: "SJ",
    category: "Nutrition", tags: ["Gut Health", "Microbiome", "Nutrition", "Digestion"], date: "2026-04-08", readTime: "6 min read", featured: false,
  },
  {
    id: "3", slug: "managing-anxiety-in-modern-world", title: "Managing Anxiety in the Modern World: A Practical Guide",
    excerpt: "Anxiety disorders affect over 300 million people worldwide. This guide covers evidence-based strategies to manage anxiety and reclaim your peace of mind.",
    content: `<h2>Understanding Anxiety</h2><p>Anxiety is a normal emotion, but when persistent and overwhelming, it can interfere with daily life. Generalized anxiety disorder, social anxiety, and panic disorder are among the most common mental health conditions.</p><h2>The Science Behind Anxiety</h2><p>When you perceive a threat, your amygdala triggers the fight-or-flight response. In anxiety disorders, this system becomes overactive.</p><h3>Common Symptoms:</h3><ul><li>Persistent worry and restlessness</li><li>Rapid heartbeat and shortness of breath</li><li>Difficulty concentrating</li><li>Sleep disturbances</li><li>Muscle tension and headaches</li><li>Avoidance of triggering situations</li></ul><blockquote>Anxiety disorders are highly treatable, yet only 36.9% of those suffering receive treatment. Early intervention leads to better outcomes.</blockquote><h2>Evidence-Based Strategies</h2><p>Cognitive Behavioral Therapy (CBT) remains the gold standard. CBT helps identify and challenge distorted thought patterns, replacing them with balanced perspectives.</p><h2>Lifestyle Modifications</h2><p>Regular exercise, limiting caffeine and alcohol, consistent sleep, and mindfulness meditation have all shown significant benefits in clinical studies.</p><h2>When to Seek Professional Help</h2><p>If anxiety interferes with your work, relationships, or daily activities, consult a mental health professional.</p>`,
    author: "Dr. Emily Zhang", authorBio: "Dr. Emily Zhang is a psychiatrist with 11 years of experience specializing in anxiety and mood disorders.", authorInitials: "EZ",
    category: "Mental Health", tags: ["Anxiety", "Mental Health", "CBT", "Mindfulness", "Self-Care"], date: "2026-04-05", readTime: "7 min read", featured: false,
  },
  {
    id: "4", slug: "complete-guide-to-strength-training-beginners", title: "The Complete Guide to Strength Training for Beginners",
    excerpt: "This beginner-friendly guide covers everything from proper form to creating your first workout plan, with safety tips from medical professionals.",
    content: `<h2>Why Strength Training Matters</h2><p>Strength training builds muscle, strengthens bones, improves metabolism, and reduces the risk of chronic diseases. At least two sessions per week are recommended for all adults.</p><h2>Getting Started Safely</h2><p>Consult your healthcare provider before beginning. Start with body weight exercises and progress gradually.</p><h3>Essential Beginner Exercises:</h3><ul><li>Squats: builds lower body strength and core stability</li><li>Push-ups: works chest, shoulders, and triceps</li><li>Rows: strengthens back and biceps</li><li>Planks: develops core endurance</li><li>Lunges: improves balance and leg strength</li></ul><blockquote>Muscle mass naturally declines by 3-8% per decade after age 30. Strength training is the most effective way to slow and reverse this process.</blockquote><h2>Creating Your First Program</h2><p>Begin with 2-3 full-body sessions per week. Perform 2-3 sets of 10-15 repetitions for each exercise.</p><h2>Common Mistakes to Avoid</h2><p>Lifting too heavy too soon, neglecting warm-ups, and sacrificing form for heavier weights. Progress gradually and listen to your body.</p>`,
    author: "Dr. Robert Kumar", authorBio: "Dr. Robert Kumar is an orthopedic surgeon with 20 years of experience in sports medicine and injury prevention.", authorInitials: "RK",
    category: "Fitness", tags: ["Strength Training", "Exercise", "Fitness", "Beginners", "Workout"], date: "2026-04-02", readTime: "9 min read", featured: false,
  },
  {
    id: "5", slug: "diabetes-prevention-lifestyle-changes", title: "Type 2 Diabetes Prevention: Lifestyle Changes That Work",
    excerpt: "Type 2 diabetes is largely preventable. Learn about proven lifestyle modifications that can reduce your risk by up to 58%.",
    content: `<h2>The Diabetes Epidemic</h2><p>Over 460 million people worldwide live with diabetes. Type 2 accounts for 90% of cases and is strongly linked to lifestyle factors.</p><h2>Know Your Risk Factors</h2><p>Family history, excess weight, physical inactivity, and age over 45 all increase your risk.</p><h3>Warning Signs:</h3><ul><li>Increased thirst and frequent urination</li><li>Unexplained weight loss</li><li>Fatigue and irritability</li><li>Blurred vision</li><li>Slow-healing cuts and frequent infections</li></ul><blockquote>The Diabetes Prevention Program study showed that lifestyle intervention reduced diabetes risk by 58% -- more effective than medication alone.</blockquote><h2>Dietary Strategies</h2><p>Focus on whole, unprocessed foods. Replace refined grains with whole grains, increase vegetable intake, and limit added sugars.</p><h2>The Role of Exercise</h2><p>Aim for at least 150 minutes of moderate-intensity activity per week. Both aerobic exercise and strength training improve insulin sensitivity.</p><h2>Regular Screening</h2><p>Get your fasting blood glucose and HbA1c tested annually if you have risk factors.</p>`,
    author: "Dr. Sarah Johnson", authorBio: "Dr. Sarah Johnson is a general physician specializing in preventive care and chronic disease management.", authorInitials: "SJ",
    category: "Medical Tips", tags: ["Diabetes", "Prevention", "Blood Sugar", "Diet", "Exercise"], date: "2026-03-28", readTime: "7 min read", featured: false,
  },
  {
    id: "6", slug: "superfoods-you-should-eat-every-week", title: "12 Superfoods You Should Be Eating Every Week",
    excerpt: "Forget expensive supplements -- these twelve nutrient-dense whole foods provide everything your body needs to thrive.",
    content: `<h2>What Makes a Food "Super"?</h2><p>Certain foods are exceptionally rich in vitamins, minerals, antioxidants, and other beneficial compounds that support overall health.</p><h2>The Top 12</h2><h3>1. Blueberries</h3><p>Packed with anthocyanins, they support brain health, reduce inflammation, and may lower blood pressure.</p><h3>2. Salmon</h3><p>Rich in omega-3 fatty acids for heart and brain health.</p><h3>3. Spinach</h3><p>Loaded with iron, calcium, and vitamins A, C, and K.</p><blockquote>Eating just one additional serving of leafy greens per day is associated with a 14% lower risk of type 2 diabetes.</blockquote><ul><li>4. Sweet Potatoes - Rich in beta-carotene and fiber</li><li>5. Walnuts - Plant-based omega-3s</li><li>6. Greek Yogurt - Probiotics and protein</li><li>7. Turmeric - Curcumin anti-inflammatory</li><li>8. Broccoli - Sulforaphane detoxification</li><li>9. Quinoa - Complete protein</li><li>10. Avocados - Healthy monounsaturated fats</li><li>11. Green Tea - Catechins for metabolism</li><li>12. Lentils - Fiber, protein, minerals</li></ul><h2>How to Incorporate Them</h2><p>Include a variety throughout the week. Meal prep on weekends and keep frozen options on hand.</p>`,
    author: "Dr. Priya Patel", authorBio: "Dr. Priya Patel is a gynecologist with a strong interest in nutrition, with 18 years of experience.", authorInitials: "PP",
    category: "Nutrition", tags: ["Superfoods", "Nutrition", "Diet", "Healthy Eating", "Vitamins"], date: "2026-03-25", readTime: "6 min read", featured: false,
  },
  {
    id: "7", slug: "importance-of-sleep-for-health", title: "Why Sleep Is the Most Underrated Health Habit",
    excerpt: "Sleep deprivation affects every system in your body. Discover why prioritizing sleep is the single most impactful change you can make.",
    content: `<h2>The Sleep Crisis</h2><p>One in three adults does not get enough sleep. Sleep deprivation has profound consequences for physical health, mental well-being, and cognitive performance.</p><h2>What Happens When You Sleep</h2><p>Your body repairs tissues, consolidates memories, releases growth hormones, and clears toxic waste from the brain.</p><h3>Health Risks of Poor Sleep:</h3><ul><li>Increased risk of heart disease and stroke</li><li>Impaired immune function</li><li>Weight gain and metabolic disruption</li><li>Higher rates of depression and anxiety</li><li>Reduced cognitive performance</li><li>Accelerated aging</li></ul><blockquote>People who sleep less than 6 hours per night have a 48% greater risk of heart disease.</blockquote><h2>Tips for Better Sleep</h2><p>Maintain a consistent schedule, create a cool and dark environment, avoid screens before bed, limit caffeine after 2 PM, and establish a relaxing bedtime routine.</p><h2>When to Seek Help</h2><p>If you consistently struggle with sleep, consult a healthcare provider. Conditions like sleep apnea and insomnia are treatable.</p>`,
    author: "Dr. Emily Zhang", authorBio: "Dr. Emily Zhang is a psychiatrist specializing in sleep disorders and mental health.", authorInitials: "EZ",
    category: "Wellness", tags: ["Sleep", "Health", "Wellness", "Insomnia", "Rest"], date: "2026-03-20", readTime: "5 min read", featured: false,
  },
  {
    id: "8", slug: "telemedicine-revolution-healthcare", title: "The Telemedicine Revolution: How Virtual Care Is Changing Healthcare",
    excerpt: "Telemedicine has transformed from a niche service to a mainstream healthcare delivery method reshaping patient care.",
    content: `<h2>The Rise of Telemedicine</h2><p>The global telemedicine market is projected to reach $460 billion by 2030, offering unprecedented access to medical expertise regardless of location.</p><h2>Benefits of Virtual Care</h2><p>Telemedicine eliminates geographical barriers, reduces wait times, and offers significant cost savings.</p><h3>Conditions Suited for Telemedicine:</h3><ul><li>Follow-up appointments for chronic conditions</li><li>Mental health counseling and therapy</li><li>Dermatological consultations</li><li>Prescription refills and medication management</li><li>Minor acute illnesses</li><li>Nutritional counseling</li></ul><blockquote>76% of patients rate their telemedicine experience as good or excellent.</blockquote><h2>Technology and Quality</h2><p>Modern platforms offer HD video, secure messaging, digital prescriptions, and EHR integration.</p><h2>The Future</h2><p>The future of healthcare is hybrid, combining virtual convenience with hands-on examination when needed.</p>`,
    author: "Dr. Michael Chen", authorBio: "Dr. Michael Chen is a board-certified dermatologist and digital health advocate with 10 years of experience.", authorInitials: "MC",
    category: "News", tags: ["Telemedicine", "Digital Health", "Virtual Care", "Technology"], date: "2026-03-15", readTime: "6 min read", featured: false,
  },
  {
    id: "9", slug: "childrens-nutrition-guide-parents", title: "A Parent's Guide to Children's Nutrition",
    excerpt: "Good nutrition in childhood sets the foundation for lifelong health. Learn age-appropriate dietary guidelines and how to handle picky eaters.",
    content: `<h2>Nutrition Foundations</h2><p>The first few years of life are critical for establishing eating patterns. Children who develop healthy habits early are less likely to develop chronic diseases later.</p><h2>Age-Appropriate Nutrition</h2><p>Nutritional needs vary by age. Toddlers need more fat for brain development, school-age children need consistent energy, and teenagers require increased calories.</p><h3>Key Nutrients for Growing Children:</h3><ul><li>Calcium and Vitamin D for bone development</li><li>Iron for cognitive development and energy</li><li>Omega-3 fatty acids for brain health</li><li>Fiber for digestive health</li><li>Protein for muscle growth and repair</li></ul><blockquote>Children who eat breakfast regularly perform better academically and exhibit fewer behavioral problems at school.</blockquote><h2>Dealing with Picky Eaters</h2><p>Picky eating is normal, especially ages 2-6. Offer variety without pressure and involve children in meal preparation.</p><h2>Red Flags</h2><p>Consult your pediatrician if your child shows significant weight changes or refuses entire food groups.</p>`,
    author: "Dr. James Wilson", authorBio: "Dr. James Wilson is a pediatrician with 12 years of experience and a fellowship in neonatology.", authorInitials: "JW",
    category: "Nutrition", tags: ["Children", "Nutrition", "Parenting", "Pediatrics"], date: "2026-03-10", readTime: "7 min read", featured: false,
  },
  {
    id: "10", slug: "skin-care-routine-dermatologist-approved", title: "Building a Dermatologist-Approved Skincare Routine",
    excerpt: "Cut through the noise of skincare marketing. A dermatologist breaks down the essential steps for healthy skin and common mistakes to avoid.",
    content: `<h2>Skincare Simplified</h2><p>An effective skincare routine does not need to be complicated or expensive. Consistency with a few key products matters far more than a 12-step routine.</p><h2>The Essential Steps</h2><p>Three non-negotiable steps: cleanser, moisturizer, and sunscreen. Everything else is supplementary.</p><h3>Ingredients That Work:</h3><ul><li>Retinoids: Gold standard for anti-aging and acne</li><li>Vitamin C: Antioxidant protection and brightening</li><li>Niacinamide: Strengthens skin barrier</li><li>Hyaluronic Acid: Hydration for all skin types</li><li>SPF 30+: The most effective anti-aging product</li></ul><blockquote>Up to 90% of visible skin aging is caused by sun exposure. Daily sunscreen use is the most effective anti-aging strategy.</blockquote><h2>Common Mistakes</h2><p>Over-exfoliating, skipping sunscreen, introducing too many products at once, and following unqualified social media advice.</p><h2>When to See a Dermatologist</h2><p>Persistent acne, suspicious moles, unexplained rashes, and chronic skin conditions all warrant professional evaluation.</p>`,
    author: "Dr. Michael Chen", authorBio: "Dr. Michael Chen is a board-certified dermatologist with 10 years of clinical experience.", authorInitials: "MC",
    category: "Medical Tips", tags: ["Skincare", "Dermatology", "Beauty", "Sunscreen", "Anti-Aging"], date: "2026-03-05", readTime: "6 min read", featured: false,
  },
];

export const blogComments: BlogComment[] = [
  { id: "c1", postId: "1", name: "Jennifer M.", date: "2026-04-11", text: "This is such a helpful article! These tips are very practical and easy to follow." },
  { id: "c2", postId: "1", name: "Robert K.", date: "2026-04-11", text: "Great reminder about the importance of sleep for heart health." },
  { id: "c3", postId: "1", name: "Lisa T.", date: "2026-04-10", text: "Thank you Dr. Brown! I shared this with my family and we are implementing these habits together." },
  { id: "c4", postId: "2", name: "Amanda S.", date: "2026-04-09", text: "I had no idea the gut microbiome was so important. Going to start adding more fermented foods!" },
  { id: "c5", postId: "2", name: "Kevin P.", date: "2026-04-08", text: "This explains a lot about my digestive issues. Booking an appointment now." },
  { id: "c6", postId: "3", name: "Sarah L.", date: "2026-04-06", text: "As someone who struggles with anxiety, this article is both validating and helpful." },
  { id: "c7", postId: "3", name: "Mark R.", date: "2026-04-05", text: "Finally an evidence-based article about anxiety. Thank you Dr. Zhang." },
  { id: "c8", postId: "5", name: "Diana W.", date: "2026-03-30", text: "My father was just diagnosed with prediabetes. This gives us a clear action plan." },
];

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
