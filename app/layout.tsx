import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Group Voice & Text Chat',
  description: 'Modern glassmorphism group voice chat with real-time text messaging and free cloud WebRTC infrastructure.',
  openGraph: {
    title: 'Group Voice & Text Chat',
    description: 'Modern glassmorphism group voice chat with real-time text messaging and free cloud WebRTC infrastructure.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Group Voice & Text Chat',
    description: 'Modern glassmorphism group voice chat with real-time text messaging and free cloud WebRTC infrastructure.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
