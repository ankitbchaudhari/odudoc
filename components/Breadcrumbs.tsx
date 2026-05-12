import Link from "next/link";

// Visible breadcrumb navigation for SEO landing pages. Pair with
// <BreadcrumbLd/> for the structured-data side; this is the on-page UX.
//
// Renders as a compact horizontal trail with the current (last) item as
// plain text — matches Google's breadcrumb guidance for rich results.

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-gray-100 bg-gray-50/60"
    >
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-sm text-gray-500 dark:text-slate-400 sm:px-6 lg:px-8">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.href}-${idx}`} className="flex items-center gap-2">
              {idx > 0 && <span className="text-gray-300">/</span>}
              {isLast ? (
                <span className="font-medium text-gray-900 dark:text-slate-100" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-primary-600"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
