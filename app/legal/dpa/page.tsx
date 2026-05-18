import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Processing Addendum",
  description: "Data Processing Addendum (DPA) for organisations using OduDoc to process personal health data.",
  alternates: { canonical: "/legal/dpa" },
};

export default function DPAPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose prose-slate dark:prose-invert">
      <h1>Data Processing Addendum</h1>
      <p className="lead">
        This Data Processing Addendum (&quot;DPA&quot;) forms part of the Terms of Service between
        Sarjudas Digital Trading and Escrow Services LLC (trading as OduDoc, the &quot;Processor&quot;)
        and the organisation using the Service (the &quot;Controller&quot;). It governs the processing
        of personal data in accordance with the Indian Digital Personal Data Protection Act 2023
        (DPDP) and, where applicable, the EU General Data Protection Regulation (GDPR).
      </p>

      <h2>1. Subject matter and purpose</h2>
      <p>
        The Processor processes personal data on behalf of the Controller solely to provide the
        Service — telemedicine, electronic medical records, billing, pharmacy dispense, lab
        orders, and related healthcare workflows.
      </p>

      <h2>2. Categories of data subjects</h2>
      <ul>
        <li>Patients of the Controller</li>
        <li>Doctors, nurses, and clinical staff employed by the Controller</li>
        <li>Administrative staff (billing, reception, pharmacy, lab) employed by the Controller</li>
        <li>Dependents of patients added under family-account scope</li>
      </ul>

      <h2>3. Categories of personal data</h2>
      <ul>
        <li>Identity data: name, date of birth, gender, government ID</li>
        <li>Contact data: email, phone, address</li>
        <li>Health data: diagnoses, prescriptions, lab results, imaging, vitals, allergies</li>
        <li>Financial data: payment records, insurance claims, wallet balance</li>
        <li>Behavioural data: appointment history, login events, audit log</li>
      </ul>

      <h2>4. Sub-processors</h2>
      <p>
        The Processor uses the following sub-processors. The Controller consents to these and
        will be notified at least 30 days before any addition.
      </p>
      <ul>
        <li><strong>Vercel Inc.</strong> — hosting, edge network</li>
        <li><strong>PostgreSQL hosted provider</strong> — primary data store</li>
        <li><strong>Cashfree Payments</strong> — payment gateway (India)</li>
        <li><strong>Stripe Payments</strong> — payment gateway (international)</li>
        <li><strong>Google LLC</strong> — Gemini AI for clinical assistance, transactional email</li>
        <li><strong>Daily.co</strong> — video consultation infrastructure</li>
        <li><strong>Meta Platforms</strong> — WhatsApp Business API for patient communication</li>
      </ul>

      <h2>5. Security measures</h2>
      <p>
        The Processor maintains the security measures described at{" "}
        <a href="/security">/security</a> — 12 defence layers covering network, authentication,
        encryption at rest, file scanning, audit logging, and break-glass controls.
      </p>

      <h2>6. Data subject rights</h2>
      <p>
        The Processor provides tooling for the Controller to fulfil data-subject requests
        (export, delete, restrict, rectify) within 30 days of receipt. Requests originating
        directly with the Processor are forwarded to the Controller within 5 business days.
      </p>

      <h2>7. Breach notification</h2>
      <p>
        The Processor will notify the Controller of a personal data breach within 72 hours of
        becoming aware, providing the nature of the breach, affected data categories, likely
        consequences, and remediation steps.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Patient health data is stored in the region of the Controller&apos;s primary operation.
        Indian Controllers are pinned to Indian data centres; transfers outside India require
        prior written approval from the Controller.
      </p>

      <h2>9. Termination</h2>
      <p>
        On termination of the Service, the Processor will return or delete all personal data
        within 60 days, except where retention is required by law (audit logs, financial records).
      </p>

      <h2>10. Contact</h2>
      <p>
        Data Protection Officer: <a href="mailto:dpo@odudoc.com">dpo@odudoc.com</a>.<br />
        For executing this DPA, email{" "}
        <a href="mailto:legal@odudoc.com">legal@odudoc.com</a> with your organisation name.
      </p>
    </main>
  );
}
