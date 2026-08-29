'use client';

import { ArrowUpRight, Bookmark, ChevronUp, Share2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { card, iconButton } from '@/lib/ui';
import type { Meme } from '@/lib/types';

const FALLBACK_SRC = '/fallback.svg';

/**
 * Reserves the image's real aspect ratio before it loads, so nothing on the
 * page moves when it arrives. Clamped to sane bounds for very tall crops.
 */
function aspectRatio(meme: Meme): string {
  if (!meme.width || !meme.height) return '4 / 3';
  const ratio = meme.width / meme.height;
  const clamped = Math.min(Math.max(ratio, 0.5), 2);
  return `${clamped}`;
}

export function MemeCard({
  meme,
  saved,
  onToggleSave,
  onShare,
}: {
  meme: Meme;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
}) {
  // Remounted by the parent on each new meme, so this starts fresh.
  const [src, setSrc] = useState(meme.url);

  return (
    <article className={cn(card, 'overflow-hidden')}>
      <div
        className="flex items-center justify-center bg-elevated"
        style={{ aspectRatio: aspectRatio(meme) }}
      >
        {/*
          A plain <img> is deliberate: sources are arbitrary user-submitted
          Reddit hosts, and routing them through the Next image optimizer
          would proxy unbounded third-party traffic through the deployment.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={meme.title}
          width={meme.width ?? undefined}
          height={meme.height ?? undefined}
          className="h-full w-full object-contain"
          onError={() => setSrc(FALLBACK_SRC)}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-border-subtle p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="text-base leading-snug font-medium text-balance">
            {meme.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>r/{meme.subreddit}</span>
            <span>u/{meme.author}</span>
            <span className="inline-flex items-center gap-1">
              <ChevronUp aria-hidden className="h-3.5 w-3.5" />
              {meme.ups.toLocaleString()}
            </span>
            <a
              href={meme.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:text-accent-hover"
            >
              Reddit
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            title={saved ? 'Remove from saved (S)' : 'Save this meme (S)'}
            className={cn(iconButton, saved && 'text-accent')}
          >
            <Bookmark
              aria-hidden
              className="h-4 w-4"
              fill={saved ? 'currentColor' : 'none'}
            />
            <span className="sr-only">{saved ? 'Saved' : 'Save'}</span>
          </button>
          <button
            type="button"
            onClick={onShare}
            title="Copy share link (C)"
            className={iconButton}
          >
            <Share2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export function MemeCardSkeleton() {
  return (
    <div className={cn(card, 'overflow-hidden')} aria-hidden>
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="space-y-3 border-t border-border-subtle p-4">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-1/2 rounded" />
      </div>
    </div>
  );
}
