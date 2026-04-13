const stats = [
  { value: "100K+", label: "Doctors", icon: "🩺" },
  { value: "50K+", label: "Happy Patients", icon: "😊" },
  { value: "24/7", label: "Support", icon: "📞" },
  { value: "200+", label: "Cities", icon: "🏙️" },
];

export default function StatsSection() {
  return (
    <section className="bg-primary-600">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 md:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <span className="mb-2 block text-3xl">{s.icon}</span>
            <p className="text-3xl font-bold text-white md:text-4xl">{s.value}</p>
            <p className="mt-1 text-sm font-medium text-primary-100">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
