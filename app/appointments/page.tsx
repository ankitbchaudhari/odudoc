import AppointmentForm from "@/components/form/AppointmentForm";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata = {
  title: "Book an Appointment",
  description: "Schedule your appointment with our expert doctors at OduDoc.",
};

export default function AppointmentsPage() {
  return (
    <div className="bg-gray-50">
      <Breadcrumb items={[{ label: "Appointments", href: "/appointments" }]} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold md:text-4xl">Book an Appointment</h1>
          <p className="mt-3 text-lg text-primary-100">
            Schedule a visit with our experienced doctors in just a few steps.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                <AppointmentForm />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Working Hours */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Working Hours
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { day: "Monday - Friday", time: "24 Hours" },
                    { day: "Saturday", time: "24 Hours" },
                    { day: "Sunday", time: "24 Hours" },
                  ].map((item) => (
                    <div key={item.day} className="flex justify-between">
                      <span className="text-gray-600">{item.day}</span>
                      <span className="font-medium text-gray-900">{item.time}</span>
                    </div>
                  ))}
                  <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-center text-xs font-semibold text-green-700">
                    🟢 Available 24/7 — including holidays
                  </p>
                </div>
              </div>

              {/* Emergency */}
              <div className="rounded-2xl bg-red-50 p-6">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-800">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Emergency Contact
                </h3>
                <p className="text-2xl font-bold text-red-700">+1 (800) 911-HELP</p>
                <p className="mt-1 text-sm text-red-600">Available 24/7 for emergencies</p>
              </div>

              {/* Insurance */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Insurance Accepted
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>We accept most major insurance plans including:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>Aetna</li>
                    <li>Blue Cross Blue Shield</li>
                    <li>Cigna</li>
                    <li>UnitedHealthcare</li>
                    <li>Medicare / Medicaid</li>
                  </ul>
                  <p className="mt-3 text-xs text-gray-400">
                    Contact us to verify your coverage before your visit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
