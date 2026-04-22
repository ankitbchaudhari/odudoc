import type { Metadata } from "next";
import { getPublicDoctorByIdFresh } from "@/lib/public-doctors";
import { PhysicianLd, BreadcrumbLd } from "@/components/StructuredData";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const d = await getPublicDoctorByIdFresh(id);
  if (!d) {
    return { title: "Doctor not found" };
  }
  const title = `${d.name} — ${d.specialty}${d.city ? `, ${d.city}` : ""}`;
  const description =
    d.about ||
    `Book a video consultation with ${d.name}, ${d.specialty}${
      d.experience ? ` with ${d.experience}+ years of experience` : ""
    }${d.city ? ` based in ${d.city}` : ""}.`;
  return {
    title,
    description,
    alternates: { canonical: `/doctors/${d.id}` },
    openGraph: {
      title,
      description,
      url: `/doctors/${d.id}`,
      type: "profile",
      images: d.photoUrl ? [{ url: d.photoUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: d.photoUrl ? [d.photoUrl] : undefined,
    },
  };
}

export default async function DoctorProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await getPublicDoctorByIdFresh(id);
  return (
    <>
      {d && (
        <>
          <PhysicianLd
            id={d.id}
            name={d.name}
            specialty={d.specialty}
            about={d.about}
            photoUrl={d.photoUrl}
            rating={d.rating}
            reviewCount={d.reviewCount}
            city={d.city}
            country={d.country}
            fee={d.fee}
            feeCurrency={(d as { feeCurrency?: string }).feeCurrency || "USD"}
            qualifications={d.qualifications}
            experience={d.experience}
          />
          <BreadcrumbLd
            items={[
              { name: "Home", url: "/" },
              { name: "Doctors", url: "/doctors" },
              { name: d.name, url: `/doctors/${d.id}` },
            ]}
          />
        </>
      )}
      {children}
    </>
  );
}
