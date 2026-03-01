import Link from "next/link";

export const metadata = {
  title: "Help — banda",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-card bg-surface-card p-8 shadow-sm ring-1 ring-surface-border sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900">How to use banda</h1>
        <p className="mt-2 text-sm text-gray-500">
          A step-by-step guide to documenting turnovers and building evidence packs.
        </p>

        <div className="mt-8 space-y-10 text-sm leading-relaxed text-gray-700">
          {/* Section 1: Getting Started */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Getting Started</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Create a property</h3>
                <p className="mt-1">
                  Go to <strong>Properties</strong> and click <strong>Add property</strong>.
                  Enter the property name, address, number of bedrooms, and type (house, flat, etc.).
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Set up areas</h3>
                <p className="mt-1">
                  Open your property and go to <strong>Manage areas</strong>. Add areas like
                  Kitchen, Bedroom 1, Bathroom, Living Room, Garden. These help organise photos
                  by room. You can drag to reorder them.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Invite your team</h3>
                <p className="mt-1">
                  Go to <strong>Settings &rarr; Manage team &rarr; Create invite</strong>.
                  Send the invite link to your cleaners. They&apos;ll be able to upload photos
                  for assigned properties.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Running a Turnover */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Running a Turnover</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Create a turnover</h3>
                <p className="mt-1">
                  Go to <strong>Turnovers &rarr; New turnover</strong>. Select the property,
                  enter the checkout and check-in dates, and optionally add guest references
                  (e.g. Airbnb booking ID).
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Upload post-checkout photos</h3>
                <p className="mt-1">
                  After the guest leaves, open the turnover and upload photos of the property
                  condition. Select <strong>Post-checkout</strong> as the photo set, choose the
                  area for each photo, and flag any damage you find.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Upload pre-check-in photos</h3>
                <p className="mt-1">
                  After cleaning, upload a second set of photos showing the property is ready.
                  Select <strong>Pre-check-in</strong> as the photo set. This proves the
                  property was cleaned and any damage was pre-existing.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Flag damage</h3>
                <p className="mt-1">
                  When uploading or viewing photos, toggle the <strong>damage flag</strong> on
                  any photo that shows damage. Add a note describing what you see. Flagged
                  photos are highlighted in exports and easy to filter.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Exporting Evidence */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Exporting Evidence</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Download a ZIP</h3>
                <p className="mt-1">
                  On the turnover detail page, click <strong>Download ZIP</strong>. Photos are
                  organised into folders by photo set and area. Use this to keep a local backup
                  or share with your letting agent.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Generate a PDF report</h3>
                <p className="mt-1">
                  Click <strong>Download PDF</strong> on the turnover detail page. The report
                  includes all photos with timestamps, EXIF metadata, and damage flags. This
                  is formatted for Airbnb&apos;s Resolution Centre.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Bulk export</h3>
                <p className="mt-1">
                  On the property detail page, click <strong>Export all turnovers</strong> to
                  download every turnover for that property as a single ZIP file.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Flagged-only export</h3>
                <p className="mt-1">
                  When downloading a ZIP or PDF, tick <strong>Flagged only</strong> to include
                  just the damage-flagged photos. Useful for submitting focused damage claims.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Team Management */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Managing Your Team</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Invite cleaners</h3>
                <p className="mt-1">
                  Go to <strong>Settings &rarr; Manage team</strong> and create an invite.
                  Choose the role (cleaner) and assign specific properties. Send the invite
                  link — it expires after 7 days.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Assign properties</h3>
                <p className="mt-1">
                  Cleaners can only see and upload to properties they&apos;re assigned to.
                  Assign properties when creating the invite, or update assignments later
                  from the property settings.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Remove access</h3>
                <p className="mt-1">
                  To revoke a team member&apos;s access, go to <strong>Settings &rarr;
                  Manage team</strong> and click <strong>Remove</strong> next to their name.
                  Pending invites can also be revoked.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Data & Retention */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Data &amp; Retention</h2>
            <div className="mt-3 space-y-3">
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">12-month retention</h3>
                <p className="mt-1">
                  Photos and turnover data are retained for 12 months from the date the
                  turnover is marked as complete. This aligns with Airbnb&apos;s damage
                  claim window.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Expiry warnings</h3>
                <p className="mt-1">
                  You&apos;ll receive an email 30 days before any turnover data is due for
                  deletion. The email includes links to download the evidence pack or extend
                  retention.
                </p>
              </div>
              <div className="rounded-btn bg-surface p-4">
                <h3 className="font-medium text-gray-900">Extend retention</h3>
                <p className="mt-1">
                  If you have an ongoing claim, you can extend retention from the turnover
                  detail page. Extended turnovers are excluded from automatic deletion.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: FAQ */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Frequently Asked Questions</h2>
            <dl className="mt-3 space-y-4">
              <div>
                <dt className="font-medium text-gray-900">What photo formats are supported?</dt>
                <dd className="mt-1">JPEG, PNG, and HEIC (iPhone). Maximum file size is 20MB per photo. HEIC files are automatically converted to JPEG.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Is my data stored in the UK/EU?</dt>
                <dd className="mt-1">Yes. Photos are stored on Cloudflare R2 (EU region) and database records on Vercel Postgres (Frankfurt, EU). All data stays within EU/UK jurisdiction.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Can I use this on my phone?</dt>
                <dd className="mt-1">Yes. The upload page is optimised for mobile. Open it in your phone&apos;s browser — you can take photos directly or select from your camera roll.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">How do I submit a damage claim?</dt>
                <dd className="mt-1">
                  Generate a PDF report from the turnover detail page and upload it to{" "}
                  <a href="https://www.airbnb.co.uk/resolutions" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-light underline">
                    Airbnb&apos;s Resolution Centre
                  </a>
                  . The report includes timestamped photos with EXIF data as supporting evidence.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">What does EXIF data show?</dt>
                <dd className="mt-1">EXIF metadata is embedded by your camera and includes the date/time the photo was taken, GPS coordinates (if location services are enabled), and device model. This proves when and where the photo was captured.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Is there a cost?</dt>
                <dd className="mt-1">banda is currently free to use.</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-10 border-t border-surface-border pt-6">
          <Link href="/dashboard" className="text-sm text-brand hover:text-brand-light">
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
