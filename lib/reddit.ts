import { isGenreId } from './genres';
import type { Meme } from './types';

const REDDIT_BASE = 'https://www.reddit.com';
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Reddit rejects anonymous requests that arrive without a descriptive
 * User-Agent, which is easy to miss locally and fails once deployed to a
 * datacenter IP.
 */
const USER_AGENT =
  'web:memeception:1.0.0 (https://github.com/maitranilim/memeception)';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

type RedditPost = {
  id: string;
  url?: string;
  title?: string;
  author?: string;
  subreddit?: string;
  ups?: number;
  permalink?: string;
  over_18?: boolean;
  is_video?: boolean;
  stickied?: boolean;
  preview?: {
    images?: { source?: { url?: string; width?: number; height?: number } }[];
  };
};

type RedditListing = {
  data?: { children?: { data?: RedditPost }[] };
};

export class UpstreamError extends Error {}

async function getJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${REDDIT_BASE}${path}`, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Cache upstream responses so a burst of "next meme" clicks does not
      // become a burst of Reddit requests.
      next: { revalidate: 300 },
    });
  } catch {
    throw new UpstreamError('Could not reach Reddit.');
  }

  if (!response.ok) {
    throw new UpstreamError(`Reddit responded with ${response.status}.`);
  }

  return response.json();
}

function isImagePost(post: RedditPost): boolean {
  if (!post.url || post.is_video || post.stickied) return false;
  const url = post.url.toLowerCase();
  if (url.includes('i.redd.it') || url.includes('i.imgur.com')) return true;
  return IMAGE_EXTENSIONS.some((extension) => url.endsWith(extension));
}

function toMeme(post: RedditPost): Meme | null {
  if (!post.id || !post.url) return null;
  const source = post.preview?.images?.[0]?.source;
  return {
    id: post.id,
    url: post.url,
    title: post.title ?? 'Untitled',
    author: post.author ?? 'unknown',
    subreddit: post.subreddit ?? 'memes',
    ups: post.ups ?? 0,
    permalink: post.permalink
      ? `https://reddit.com${post.permalink}`
      : `https://reddit.com/${post.id}`,
    width: source?.width ?? null,
    height: source?.height ?? null,
  };
}

function readListing(payload: unknown): RedditPost[] {
  const listing = payload as RedditListing;
  const children = listing?.data?.children;
  if (!Array.isArray(children)) return [];
  return children
    .map((child) => child?.data)
    .filter((post): post is RedditPost => Boolean(post?.id));
}

/** Fetches one random image post from an allow-listed subreddit. */
export async function fetchRandomMeme(
  genre: string,
  allowNsfw: boolean,
): Promise<Meme | null> {
  if (!isGenreId(genre)) throw new UpstreamError('Unknown genre.');

  const payload = await getJson(`/r/${genre}/hot.json?limit=100&raw_json=1`);
  const candidates = readListing(payload)
    .filter(isImagePost)
    .filter((post) => allowNsfw || !post.over_18);

  if (candidates.length === 0) return null;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return picked ? toMeme(picked) : null;
}

/** Fetches a single post by id, for share permalinks. */
export async function fetchMemeById(id: string): Promise<Meme | null> {
  // Reddit ids are base36; reject anything else before building the URL.
  if (!/^[a-z0-9]{1,16}$/i.test(id)) return null;

  const payload = await getJson(`/comments/${id}.json?limit=1&raw_json=1`);
  const listings = Array.isArray(payload) ? payload : [payload];
  const post = readListing(listings[0])[0];

  if (!post || !isImagePost(post)) return null;
  return toMeme(post);
}
