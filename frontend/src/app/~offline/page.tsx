import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="full-viewport flex items-center justify-center bg-dark-bg p-6 text-center">
      <div className="card max-w-md">
        <h1 className="mb-3 text-2xl font-semibold text-text-primary">You’re offline</h1>
        <p className="mb-6 text-gray-400">
          Previously viewed places may still be available. Reconnect to load anything new.
        </p>
        <Link href="/" className="btn-primary inline-flex min-h-11 items-center justify-center px-5">
          Try again
        </Link>
      </div>
    </main>
  );
}
