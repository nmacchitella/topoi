import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Topoi - Save Your Favorite Places',
  description: 'A personal map application for saving and organizing places',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-dark-bg text-dark-text">{children}</body>
    </html>
  );
}
