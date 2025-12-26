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

const BIN_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'Refuse Collection': { bg: 'bg-zinc-700', text: 'text-zinc-100', icon: '🗑️' },
  'Paper/Card Collection': { bg: 'bg-blue-600', text: 'text-blue-50', icon: '📦' },
  'Recycling Collection': { bg: 'bg-emerald-600', text: 'text-emerald-50', icon: '♻️' },
  'Food Collection': { bg: 'bg-amber-600', text: 'text-amber-50', icon: '🍎' },
  'Garden Waste Collection': { bg: 'bg-lime-700', text: 'text-lime-50', icon: '🌿' },
};

function getBinStyle(name: string) {
  return BIN_COLORS[name] || { bg: 'bg-teal-600', text: 'text-teal-50', icon: '📅' };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
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
      // Fallback for older browsers
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
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-teal-50/30 to-emerald-50/40 relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5c-2 8-8 14-16 16 8 2 14 8 16 16 2-8 8-14 16-16-8-2-14-8-16-16z' fill='%23166534' fill-opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-6 border border-teal-100">
            <span className="text-2xl">🗑️</span>
            <span className="text-sm font-medium text-teal-800 tracking-wide uppercase">Dover District</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-stone-800 mb-4 leading-tight">
            Never Miss a<br />
            <span className="text-teal-700">Bin Collection</span>
          </h1>
          <p className="text-lg text-stone-600 max-w-md mx-auto leading-relaxed">
            Subscribe to a calendar that updates automatically —
            even when dates change for bank holidays.
          </p>
        </header>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-teal-900/5 border border-stone-200/60 overflow-hidden">

          {/* Step: Input */}
          {step === 'input' && (
            <div className="p-6 md:p-10 animate-fadeIn">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Your Postcode
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
                  placeholder="e.g. CT3 2AW"
                  className="flex-1 px-4 py-3 text-lg rounded-xl border-2 border-stone-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all bg-white placeholder:text-stone-400"
                  disabled={loading}
                />
                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="hidden md:inline">Looking up...</span>
                    </span>
                  ) : (
                    'Find Address'
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-shake">
                  {error}
                </div>
              )}

              <p className="mt-4 text-sm text-stone-500">
                This service is for Dover District Council residents only.
              </p>
            </div>
          )}

          {/* Step: Select Address */}
          {step === 'select' && (
            <div className="p-6 md:p-10 animate-fadeIn">
              <button
                onClick={() => setStep('input')}
                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mb-4 group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Change postcode
              </button>

              <label className="block text-sm font-medium text-stone-700 mb-2">
                Select Your Address
              </label>
              <select
                value={selectedAddress?.uprn || ''}
                onChange={(e) => {
                  const addr = addresses.find(a => a.uprn === e.target.value);
                  setSelectedAddress(addr || null);
                  setError(null);
                }}
                className="w-full px-4 py-3 text-lg rounded-xl border-2 border-stone-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all bg-white appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.5rem',
                }}
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
                  className="mt-6 w-full px-6 py-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 animate-slideUp"
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
                    <>Get My Calendar</>
                  )}
                </button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-shake">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && subscription && (
            <div className="animate-fadeIn">
              {/* Success header */}
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 md:p-10 text-white text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 animate-bounce-once">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl mb-2">Your Calendar is Ready!</h2>
                <p className="text-teal-100 text-sm md:text-base">Add it to your calendar app to stay updated</p>
              </div>

              <div className="p-6 md:p-10 space-y-8">
                {/* Calendar URL */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Calendar Subscription URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={subscription.calendarUrl}
                      className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-600 font-mono truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Upcoming collections */}
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-3">Your Next Collections</h3>
                  <div className="grid gap-2">
                    {subscription.services.map((service) => {
                      const style = getBinStyle(service.name);
                      return (
                        <div
                          key={service.name}
                          className={`${style.bg} ${style.text} p-4 rounded-xl flex items-center gap-4`}
                        >
                          <span className="text-2xl">{style.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{service.name}</div>
                            <div className="text-sm opacity-80">{service.schedule}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-semibold">{formatDate(service.nextCollection)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                  <h3 className="font-semibold text-stone-800 mb-4">How to Add This Calendar</h3>

                  <div className="space-y-4 text-sm">
                    <details className="group">
                      <summary className="flex items-center gap-3 cursor-pointer list-none">
                        <span className="text-2xl">🍎</span>
                        <span className="font-medium text-stone-700 group-hover:text-teal-600 transition-colors">Apple Calendar (iPhone, iPad, Mac)</span>
                        <svg className="w-4 h-4 ml-auto text-stone-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 pl-11 text-stone-600 space-y-2">
                        <p><strong>On iPhone/iPad:</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → Paste URL</p>
                        <p><strong>On Mac:</strong> Calendar → File → New Calendar Subscription → Paste URL</p>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center gap-3 cursor-pointer list-none">
                        <span className="text-2xl">📅</span>
                        <span className="font-medium text-stone-700 group-hover:text-teal-600 transition-colors">Google Calendar</span>
                        <svg className="w-4 h-4 ml-auto text-stone-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 pl-11 text-stone-600 space-y-2">
                        <p>Open Google Calendar on your computer → Click the + next to &quot;Other calendars&quot; → From URL → Paste URL → Add calendar</p>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center gap-3 cursor-pointer list-none">
                        <span className="text-2xl">📧</span>
                        <span className="font-medium text-stone-700 group-hover:text-teal-600 transition-colors">Outlook</span>
                        <svg className="w-4 h-4 ml-auto text-stone-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 pl-11 text-stone-600 space-y-2">
                        <p><strong>Outlook.com:</strong> Calendar → Add calendar → Subscribe from web → Paste URL</p>
                        <p><strong>Desktop:</strong> File → Account Settings → Internet Calendars → New → Paste URL</p>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Start over */}
                <button
                  onClick={reset}
                  className="w-full py-3 text-stone-500 hover:text-stone-700 text-sm font-medium transition-colors"
                >
                  Subscribe another address
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-stone-500">
          <p>
            Data sourced from{' '}
            <a
              href="https://collections.dover.gov.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 underline underline-offset-2"
            >
              Dover District Council
            </a>
          </p>
          <p className="mt-2 text-stone-400">
            Calendar refreshes daily to catch holiday changes
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Source+Sans+3:wght@400;500;600;700&display=swap');

        :root {
          --font-serif: 'Fraunces', Georgia, serif;
          --font-sans: 'Source Sans 3', system-ui, sans-serif;
        }

        body {
          font-family: var(--font-sans);
        }

        .font-serif {
          font-family: var(--font-serif);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out;
        }
      `}</style>
    </main>
  );
}
