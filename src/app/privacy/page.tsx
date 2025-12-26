import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Dover Bin Collection Calendar',
  description: 'Privacy policy for the Dover Bin Collection Calendar service',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <div className="font-semibold">Bin Collection Calendar</div>
                <div className="text-sm text-slate-300">Dover District Council</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-6">Privacy Policy</h1>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
            <p className="text-sm text-slate-500">Last updated: December 2025</p>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Data controller</h2>
              <p>
                This service is operated as an independent personal project. For data protection
                enquiries, please use the contact methods provided at the end of this policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">What data we collect</h2>
              <p>When you subscribe to bin collection reminders, we store:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>UPRN</strong> (Unique Property Reference Number) - identifies your property</li>
                <li><strong>Address</strong> - your street address as returned by Dover Council</li>
                <li><strong>Postcode</strong> - used to look up your address</li>
                <li><strong>Calendar token</strong> - a random ID used to access your calendar</li>
                <li><strong>Collection schedule</strong> - bin types and collection dates for your property</li>
              </ul>
              <p className="mt-3">We do not collect your name, email address, IP address, or any personal identifiers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Lawful basis for processing</h2>
              <p>
                We process your data under <strong>legitimate interests</strong> (UK GDPR Article 6(1)(f)).
                The processing is necessary to provide the calendar subscription service you requested.
                We have assessed that this processing does not override your rights, as:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Only property-related data is collected, not personal identifiers</li>
                <li>The data is already publicly available from the council website</li>
                <li>You have a reasonable expectation that the data will be stored to provide the service</li>
                <li>You can delete your data at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">How we use your data</h2>
              <p>Your data is used solely to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Generate your personalised bin collection calendar</li>
                <li>Refresh collection dates daily to detect bank holiday changes</li>
              </ul>
              <p className="mt-3">We do not share, sell, or transfer your data to any third parties for marketing purposes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Data source</h2>
              <p>
                Collection schedule data is sourced from Dover District Council&apos;s public website at{' '}
                <a href="https://collections.dover.gov.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  collections.dover.gov.uk
                </a>. We do not have access to any non-public council data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Data processors</h2>
              <p>Your data is stored using the following third-party service:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Neon</strong> (neon.tech) - PostgreSQL database hosting, servers located in AWS regions</li>
              </ul>
              <p className="mt-3">
                This processor is bound by appropriate data processing agreements and security measures.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Data retention</h2>
              <p>
                We retain your subscription data for as long as you use the service.
                Subscriptions that have not been accessed for over 2 years may be deleted.
                You can request deletion at any time (see below).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Your rights</h2>
              <p>Under UK GDPR, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Access</strong> - request a copy of your data</li>
                <li><strong>Rectification</strong> - request correction of inaccurate data</li>
                <li><strong>Erasure</strong> - request deletion of your data (&quot;right to be forgotten&quot;)</li>
                <li><strong>Restriction</strong> - request limitation of processing</li>
                <li><strong>Objection</strong> - object to processing based on legitimate interests</li>
                <li><strong>Portability</strong> - receive your data in a machine-readable format</li>
              </ul>
              <p className="mt-3">
                If you are not satisfied with how we handle your data, you have the right to lodge
                a complaint with the Information Commissioner&apos;s Office (ICO) at{' '}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  ico.org.uk
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Delete your data</h2>
              <p>
                To delete your subscription and all associated data, visit your calendar URL and add{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">/delete</code> to the end.
              </p>
              <p className="mt-2">
                For example, if your calendar URL is:<br />
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-xs break-all">
                  https://dover-bins.netlify.app/api/calendar/abc123
                </code>
              </p>
              <p className="mt-2">
                Visit this URL to delete:<br />
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-xs break-all">
                  https://dover-bins.netlify.app/api/calendar/abc123/delete
                </code>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Security</h2>
              <p>
                Your calendar URL contains a random token that acts as a password.
                Only people with this URL can access your calendar.
                Do not share this URL publicly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Cookies and tracking</h2>
              <p>
                This service does not use cookies, analytics, or any form of tracking.
                We do not collect IP addresses or browser information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Contact</h2>
              <p>
                For privacy-related enquiries or to exercise your data rights, please raise an issue
                on the project&apos;s GitHub repository. We aim to respond to all data protection
                requests within 30 days.
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-sm text-slate-500 text-center">
          <Link href="/" className="text-blue-600 hover:underline">
            Back to home
          </Link>
          {' · '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  );
}
