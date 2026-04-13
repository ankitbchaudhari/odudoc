import Link from "next/link";
import type { HealthConcern } from "@/lib/data";

export default function HealthConcernCard({ concern }: { concern: HealthConcern }) {
  return (
    <Link href="/consult" className="group">
      <div className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${concern.color}`}>
        <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
          {concern.icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{concern.title}</h3>
          <p className="text-xs opacity-75">Consult from ${concern.price}</p>
        </div>
      </div>
    </Link>
  );
}
