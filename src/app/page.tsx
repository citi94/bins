'use client';

import { useState } from 'react';

interface Address {
  uprn: string;
  address: string;
}

interface Service {
  name: string;
  schedule: string;
  nextCollection: string;
}

interface SubscriptionResult {
  calendarUrl: string;
  token: string;
  services: Service[];
}

type Step = 'input' | 'select' | 'success';

const BIN_COLORS: Record<string, { bg: string; icon: string }> = {
  'Refuse Collection': { bg: 'bg-slate-700', icon: '🗑️' },
  'Paper/Card Collection': { bg: 'bg-blue-700', icon: '📦' },
  'Recycling Collection': { bg: 'bg-green-700', icon: '♻️' },
  'Food Collection': { bg: 'bg-amber-600', icon: '🍎' },
  'Garden Waste Collection': { bg: 'bg-emerald-700', icon: '🌿' },
};

function getBinStyle(name: string) {
  return BIN_COLORS[name] || { bg: 'bg-slate-600', icon: '📅' };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [postcode, setPostcode] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLookup = async () => {
    if (!postcode.trim()) {
      setError('Please enter a postcode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to find addresses');
        return;
      }

      setAddresses(data.addresses);
      setStep('select');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedAddress) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uprn: selectedAddress.uprn,
          address: selectedAddress.address,
          postcode: postcode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create subscription');
        return;
      }

      setSubscription(data);
      setStep('success');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!subscription) return;

    try {
      await navigator.clipboard.writeText(subscription.calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = subscription.calendarUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setStep('input');
    setPostcode('');
    setAddresses([]);
    setSelectedAddress(null);
    setSubscription(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <div className="font-semibold">Bin Collection Calendar</div>
                <div className="text-sm text-slate-300">Dover District Council</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Main content card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">

          {/* Step: Input */}
          {step === 'input' && (
            <div className="p-6 md:p-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Subscribe to collection reminders
              </h1>
              <p className="text-slate-600 mb-6">
                Get a calendar feed that automatically updates with your bin collection dates, including bank holiday changes.
              </p>

              <label className="block text-sm font-medium text-slate-900 mb-2">
                Enter your postcode
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. CT14 6AD"
                  className="flex-1 px-4 py-3 text-base rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  disabled={loading}
                />
                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    'Find address'
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Select Address */}
          {step === 'select' && (
            <div className="p-6 md:p-8">
              <button
                onClick={() => setStep('input')}
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Change postcode
              </button>

              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Select your address
              </h2>

              <select
                value={selectedAddress?.uprn || ''}
                onChange={(e) => {
                  const addr = addresses.find(a => a.uprn === e.target.value);
                  setSelectedAddress(addr || null);
                  setError(null);
                }}
                className="w-full px-4 py-3 text-base rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all bg-white text-slate-900"
              >
                <option value="">Choose an address...</option>
                {addresses.map((addr) => (
                  <option key={addr.uprn} value={addr.uprn}>
                    {addr.address}
                  </option>
                ))}
              </select>

              {selectedAddress && (
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="mt-4 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating calendar...
                    </span>
                  ) : (
                    'Get calendar subscription'
                  )}
                </button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && subscription && (
            <div>
              {/* Success banner */}
              <div className="bg-green-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Calendar subscription ready</h2>
                    <p className="text-green-100 text-sm">Add this URL to your calendar app</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Calendar URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Subscription URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={subscription.calendarUrl}
                      className="flex-1 px-4 py-3 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className={`px-5 py-3 rounded-lg font-medium text-sm transition-colors ${
                        copied
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Upcoming collections */}
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-3">Your collection schedule</h3>
                  <div className="space-y-2">
                    {subscription.services.map((service) => {
                      const style = getBinStyle(service.name);
                      return (
                        <div
                          key={service.name}
                          className={`${style.bg} text-white p-4 rounded-lg flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{style.icon}</span>
                            <div>
                              <div className="font-medium">{service.name.replace(' Collection', '')}</div>
                              <div className="text-sm text-white/80">{service.schedule}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white/80">Next</div>
                            <div className="font-medium">{formatDate(service.nextCollection)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-3">How to subscribe</h3>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                    <details className="group">
                      <summary className="flex items-center justify-between p-4 cursor-pointer">
                        <span className="font-medium text-slate-900">Apple Calendar (iPhone, iPad, Mac)</span>
                        <svg className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-slate-700">
                        <p className="mb-2"><strong>iPhone/iPad:</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → Paste URL</p>
                        <p><strong>Mac:</strong> Calendar → File → New Calendar Subscription → Paste URL</p>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-4 cursor-pointer">
                        <span className="font-medium text-slate-900">Google Calendar</span>
                        <svg className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-slate-700">
                        <p>On desktop: Click + next to &quot;Other calendars&quot; → From URL → Paste URL</p>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-4 cursor-pointer">
                        <span className="font-medium text-slate-900">Outlook</span>
                        <svg className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-slate-700">
                        <p><strong>Outlook.com:</strong> Calendar → Add calendar → Subscribe from web → Paste URL</p>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Start over */}
                <button
                  onClick={reset}
                  className="w-full py-3 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Subscribe another address
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-slate-600">
          <p>
            Collection data sourced from{' '}
            <a
              href="https://collections.dover.gov.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Dover District Council
            </a>
          </p>
          <p className="mt-1 text-slate-500">
            This is an unofficial service. Calendar updates daily at 6am.
          </p>
        </footer>
      </div>
    </main>
  );
}
