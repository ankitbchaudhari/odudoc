import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab Tests — Book Blood Tests & Health Checkups Online",
  description:
    "Book blood tests, full-body checkups, thyroid, diabetes, liver and more. Home sample collection and digital reports on OduDoc.",
  keywords: [
    "lab tests online",
    "blood test home collection",
    "full body checkup",
    "thyroid test",
    "diabetes test",
    "health checkup package",
  ],
  alternates: { canonical: "/tests" },
  openGraph: {
    title: "Lab Tests — Book Online | OduDoc",
    description:
      "Home sample collection, digital reports. Book blood tests and health checkups.",
    url: "/tests",
    type: "website",
  },
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
