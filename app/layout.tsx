import type { Metadata } from 'next';
import './globals.css';
import { MapsProvider } from '@/components/MapsProvider';

export const metadata: Metadata = {
  title: 'ExtraHand Live Tracking',
  description: 'Real-time delivery tracking platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MapsProvider>
          {children}
        </MapsProvider>
      </body>
    </html>
  );
}
