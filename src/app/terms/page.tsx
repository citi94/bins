import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Dover Bin Collection Calendar',
  description: 'Terms of service for the Dover Bin Collection Calendar service',
};

export default function TermsOfService() {
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
                <div className="text-sm text-slate-300">For the Dover District area</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-6">Terms of Service</h1>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
            <p className="text-sm text-slate-500">Last updated: December 2025</p>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">1. Service description</h2>
              <p>
                This service provides calendar subscriptions for bin collection dates in the Dover District Council area.
                The service reformats publicly available information from Dover District Council&apos;s website
                into a subscribable calendar format.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">2. Independent service</h2>
              <p>
                This is an independent, unofficial service. It is not affiliated with, endorsed by,
                or authorised by Dover District Council. All collection schedule data is the property
                of Dover District Council.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3. No warranty</h2>
              <p>
                This service is provided &quot;as is&quot; without any warranties of any kind, either express or implied.
                We do not guarantee that:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>The service will be available at all times</li>
                <li>The collection dates shown will be accurate</li>
                <li>The service will detect all schedule changes</li>
                <li>The service will continue to operate indefinitely</li>
              </ul>
              <p className="mt-3 font-medium">
                Always verify collection dates with official Dover District Council sources before
                putting your bins out.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">4. Limitation of liability</h2>
              <p>
                To the maximum extent permitted by law, we shall not be liable for any damages
                arising from your use of this service, including but not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Missed bin collections due to incorrect dates</li>
                <li>Service unavailability or interruptions</li>
                <li>Data loss or corruption</li>
                <li>Any indirect or consequential damages</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">5. Acceptable use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Attempt to overload, disrupt, or abuse the service</li>
                <li>Use automated systems to make excessive requests</li>
                <li>Attempt to access data belonging to other users</li>
                <li>Reverse engineer or attempt to extract the source code</li>
                <li>Use the service for any unlawful purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">6. Service changes</h2>
              <p>
                We reserve the right to modify, suspend, or discontinue the service at any time
                without notice. We may also modify these terms at any time; continued use of the
                service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">7. Data source</h2>
              <p>
                This service relies on data from Dover District Council&apos;s public website.
                If the council changes their website structure or restricts access, the service
                may cease to function. We are not responsible for any changes made by the council.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">8. Privacy</h2>
              <p>
                Your use of this service is also governed by our{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>,
                which describes how we collect, use, and protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">9. Governing law</h2>
              <p>
                These terms are governed by the laws of England and Wales. Any disputes shall
                be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mt-6 mb-3">10. Contact</h2>
              <p>
                For questions about these terms, please contact us via the repository issues page.
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
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </main>
  );
}
