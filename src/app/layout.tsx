import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'App Hub',
  description: 'All my local apps in one place: run, stop and open them.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
