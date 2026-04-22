export default function AboutSplit() {
  return (
    <section className="relative py-20">
      {/* Split background */}
      <div className="absolute inset-0 flex">
        <div className="w-1/2 bg-primary-50" />
        <div className="w-1/2 bg-white" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Text Column */}
          <div className="lg:col-span-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              About Our Hospital
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">
              A Legacy of Excellence in Healthcare
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-gray-500">
              Our healthcare facility combines decades of medical expertise with modern
              technology to deliver exceptional patient outcomes. From routine checkups
              to complex procedures, we are here for you every step of the way.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <p className="text-3xl font-bold text-primary-600">15+</p>
                <p className="mt-1 text-sm text-gray-500">Years of Experience</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-600">50+</p>
                <p className="mt-1 text-sm text-gray-500">Departments</p>
              </div>
            </div>
          </div>

          {/* Image Column */}
          <div className="relative lg:col-span-5">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-200 to-teal-200">
              <div className="flex h-[380px] items-center justify-center">
                <svg className="h-28 w-28 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
                </svg>
              </div>
            </div>

            {/* Floating Support Card */}
            <div className="absolute -bottom-6 -left-6 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">24/7 Support</p>
                <p className="text-sm text-primary-600">+1 (302) 899-2625</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
