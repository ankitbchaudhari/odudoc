import Link from "next/link";

interface ServiceCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
}

export default function ServiceCard({ icon, title, description, href, color }: ServiceCardProps) {
  return (
    <Link href={href} className="group">
      <div className="card flex flex-col items-center text-center">
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${color} transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
        <h3 className="mb-1 font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
      </div>
    </Link>
  );
}
