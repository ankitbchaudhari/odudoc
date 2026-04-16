import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="bg-gray-50 py-3">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-primary-600">
            Home
          </Link>
          {items.map((item, i) => (
            <span key={item.href} className="flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {i === items.length - 1 ? (
                <span className="font-semibold text-gray-900">{item.label}</span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-primary-600">
                  {item.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
