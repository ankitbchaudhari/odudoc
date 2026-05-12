import Link from "next/link";
import type { Specialty } from "@/lib/data";

export default function SpecialtyCard({ specialty }: { specialty: Specialty }) {
  return (
    <Link href="/doctors" className="group">
      <div className="card flex flex-col items-center py-8 text-center">
        <span className="mb-3 text-4xl transition-transform duration-300 group-hover:scale-125">
          {specialty.icon}
        </span>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100">{specialty.name}</h3>
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{specialty.description}</p>
        <p className="mt-2 text-xs font-medium text-primary-600">
          {specialty.doctorCount.toLocaleString()}+ Doctors
        </p>
      </div>
    </Link>
  );
}
