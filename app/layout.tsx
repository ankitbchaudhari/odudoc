import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "OduDoc - Your Health, Our Priority",
    template: "%s | OduDoc",
  },
  description:
    "Find and book appointments with top doctors, consult online via video, book lab tests, and access quality healthcare from the comfort of your home.",
  keywords: ["healthcare", "doctors", "online consultation", "lab tests", "medical", "health"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
