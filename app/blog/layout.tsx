import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OduDoc Blog — Healthcare Insights & Patient Guides",
  description:
    "Expert-written guides on symptoms, treatments, preventive care, and the business of healthcare. Updated weekly.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "OduDoc Blog",
    description: "Healthcare insights, patient guides, and clinic operations know-how.",
    url: "/blog",
    type: "website",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
