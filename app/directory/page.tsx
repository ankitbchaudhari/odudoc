import Link from "next/link";

const specialties = [
  "General Physician", "Dentist", "Dermatologist", "Gynecologist", "Pediatrician",
  "Cardiologist", "Orthopedist", "ENT Specialist", "Neurologist", "Urologist",
  "Ophthalmologist", "Psychiatrist", "Pulmonologist", "Gastroenterologist", "Endocrinologist",
  "Oncologist", "Nephrologist", "Rheumatologist", "Allergist", "Diabetologist",
];

const cities = [
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
  "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
  "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte",
  "Indianapolis", "San Francisco", "Seattle", "Denver", "Nashville",
];

const conditions = [
  "Diabetes", "Hypertension", "Asthma", "Arthritis", "Migraine",
  "Back Pain", "Acne", "Depression", "Anxiety", "Thyroid Disorders",
  "PCOS", "Allergies", "Obesity", "Insomnia", "UTI",
  "Acid Reflux", "Eczema", "Sinusitis", "Anemia", "Kidney Stones",
];

// A globally-recognised mix: US / UK / EU / Asia / Middle East / Africa
// flagships plus India's top chains. Each row carries a location so the
// card renderer below can show the country instead of a blanket label.
const hospitals: { name: string; location: string }[] = [
  // North America
  { name: "Mayo Clinic", location: "Rochester, USA" },
  { name: "Cleveland Clinic", location: "Cleveland, USA" },
  { name: "Johns Hopkins Hospital", location: "Baltimore, USA" },
  { name: "Massachusetts General Hospital", location: "Boston, USA" },
  { name: "NewYork-Presbyterian", location: "New York, USA" },
  { name: "UCLA Medical Center", location: "Los Angeles, USA" },
  { name: "Toronto General Hospital", location: "Toronto, Canada" },
  // United Kingdom & Europe
  { name: "Great Ormond Street Hospital", location: "London, UK" },
  { name: "The Royal Marsden", location: "London, UK" },
  { name: "Guy's and St Thomas'", location: "London, UK" },
  { name: "Charité Berlin", location: "Berlin, Germany" },
  { name: "Karolinska University Hospital", location: "Stockholm, Sweden" },
  { name: "Pitié-Salpêtrière", location: "Paris, France" },
  // Middle East
  { name: "Cleveland Clinic Abu Dhabi", location: "Abu Dhabi, UAE" },
  { name: "Sheikh Khalifa Medical City", location: "Abu Dhabi, UAE" },
  { name: "American Hospital Dubai", location: "Dubai, UAE" },
  // Asia-Pacific
  { name: "Singapore General Hospital", location: "Singapore" },
  { name: "Mount Elizabeth Hospital", location: "Singapore" },
  { name: "Samsung Medical Center", location: "Seoul, South Korea" },
  { name: "Bumrungrad International", location: "Bangkok, Thailand" },
  { name: "The University of Tokyo Hospital", location: "Tokyo, Japan" },
  // Africa
  { name: "Groote Schuur Hospital", location: "Cape Town, South Africa" },
  { name: "Aga Khan University Hospital", location: "Nairobi, Kenya" },
  // India
  { name: "Apollo Hospital", location: "Chennai, India" },
  { name: "Fortis Healthcare", location: "Gurugram, India" },
  { name: "Max Super Specialty", location: "New Delhi, India" },
  { name: "AIIMS Delhi", location: "New Delhi, India" },
  { name: "Medanta Medicity", location: "Gurugram, India" },
  { name: "Narayana Health", location: "Bengaluru, India" },
  { name: "Manipal Hospital", location: "Bengaluru, India" },
  { name: "Kokilaben Hospital", location: "Mumbai, India" },
];

export default function HealthcareDirectoryPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-4xl font-bold">Healthcare Directory</h1>
          <p className="mt-4 text-lg text-primary-100">
            Find doctors, hospitals, and healthcare services near you
          </p>
        </div>
      </section>

      {/* Browse by Specialty */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-slate-100">Browse by Specialty</h2>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <Link
                key={s}
                href={`/doctors?specialty=${encodeURIComponent(s)}`}
                className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by City */}
      <section className="bg-gray-50 dark:bg-slate-900 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-slate-100">Browse by City</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {cities.map((c) => (
              <Link
                key={c}
                href={`/doctors?city=${encodeURIComponent(c)}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                <svg className="h-4 w-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Condition */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-slate-100">Browse by Condition</h2>
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <Link
                key={c}
                href={`/doctors?condition=${encodeURIComponent(c)}`}
                className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top Hospitals */}
      <section className="bg-gray-50 dark:bg-slate-900 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-slate-100">Top Hospitals</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h) => (
              <div key={h.name} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600">
                  {h.name[0]}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{h.name}</h3>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">{h.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-slate-100">Can't find what you're looking for?</h2>
          <p className="mb-6 text-sm text-gray-600 dark:text-slate-300">Our care coordinators can help you find the right doctor.</p>
          <Link href="/contact" className="btn-primary">Contact Us</Link>
        </div>
      </section>
    </div>
  );
}
