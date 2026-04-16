import HeroSearch from "@/components/HeroSearch";
import AboutWithFeatures from "@/components/about/AboutWithFeatures";
import WhyChooseUs from "@/components/WhyChooseUs";
import TeamGrid from "@/components/team/TeamGrid";
import FunFactBar from "@/components/FunFactBar";
import TestimonialTabs from "@/components/testimonial/TestimonialTabs";
import CtaSection from "@/components/CtaSection";
import BlogCard from "@/components/BlogCard";
import PartnerLogos from "@/components/PartnerLogos";
import Link from "next/link";
import { blogPosts } from "@/lib/data";

export const metadata = {
  title: "Home V5 | OduDoc",
};

export default function HomeV5Page() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-teal-50 pb-20 pt-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            Welcome to OduDoc
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Your Health, <span className="text-primary-600">Our Priority</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Find and book appointments with top doctors, consult online, book lab tests,
            and access quality healthcare from the comfort of your home.
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* About With Features */}
      <AboutWithFeatures />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Team Grid (6 doctors) */}
      <TeamGrid limit={6} />

      {/* Fun Fact Bar */}
      <FunFactBar />

      {/* Testimonial Tabs */}
      <TestimonialTabs />

      {/* CTA Section */}
      <CtaSection />

      {/* Blog Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              Our Blog
            </p>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">Latest Health Articles</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500">
              Expert health insights and tips from our medical professionals.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.slice(0, 3).map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/blog" className="btn-outline">
              View All Articles
            </Link>
          </div>
        </div>
      </section>

      {/* Partner Logos */}
      <PartnerLogos />
    </>
  );
}
