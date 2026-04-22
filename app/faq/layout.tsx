import type { Metadata } from "next";
import { faqPageData } from "@/lib/data";
import { FaqLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — OduDoc Help Center",
  description:
    "Answers to common questions about OduDoc: appointments, payments, video consultations, lab tests, and accounts.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "OduDoc FAQ",
    description: "Appointments, payments, video consultations, lab tests, accounts — answered.",
    url: "/faq",
    type: "website",
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  // Google caps FAQPage rich results at a reasonable number — send the top 20.
  // Cherry-pick the highest-intent questions across categories.
  const topFaqs = faqPageData
    .slice(0, 20)
    .map((f) => ({ q: f.question, a: f.answer }));
  return (
    <>
      {FaqLd(topFaqs)}
      {children}
    </>
  );
}
