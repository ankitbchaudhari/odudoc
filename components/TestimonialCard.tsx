import type { Testimonial } from "@/lib/data";

export default function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="card flex flex-col justify-between">
      {/* Stars */}
      <div>
        <div className="mb-3 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              className={`h-4 w-4 ${i < t.rating ? "text-yellow-400" : "text-gray-200"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-gray-600">&ldquo;{t.text}&rdquo;</p>
      </div>

      {/* Author */}
      <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
          {t.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.name}</p>
          <p className="text-xs text-gray-400">
            {t.location} &middot; {t.doctor}
          </p>
        </div>
      </div>
    </div>
  );
}
