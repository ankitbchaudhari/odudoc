"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmergencyBanner from "@/components/EmergencyBanner";
import AnnouncementBar from "@/components/AnnouncementBar";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <AnnouncementBar />
      <EmergencyBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
