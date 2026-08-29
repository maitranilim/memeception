import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MemeReader } from '@/components/meme-reader';
import { fetchMemeById } from '@/lib/reddit';

type Params = { params: Promise<{ id: string }> };

/**
 * Rendered on the server so a shared link arrives with the meme already in
 * the markup — good for the first paint, and required for link unfurling.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  const meme = await fetchMemeById(id).catch(() => null);
  if (!meme) return { title: 'Meme not found' };

  return {
    title: meme.title,
    description: `From r/${meme.subreddit} · ${meme.ups.toLocaleString()} upvotes`,
    openGraph: {
      title: meme.title,
      description: `From r/${meme.subreddit} on Memeception`,
      url: `/m/${meme.id}`,
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title: meme.title },
  };
}

export default async function MemePage({ params }: Params) {
  const { id } = await params;

  const meme = await fetchMemeById(id).catch(() => null);
  if (!meme) notFound();

  return <MemeReader initialMeme={meme} />;
}
