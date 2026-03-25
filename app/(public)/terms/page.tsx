import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | CARSI',
  description: 'Terms of Service for CARSI Learning Management System',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-white">
      <article className="mx-auto max-w-3xl">
        <header className="mb-12">
          <h1 className="font-mono text-3xl font-bold text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-white/40">Last updated: 22 March 2026</p>
        </header>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="font-mono text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CARSI (&ldquo;the Service&rdquo;), operated by CARSI Pty Ltd
              (ABN to be confirmed), you agree to be bound by these Terms of Service. If you do not
              agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              2. Description of Service
            </h2>
            <p>
              CARSI provides online education and training courses primarily for the restoration and
              cleaning industry. Our courses include IICRC-approved Continuing Education Credit
              (CEC) courses and general professional development content.
            </p>
            <p>
              CARSI is a private company and is not a Registered Training Organisation (RTO). We do
              not issue nationally recognised qualifications under the Australian Qualifications
              Framework (AQF).
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">3. User Accounts</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>You must provide accurate and complete registration information.</li>
              <li>
                You are responsible for maintaining the confidentiality of your account credentials.
              </li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorised use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              4. Subscriptions and Payments
            </h2>
            <p>
              Access to premium content requires a paid subscription. Subscription fees are billed
              in Australian Dollars (AUD) and include GST where applicable.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
              <li>You may cancel your subscription at any time through your account settings.</li>
              <li>Refunds are provided in accordance with Australian Consumer Law.</li>
              <li>We reserve the right to change subscription pricing with 30 days notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              5. IICRC Continuing Education Credits
            </h2>
            <p>
              Certain courses are approved by the Institute of Inspection, Cleaning and Restoration
              Certification (IICRC) for Continuing Education Credits (CECs).
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>CEC eligibility is subject to IICRC approval and may change without notice.</li>
              <li>You must achieve a minimum passing score (typically 80%) to earn CECs.</li>
              <li>CARSI reports CEC completions to IICRC on your behalf.</li>
              <li>It is your responsibility to verify CEC credits appear on your IICRC record.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">6. Intellectual Property</h2>
            <p>
              All content on the Service, including courses, videos, text, graphics, and software,
              is the property of CARSI or its licensors and is protected by Australian and
              international copyright laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, or create derivative works from any content
              without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Share your account credentials with others.</li>
              <li>Download, copy, or redistribute course content.</li>
              <li>Use automated tools to access the Service.</li>
              <li>Attempt to circumvent any security measures.</li>
              <li>Use the Service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, CARSI shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the
              Service.
            </p>
            <p>
              Our total liability for any claim arising from the Service shall not exceed the amount
              you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">9. Governing Law</h2>
            <p>
              These Terms are governed by the laws of New South Wales, Australia. Any disputes shall
              be subject to the exclusive jurisdiction of the courts of New South Wales.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">10. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. We will notify you of material changes by
              posting a notice on the Service or by email. Your continued use of the Service after
              changes are posted constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">11. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <address className="mt-2 not-italic">
              <strong className="text-white">CARSI Pty Ltd</strong>
              <br />
              Email: support@carsi.com.au
              <br />
              Phone: 1300 434 287
            </address>
          </section>
        </div>
      </article>
    </main>
  );
}
