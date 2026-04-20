import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | CARSI',
  description: 'Privacy Policy for CARSI Learning Management System',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-white">
      <article className="mx-auto max-w-3xl">
        <header className="mb-12">
          <h1 className="font-mono text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-white/40">Last updated: 22 March 2026</p>
        </header>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="font-mono text-lg font-semibold text-white">1. Overview</h2>
            <p>
              CARSI Pty Ltd (&ldquo;CARSI&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your personal information in
              accordance with the Australian Privacy Principles (APPs) under the Privacy Act 1988
              (Cth).
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              2. Information We Collect
            </h2>
            <h3 className="mt-4 font-mono text-base font-medium text-white/90">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Account information: name, email address, password, IICRC certification number
                (optional)
              </li>
              <li>
                Payment information: processed securely by Stripe (we do not store card details)
              </li>
              <li>Course progress: quiz answers, completion status, certificates earned</li>
              <li>Communications: support requests, feedback, survey responses</li>
            </ul>

            <h3 className="mt-4 font-mono text-base font-medium text-white/90">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>Device information: browser type, operating system, device identifiers</li>
              <li>Usage data: pages visited, time spent on courses, features used</li>
              <li>Log data: IP address, access times, error logs</li>
              <li>Cookies and similar technologies (see Section 7)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              3. How We Use Your Information
            </h2>
            <p>We use your personal information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide and maintain the Service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Track and report IICRC Continuing Education Credits</li>
              <li>
                Show optional, aggregated monthly learning recognition on an in-app board (anonymous
                by default; you may choose an optional public label in your profile — we never
                display your email or account name there)
              </li>
              <li>Send important notifications about your account and courses</li>
              <li>Respond to your enquiries and support requests</li>
              <li>Improve our Service based on usage patterns</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              4. Disclosure of Information
            </h2>
            <p>We may share your personal information with:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white/90">IICRC:</strong> We report CEC completions (name,
                certification number, course completed, date) to IICRC for credit recording
                purposes.
              </li>
              <li>
                <strong className="text-white/90">Service providers:</strong> Payment processors
                (Stripe), hosting providers (Vercel, Fly.io), email services, and analytics tools.
              </li>
              <li>
                <strong className="text-white/90">Legal requirements:</strong> When required by law,
                court order, or government authority.
              </li>
              <li>
                <strong className="text-white/90">Business transfers:</strong> In connection with a
                merger, acquisition, or sale of assets.
              </li>
            </ul>
            <p>We do not sell your personal information to third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">5. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your
              personal information, including:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
            </ul>
            <p>
              No method of transmission over the Internet is 100% secure. While we strive to protect
              your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide you services. We may retain certain information after account closure for:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Compliance with legal obligations (e.g., tax records — 7 years)</li>
              <li>Resolution of disputes</li>
              <li>Enforcement of agreements</li>
              <li>Legitimate business purposes (e.g., fraud prevention)</li>
            </ul>
            <p>
              CEC completion records are retained indefinitely as they form part of your
              professional certification history.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">7. Cookies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Keep you logged in to your account</li>
              <li>Remember your preferences (e.g., theme settings)</li>
              <li>Understand how you use our Service</li>
              <li>Improve performance and functionality</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling cookies may affect
              the functionality of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">8. Your Rights</h2>
            <p>Under Australian privacy law, you have the right to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white/90">Access:</strong> Request a copy of the personal
                information we hold about you.
              </li>
              <li>
                <strong className="text-white/90">Correction:</strong> Request correction of
                inaccurate or incomplete information.
              </li>
              <li>
                <strong className="text-white/90">Deletion:</strong> Request deletion of your
                personal information (subject to legal retention requirements).
              </li>
              <li>
                <strong className="text-white/90">Complaint:</strong> Lodge a complaint with the
                Office of the Australian Information Commissioner (OAIC).
              </li>
            </ul>
            <p>To exercise these rights, contact us at privacy@carsi.com.au.</p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              9. International Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries outside Australia,
              including the United States (for cloud hosting and payment processing). We ensure
              appropriate safeguards are in place to protect your information in accordance with
              this Privacy Policy and applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              10. Children&apos;s Privacy
            </h2>
            <p>
              Our Service is not intended for individuals under 18 years of age. We do not knowingly
              collect personal information from children. If you believe we have collected
              information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting a notice on the Service or by email. Your continued use of the
              Service after changes are posted constitutes acceptance of the updated Policy.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-lg font-semibold text-white">12. Contact Us</h2>
            <p>
              For privacy-related enquiries or to exercise your rights, contact our Privacy Officer:
            </p>
            <address className="mt-2 not-italic">
              <strong className="text-white">CARSI Pty Ltd</strong>
              <br />
              Email: privacy@carsi.com.au
              <br />
              Phone: 1300 434 287
              <br />
              Address: Sydney, NSW, Australia
            </address>
          </section>
        </div>
      </article>
    </main>
  );
}
