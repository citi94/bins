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

const BIN_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  'Refuse Collection': { bg: 'bg-neutral-800', border: 'border-neutral-700', icon: '🗑️' },
  'Paper/Card Collection': { bg: 'bg-blue-600', border: 'border-blue-500', icon: '📦' },
  'Recycling Collection': { bg: 'bg-green-600', border: 'border-green-500', icon: '♻️' },
  'Food Collection': { bg: 'bg-orange-500', border: 'border-orange-400', icon: '🍎' },
  'Garden Waste Collection': { bg: 'bg-emerald-700', border: 'border-emerald-600', icon: '🌿' },
};

function getBinStyle(name: string) {
  return BIN_COLORS[name] || { bg: 'bg-gray-600', border: 'border-gray-500', icon: '📅' };
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
    <main className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <header className="mb-10">
          <p className="text-sm font-medium text-neutral-500 mb-2">Dover District Council</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight">
            Bin Collection Calendar
          </h1>
          <p className="mt-3 text-neutral-600">
            Get a calendar subscription that updates automatically, including bank holiday changes.
          </p>
        </header>

        {/* Step: Input */}
        {step === 'input' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Postcode
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
                className="flex-1 px-4 py-3 text-base rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all"
                disabled={loading}
              />
              <button
                onClick={handleLookup}
                disabled={loading}
                className="px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </span>
                ) : (
                  'Look up'
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Address */}
        {step === 'select' && (
          <div>
            <button
              onClick={() => setStep('input')}
              className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select your address
            </label>
            <select
              value={selectedAddress?.uprn || ''}
              onChange={(e) => {
                const addr = addresses.find(a => a.uprn === e.target.value);
                setSelectedAddress(addr || null);
                setError(null);
              }}
              className="w-full px-4 py-3 text-base rounded-lg border border-neutral-300 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 outline-none transition-all bg-white"
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
                className="mt-4 w-full px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating calendar...
                  </span>
                ) : (
                  'Get calendar'
                )}
              </button>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && subscription && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">Calendar ready</h2>
            </div>

            {/* Calendar URL */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Calendar URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={subscription.calendarUrl}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Upcoming collections */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Next collections</h3>
              <div className="space-y-2">
                {subscription.services.map((service) => {
                  const style = getBinStyle(service.name);
                  return (
                    <div
                      key={service.name}
                      className={`${style.bg} text-white p-4 rounded-lg flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{style.icon}</span>
                        <div>
                          <div className="font-medium">{service.name.replace(' Collection', '')}</div>
                          <div className="text-sm opacity-75">{service.schedule}</div>
                        </div>
                      </div>
                      <div className="text-right font-medium">
                        {formatDate(service.nextCollection)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer">
                  <span className="font-medium text-neutral-900">Apple Calendar</span>
                  <svg className="w-5 h-5 text-neutral-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-600">
                  <p className="mb-2"><strong>iPhone/iPad:</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → Paste URL</p>
                  <p><strong>Mac:</strong> Calendar → File → New Calendar Subscription → Paste URL</p>
                </div>
              </details>

              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer">
                  <span className="font-medium text-neutral-900">Google Calendar</span>
                  <svg className="w-5 h-5 text-neutral-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-600">
                  <p>On desktop: Click + next to &quot;Other calendars&quot; → From URL → Paste URL</p>
                </div>
              </details>

              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer">
                  <span className="font-medium text-neutral-900">Outlook</span>
                  <svg className="w-5 h-5 text-neutral-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-neutral-600">
                  <p><strong>Outlook.com:</strong> Calendar → Add calendar → Subscribe from web → Paste URL</p>
                </div>
              </details>
            </div>

            {/* Start over */}
            <button
              onClick={reset}
              className="mt-6 w-full py-3 text-neutral-500 hover:text-neutral-700 text-sm font-medium transition-colors"
            >
              Look up another address
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-neutral-100 text-sm text-neutral-500">
          <p>
            Data from{' '}
            <a
              href="https://collections.dover.gov.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-700"
            >
              Dover District Council
            </a>
            . Calendar updates daily.
          </p>
        </footer>
      </div>
    </main>
  );
}
