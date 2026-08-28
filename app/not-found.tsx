import Link from 'next/link';
import { buttonSecondary } from '@/lib/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold tracking-tight">Meme not found</h1>
      <p className="text-sm text-muted">
        This link points to a post that has been removed, or was never an image.
      </p>
      <Link href="/" className={buttonSecondary}>
        Back to browsing
      </Link>
    </main>
  );
}
