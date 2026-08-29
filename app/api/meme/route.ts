import { NextResponse } from 'next/server';
import { DEFAULT_GENRE, isGenreId } from '@/lib/genres';
import { fetchRandomMeme, UpstreamError } from '@/lib/reddit';
import type { MemeResponse } from '@/lib/types';

export async function GET(
  request: Request,
): Promise<NextResponse<MemeResponse>> {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre') ?? DEFAULT_GENRE;
  const allowNsfw = searchParams.get('nsfw') === 'true';

  if (!isGenreId(genre)) {
    return NextResponse.json(
      { error: 'That category is not available.', code: 'unknown-genre' },
      { status: 400 },
    );
  }

  try {
    const meme = await fetchRandomMeme(genre, allowNsfw);

    if (!meme) {
      return NextResponse.json(
        {
          error: 'No images found in this category right now. Try another.',
          code: 'empty-genre',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(meme, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    const message =
      error instanceof UpstreamError
        ? 'Reddit is not responding. Try again in a moment.'
        : 'Something went wrong loading that meme.';

    return NextResponse.json(
      { error: message, code: 'upstream-unavailable' },
      { status: 502 },
    );
  }
}
