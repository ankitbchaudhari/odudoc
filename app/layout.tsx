import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import CookieConsent from "@/components/CookieConsent";
import BackToTop from "@/components/BackToTop";
import AIChatbot from "@/components/AIChatbot";
import LoadingBar from "@/components/LoadingBar";

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
          <CartProvider>
            <LanguageProvider>
              <LoadingBar />
              <ConditionalLayout>{children}</ConditionalLayout>
              <CookieConsent />
              <AIChatbot />
              <BackToTop />
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
