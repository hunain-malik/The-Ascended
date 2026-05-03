import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Ascended',
  description: 'Private archive.',
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-ink-950 text-bone-50 font-sans antialiased selection:bg-crimson-700 selection:text-bone-50">
        <div className="fixed inset-0 -z-20 bg-aurora" />
        <div className="fixed inset-0 -z-10 bg-noise opacity-[0.04] mix-blend-overlay" />
        {children}
      </body>
    </html>
  );
}
