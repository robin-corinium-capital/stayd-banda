import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — banda",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: 1 March 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-base font-semibold text-gray-900">1. Data Controller</h2>
            <p className="mt-2">
              The data controller for personal data processed through this service is Corinium
              Capital Limited. For data protection queries, contact{" "}
              <a href="mailto:privacy@stayd-tools.com" className="text-brand hover:text-brand-light underline">
                privacy@stayd-tools.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">2. What We Collect</h2>
            <p className="mt-2">We collect and process the following personal data:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Name and email address (provided at registration)</li>
              <li>Uploaded photographs and their embedded EXIF metadata, which may include GPS coordinates, device make and model, and capture timestamps</li>
              <li>IP addresses recorded in server logs</li>
              <li>Authentication data (hashed passwords or Google OAuth tokens)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">3. Why We Collect It</h2>
            <p className="mt-2">We process personal data on the following lawful bases:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Contract performance</strong> &mdash; to provide the service you signed up for,
                including storing photos, generating reports, and managing team access
              </li>
              <li>
                <strong>Legitimate interest</strong> &mdash; to improve the product, maintain security,
                and prevent abuse
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">4. Data Storage</h2>
            <p className="mt-2">All data is stored within the EU/UK:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Photographs</strong> &mdash; Cloudflare R2, European region</li>
              <li><strong>Database</strong> &mdash; Vercel Postgres, Frankfurt (EU)</li>
              <li><strong>Application hosting</strong> &mdash; Vercel, EU region</li>
            </ul>
            <p className="mt-2">
              No data is transferred outside the EU/UK jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">5. Data Retention</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Photos and turnover data</strong> &mdash; retained for 12 months from
                turnover completion. Users are notified by email 30 days before deletion.
                Retention can be extended for ongoing claims.
              </li>
              <li>
                <strong>Account data</strong> &mdash; retained while the account is active.
                Deleted upon account deletion request.
              </li>
              <li>
                <strong>Server logs</strong> &mdash; retained for 30 days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">6. Your Rights (GDPR)</h2>
            <p className="mt-2">
              Under the UK GDPR and Data Protection Act 2018, you have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Access</strong> &mdash; request a copy of your personal data</li>
              <li><strong>Rectification</strong> &mdash; correct inaccurate data</li>
              <li><strong>Erasure</strong> &mdash; delete your account and all associated data (Settings &rarr; Delete account)</li>
              <li><strong>Portability</strong> &mdash; export your data in a machine-readable format (Settings &rarr; Export data)</li>
              <li><strong>Restriction</strong> &mdash; restrict processing of your data</li>
              <li><strong>Objection</strong> &mdash; object to processing based on legitimate interest</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, use the in-app tools or contact{" "}
              <a href="mailto:privacy@stayd-tools.com" className="text-brand hover:text-brand-light underline">
                privacy@stayd-tools.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">7. Third-Party Processors</h2>
            <p className="mt-2">
              We use the following third-party services to operate the platform:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Resend</strong> &mdash; transactional email delivery</li>
              <li><strong>Google</strong> &mdash; OAuth authentication only</li>
              <li><strong>Cloudflare</strong> &mdash; photo storage (R2)</li>
              <li><strong>Vercel</strong> &mdash; application hosting and database</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share personal data with third parties for marketing
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">8. Cookies</h2>
            <p className="mt-2">
              We use a single session cookie (NextAuth JWT) for authentication. We do not use
              tracking cookies, analytics cookies, or any third-party cookies. No cookie consent
              banner is required as we only use strictly necessary cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">9. Children</h2>
            <p className="mt-2">
              The Service is not intended for use by anyone under the age of 18. We do not
              knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">10. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Material changes will be
              notified by email to the address associated with your account. Continued use of
              the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">11. Contact</h2>
            <p className="mt-2">
              Corinium Capital Limited
              <br />
              <a href="mailto:privacy@stayd-tools.com" className="text-brand hover:text-brand-light underline">
                privacy@stayd-tools.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-surface-border pt-6">
          <Link href="/" className="text-sm text-brand hover:text-brand-light">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
