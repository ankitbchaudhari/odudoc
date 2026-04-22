// JSON-LD helpers. Renders <script type="application/ld+json"> which search
// engines parse for rich results (knowledge panel, sitelinks, breadcrumbs).
//
// All helpers return React server components safe to drop into any page.

import React from "react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "OduDoc",
    alternateName: "OduDoc Health",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    sameAs: [
      "https://twitter.com/odudoc",
      "https://www.linkedin.com/company/odudoc",
      "https://www.facebook.com/odudoc",
      "https://www.instagram.com/odudoc",
    ],
    description:
      "Book video consultations with verified doctors, order lab tests, and manage hospitals on OduDoc.",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@odudoc.com",
        availableLanguage: ["English"],
        areaServed: "Worldwide",
      },
    ],
  };
  return <JsonLd data={data} />;
}

export function WebsiteLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OduDoc",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/consult?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return <JsonLd data={data} />;
}

export function BreadcrumbLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
  return <JsonLd data={data} />;
}

export function PhysicianLd(doctor: {
  id: string;
  name: string;
  specialty: string;
  about?: string;
  photoUrl?: string;
  rating?: number;
  reviewCount?: number;
  city?: string;
  country?: string;
  fee?: number | string;
  feeCurrency?: string;
  qualifications?: string;
  experience?: number;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Physician",
    "@id": `${SITE_URL}/doctors/${doctor.id}`,
    name: doctor.name,
    medicalSpecialty: doctor.specialty,
    url: `${SITE_URL}/doctors/${doctor.id}`,
  };
  if (doctor.about) data.description = doctor.about;
  if (doctor.photoUrl) data.image = doctor.photoUrl;
  if (doctor.qualifications) {
    // Encode qualifications as an EducationalOccupationalCredential array.
    data.hasCredential = String(doctor.qualifications)
      .split(/[,;/]/)
      .map((q) => q.trim())
      .filter(Boolean)
      .map((q) => ({
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "degree",
        name: q,
      }));
  }
  if (doctor.city || doctor.country) {
    data.address = {
      "@type": "PostalAddress",
      addressLocality: doctor.city,
      addressCountry: doctor.country,
    };
  }
  if (doctor.rating && doctor.reviewCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: doctor.rating,
      reviewCount: doctor.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  // Offer — only emit when we have a real fee. Google requires price + currency.
  if (doctor.fee !== undefined && doctor.fee !== null && doctor.fee !== "" && Number(doctor.fee) > 0) {
    data.makesOffer = {
      "@type": "Offer",
      name: `Online ${doctor.specialty} consultation`,
      price: String(doctor.fee),
      priceCurrency: doctor.feeCurrency || "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/doctors/${doctor.id}`,
      itemOffered: {
        "@type": "Service",
        name: `Video consultation with ${doctor.name}`,
        serviceType: "Telemedicine",
      },
    };
  }
  return <JsonLd data={data} />;
}

export function BlogPostingLd(post: {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  imageUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE_URL}/blog/${post.slug}`,
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "OduDoc",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    },
    image: post.imageUrl ? [post.imageUrl] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
  };
  return <JsonLd data={data} />;
}

export function ServiceLd(service: {
  name: string;
  description: string;
  url: string;
  provider?: string;
  areaServed?: string;
  serviceType?: string;
  offers?: Array<{ name: string; price: string; priceCurrency: string }>;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    url: service.url.startsWith("http") ? service.url : `${SITE_URL}${service.url}`,
    serviceType: service.serviceType,
    areaServed: service.areaServed || "Worldwide",
    provider: {
      "@type": "MedicalOrganization",
      name: service.provider || "OduDoc",
      url: SITE_URL,
    },
  };
  if (service.offers && service.offers.length) {
    data.offers = service.offers.map((o) => ({
      "@type": "Offer",
      name: o.name,
      price: o.price,
      priceCurrency: o.priceCurrency,
    }));
  }
  return <JsonLd data={data} />;
}

export function ItemListLd({
  name,
  items,
}: {
  name: string;
  items: Array<{ name: string; url: string }>;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
  return <JsonLd data={data} />;
}

export function DefinedTermLd(term: {
  slug: string;
  term: string;
  definition: string;
  keywords?: string[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${SITE_URL}/glossary/${term.slug}`,
    name: term.term,
    description: term.definition,
    url: `${SITE_URL}/glossary/${term.slug}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "OduDoc Medical Glossary",
      url: `${SITE_URL}/glossary`,
    },
    termCode: term.slug,
    ...(term.keywords && term.keywords.length
      ? { alternateName: term.keywords }
      : {}),
  };
  return <JsonLd data={data} />;
}

export function DefinedTermSetLd({
  terms,
}: {
  terms: Array<{ slug: string; term: string; short: string }>;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossary`,
    name: "OduDoc Medical Glossary",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${SITE_URL}/glossary/${t.slug}`,
      name: t.term,
      description: t.short,
      url: `${SITE_URL}/glossary/${t.slug}`,
    })),
  };
  return <JsonLd data={data} />;
}

export function MedicalBusinessLd(biz?: {
  name?: string;
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
  telephone?: string;
  latitude?: number;
  longitude?: number;
}) {
  // Graceful fallback: if no physical address is configured, emit a
  // MedicalOrganization that declares worldwide telemedicine service rather
  // than inventing a fake postal address (which Google penalises).
  if (!biz?.streetAddress) {
    const data = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      "@id": `${SITE_URL}/#medical-organization`,
      name: biz?.name || "OduDoc",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      medicalSpecialty: "Telemedicine",
      areaServed: { "@type": "Place", name: "Worldwide" },
      availableService: {
        "@type": "MedicalTherapy",
        name: "Online video consultation",
      },
    };
    return <JsonLd data={data} />;
  }
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${SITE_URL}/#medical-business`,
    name: biz.name || "OduDoc",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    telephone: biz.telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: biz.streetAddress,
      addressLocality: biz.addressLocality,
      addressRegion: biz.addressRegion,
      postalCode: biz.postalCode,
      addressCountry: biz.addressCountry,
    },
  };
  if (biz.latitude && biz.longitude) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: biz.latitude,
      longitude: biz.longitude,
    };
  }
  return <JsonLd data={data} />;
}

export function FaqLd(faqs: Array<{ q: string; a: string }>) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <JsonLd data={data} />;
}
