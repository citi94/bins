import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dover Bin Collection Calendar",
  description: "Subscribe to your bin collection dates as a calendar. Works with Apple Calendar, Google Calendar, and Outlook. Automatic updates for bank holiday changes.",
  metadataBase: new URL('https://doverbins.netlify.app'),
  openGraph: {
    title: "Dover Bin Collection Calendar",
    description: "Never miss a bin day again. Subscribe to your collection dates and get automatic updates when dates change for bank holidays.",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: "Dover Bin Collection Calendar",
    description: "Never miss a bin day again. Subscribe to your collection dates and get automatic updates for bank holidays.",
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
