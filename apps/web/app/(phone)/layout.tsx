import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import s from './phone.module.css';

// latin-ext carries Romanian ș ț ă â î. Atkinson sets every word and number; the mono only the issued code.
const text = Atkinson_Hyperlegible_Next({ subsets: ['latin', 'latin-ext'], variable: '--font-text', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'ChirieSigură · Secure verification', template: '%s · ChirieSigură' },
  description: 'Landlord verification and viewing reports, checked by your mobile operator.',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
};

export default function PhoneLayout({ children }: { children: ReactNode }) {
  return <div className={`${s.phone} ${text.variable} ${mono.variable}`}>{children}</div>;
}
