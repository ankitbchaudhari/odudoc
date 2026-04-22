// Auth gate for the doctors directory and individual doctor profile pages.
// Only signed-in members can browse doctor profiles — non-members are
// redirected to the login page with a callbackUrl so they come back here
// after authenticating.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find Doctors — Verified Specialists Near You",
  description:
    "Browse verified doctors by specialty, city and rating. Book video consultations or in-clinic visits on OduDoc.",
  alternates: { canonical: "/doctors" },
  openGraph: {
    title: "Find Doctors — Verified Specialists | OduDoc",
    description: "Browse verified doctors by specialty, city and rating.",
    url: "/doctors",
    type: "website",
  },
};

export default async function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/doctors");
  }
  return <>{children}</>;
}
