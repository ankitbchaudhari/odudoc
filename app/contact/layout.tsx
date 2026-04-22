import type { Metadata } from "next";
import { MedicalBusinessLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Contact OduDoc — Sales, Support & Partnerships",
  description:
    "Reach the OduDoc team for sales, support, partnerships, or press. We respond within one business day.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact OduDoc",
    description: "Sales, support, partnerships, press. We respond within one business day.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  // LocalBusiness schema. When env vars for a physical address are set, we
  // emit a full MedicalBusiness; otherwise we gracefully fall back to a
  // MedicalOrganization that simply declares worldwide telemedicine service —
  // no fabricated postal addresses (which trip Google's spam filters).
  const streetAddress = process.env.NEXT_PUBLIC_OFFICE_STREET;
  const biz = streetAddress
    ? {
        name: "OduDoc",
        streetAddress,
        addressLocality: process.env.NEXT_PUBLIC_OFFICE_CITY,
        addressRegion: process.env.NEXT_PUBLIC_OFFICE_REGION,
        postalCode: process.env.NEXT_PUBLIC_OFFICE_POSTAL,
        addressCountry: process.env.NEXT_PUBLIC_OFFICE_COUNTRY,
        telephone: process.env.NEXT_PUBLIC_OFFICE_PHONE,
      }
    : undefined;
  return (
    <>
      <MedicalBusinessLd {...(biz || {})} />
      {children}
    </>
  );
}
