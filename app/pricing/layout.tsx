import type { Metadata } from "next";
import { pricingPlans } from "@/lib/data";
import { ServiceLd, BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Pricing — Simple, Transparent Plans",
  description:
    "OduDoc pricing for patients, doctors, and hospitals. Start free, scale to Growth and Scale tiers as you grow. No hidden fees.",
  keywords: [
    "OduDoc pricing",
    "hospital software pricing",
    "telemedicine pricing",
    "clinic management cost",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — Simple, Transparent Plans | OduDoc",
    description:
      "Start free, scale to Growth and Scale tiers as you grow. No hidden fees.",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  const offers = pricingPlans.map((p) => ({
    name: p.name,
    price: String(p.monthlyPrice),
    priceCurrency: "USD",
  }));
  return (
    <>
      <ServiceLd
        name="OduDoc Healthcare Plans"
        description="Simple, transparent healthcare plans for individuals and families."
        url="/pricing"
        serviceType="Healthcare membership"
        offers={offers}
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Pricing", url: "/pricing" },
        ]}
      />
      {children}
    </>
  );
}
