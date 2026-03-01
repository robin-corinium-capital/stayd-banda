import Link from "next/link";

export const metadata = {
  title: "Terms of Use - banda",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Use</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: 1 March 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-base font-semibold text-gray-900">1. Service Description</h2>
            <p className="mt-2">
              This tool (&ldquo;the Service&rdquo;) is provided by Corinium Capital Limited
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for the purpose of documenting property
              condition during holiday let turnovers. The Service allows users to upload, store,
              retrieve, and export timestamped photographs and associated metadata.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">2. No Warranties</h2>
            <p className="mt-2">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, whether express or implied. We do not warrant that the
              Service will be uninterrupted, error-free, or free from harmful components. We make
              no guarantees regarding the availability, reliability, or accuracy of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">3. No Support</h2>
            <p className="mt-2">
              The Service is provided without technical support. We may, at our sole discretion,
              provide assistance or updates but are under no obligation to do so.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">4. Data Storage and Residency</h2>
            <p className="mt-2">
              All data uploaded to the Service, including photographs and associated metadata, is
              stored on servers located within the European Economic Area. We use Cloudflare R2
              (European region) for file storage and Vercel Postgres (EU region) for database
              storage.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">5. Data Retention</h2>
            <p className="mt-2">
              Uploaded data is retained for 12 months from the date the associated turnover is
              marked as complete. Users will be notified by email 30 days before scheduled
              deletion. Users may export their data at any time using the built-in download
              functionality. Users may request deletion of their data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">6. Data Protection</h2>
            <p className="mt-2">
              We process personal data in accordance with applicable data protection laws,
              including the UK General Data Protection Regulation (UK GDPR) and the Data Protection
              Act 2018. Personal data collected includes: email address, name, uploaded photographs,
              photograph metadata (including GPS coordinates and device information where available).
            </p>
            <p className="mt-2">
              For full details, see our{" "}
              <Link href="/privacy" className="text-brand hover:text-brand-light underline">
                Privacy Policy
              </Link>.
              The lawful basis for processing is legitimate interest (providing the Service) and
              consent (where applicable). Users have the right to access, rectify, erase, restrict
              processing, and port their data. Contact{" "}
              <a href="mailto:privacy@stayd-tools.com" className="text-brand hover:text-brand-light underline">
                privacy@stayd-tools.com
              </a>{" "}
              for data protection queries.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">7. User Responsibilities</h2>
            <p className="mt-2">
              Users are responsible for ensuring they have the right to upload photographs and that
              uploaded content does not infringe the rights of any third party. Users must not
              upload AI generated or AI enhanced images. The Service is designed to store genuine,
              unmodified photographic evidence.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">8. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, we shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits or
              revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill,
              or other intangible losses resulting from your use of the Service. Our total liability
              for any claim arising from or related to the Service shall not exceed the amount paid
              by you (if any) for access to the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">9. Intellectual Property</h2>
            <p className="mt-2">
              You retain all rights to photographs and content you upload. By uploading content, you
              grant us a limited licence to store, process, and display that content solely for the
              purpose of providing the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">10. Modifications</h2>
            <p className="mt-2">
              We reserve the right to modify or discontinue the Service at any time, with or without
              notice. We will make reasonable efforts to notify users of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">11. Governing Law</h2>
            <p className="mt-2">
              These terms are governed by the laws of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900">12. Contact</h2>
            <p className="mt-2">
              Corinium Capital Limited
              <br />
              <a href="mailto:hello@stayd-tools.com" className="text-brand hover:text-brand-light underline">
                hello@stayd-tools.com
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
