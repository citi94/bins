import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Dover Bin Collection Calendar',
  description: 'Privacy policy for the Dover Bin Collection Calendar service',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center" aria-hidden="true">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <div className="font-semibold">Bin Collection Calendar</div>
                <div className="text-sm text-slate-300">For the Dover District area</div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-6">Privacy Policy</h1>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">What this service does</h2>
              <p>
                This service caches publicly available bin collection data from Dover District Council
                and reformats it as a subscribable calendar. The underlying data is property information
                that is already freely accessible on the{' '}
                <a href="https://collections.dover.gov.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  council&apos;s website
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">What we store</h2>
              <p>
                We cache property data (address, postcode, and collection schedule) to generate calendars.
                This is public information about properties, not personal data about individuals.
              </p>
              <p className="mt-3">
                We do not collect names, email addresses, IP addresses, or any information that
                identifies you personally.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Your calendar URL</h2>
              <p>
                Your calendar URL contains a random token that provides access to the cached property data.
                This token is not linked to you personally — it&apos;s simply a key to access a specific
                property&apos;s collection schedule.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Removing data</h2>
              <p>
                To remove a property&apos;s cached data, visit your calendar URL and add{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">/delete</code> to the end.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Cookies and tracking</h2>
              <p>
                This service does not use cookies, analytics, or tracking of any kind.
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
