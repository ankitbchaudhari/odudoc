import Link from "next/link";
import type { Metadata } from "next";
import { departments, doctors } from "@/lib/data";
import { notFound } from "next/navigation";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return departments.map((dept) => ({ slug: dept.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const dept = departments.find((d) => d.slug === params.slug);
  if (!dept) return { title: "Department Not Found" };
  return {
    title: `${dept.name} Department`,
    description: dept.shortDescription,
  };
}

export default function DepartmentDetailPage({ params }: Props) {
  const dept = departments.find((d) => d.slug === params.slug);
  if (!dept) notFound();

  const relatedDepts = departments.filter((d) =>
    dept.relatedDepartments.includes(d.slug)
  );

  // Map department names to doctor specialties for matching
  const specialtyMap: Record<string, string[]> = {
    cardiology: ["Cardiologist"],
    neurology: ["Neurologist"],
    orthopedics: ["Orthopedist"],
    pediatrics: ["Pediatrician"],
    dermatology: ["Dermatologist"],
    gynecology: ["Gynecologist"],
    dentistry: ["Dentist"],
    psychiatry: ["Psychiatrist"],
    ophthalmology: ["Ophthalmologist"],
    urology: ["Urologist"],
    ent: ["ENT Specialist"],
    gastroenterology: ["Gastroenterologist"],
    pulmonology: ["Pulmonologist"],
    oncology: ["Oncologist"],
  };

  const matchingSpecialties = specialtyMap[dept.slug] || [];
  const deptDoctors = doctors.filter((doc) =>
    matchingSpecialties.some((s) =>
      doc.specialty.toLowerCase().includes(s.toLowerCase())
    )
  );

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/departments" className="hover:text-primary-600 transition-colors">Departments</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{dept.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start md:gap-8">
            <div className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl border-2 text-5xl ${dept.color}`}>
              {dept.icon}
            </div>
            <div>
              <h1 className="mt-4 text-3xl font-extrabold text-gray-900 md:mt-0 md:text-4xl">
                {dept.name}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-gray-500">
                {dept.shortDescription}
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 md:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {dept.doctorCount} Doctors
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                  {dept.services.length} Services
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* About */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">About {dept.name}</h2>
                <p className="mt-4 text-gray-600 leading-relaxed">{dept.fullDescription}</p>
              </div>

              {/* Services */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Services Offered</h2>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dept.services.map((service) => (
                    <div
                      key={service}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <svg className="h-5 w-5 flex-shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctors */}
              {deptDoctors.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Our {dept.name} Doctors</h2>
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {deptDoctors.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/doctors/${doc.id}`}
                        className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                      >
                        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${doc.imageColor}`}>
                          {doc.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {doc.name}
                          </h3>
                          <p className="text-sm text-gray-500">{doc.qualifications}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {doc.rating}
                            </span>
                            <span>{doc.experience} yrs exp</span>
                          </div>
                        </div>
                        <svg className="h-5 w-5 flex-shrink-0 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {deptDoctors.length === 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Our {dept.name} Doctors</h2>
                  <div className="mt-6 rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                    <p className="text-4xl">👨‍⚕️</p>
                    <p className="mt-3 font-semibold text-gray-900">
                      {dept.doctorCount} specialists available
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Browse our full directory to find the right doctor.
                    </p>
                    <Link href="/doctors" className="btn-primary mt-4 inline-block">
                      View All Doctors
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking CTA */}
              <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold">Book an Appointment</h3>
                <p className="mt-2 text-sm text-primary-100">
                  Schedule a consultation with one of our {dept.name.toLowerCase()} specialists today.
                </p>
                <Link
                  href="/consult/book"
                  className="mt-4 block rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-primary-600 transition-colors hover:bg-gray-50"
                >
                  Book Now
                </Link>
                <Link
                  href="/consult"
                  className="mt-2 block rounded-lg border border-white/30 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Video Consultation
                </Link>
              </div>

              {/* Related Departments */}
              {relatedDepts.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900">Related Departments</h3>
                  <div className="mt-4 space-y-3">
                    {relatedDepts.map((rd) => (
                      <Link
                        key={rd.id}
                        href={`/departments/${rd.slug}`}
                        className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                      >
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border text-lg ${rd.color}`}>
                          {rd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                            {rd.name}
                          </p>
                          <p className="text-xs text-gray-500">{rd.doctorCount} Doctors</p>
                        </div>
                        <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Need Help?</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Contact our support team for assistance with appointments or any questions.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    1-800-ODUDOC
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    support@odudoc.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
