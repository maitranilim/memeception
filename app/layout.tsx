import type { Metadata, Viewport } from 'next';
import { THEME_INIT_SCRIPT } from '@/lib/use-theme';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Memeception',
    template: '%s · Memeception',
  },
  description:
    'A fast, keyboard-driven meme reader. Press ⌘K to jump anywhere, S to save.',
  applicationName: 'Memeception',
  openGraph: {
    type: 'website',
    siteName: 'Memeception',
    title: 'Memeception',
    description: 'A fast, keyboard-driven meme reader.',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applied before first paint so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
