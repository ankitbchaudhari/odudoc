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
