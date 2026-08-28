'use client';

import { Download, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { buttonSecondary, card, iconButton } from '@/lib/ui';
import type { Meme } from '@/lib/types';

export function FavoritesPanel({
  favorites,
  onRemove,
  onClear,
  onExport,
  onImport,
  onBrowse,
}: {
  favorites: Meme[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onBrowse: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (favorites.length === 0) {
    return (
      <div className={cn(card, 'px-6 py-16 text-center')}>
        <p className="text-sm font-medium">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Press{' '}
          <kbd className="rounded border border-border-subtle bg-elevated px-1.5 py-0.5 text-xs">
            S
          </kbd>{' '}
          on a meme you want to keep. Saved memes stay in this browser — there
          is no account and nothing is uploaded.
        </p>
        <button
          type="button"
          onClick={onBrowse}
          className={cn(buttonSecondary, 'mt-6')}
        >
          Browse memes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {favorites.length} saved in this browser
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            className={buttonSecondary}
            title="Download as JSON"
          >
            <Download aria-hidden className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={buttonSecondary}
            title="Merge a previously exported file"
          >
            <Upload aria-hidden className="h-4 w-4" />
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={onClear}
            className={cn(iconButton, 'hover:text-danger')}
            title="Remove all saved memes"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">Clear all</span>
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {favorites.map((meme) => (
          <li
            key={meme.id}
            className={cn(card, 'group relative overflow-hidden')}
          >
            <a href={`/m/${meme.id}`} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meme.url}
                alt={meme.title}
                loading="lazy"
                className="aspect-square w-full bg-elevated object-cover"
              />
              <p className="line-clamp-2 px-3 py-2 text-xs text-muted">
                {meme.title}
              </p>
            </a>
            <button
              type="button"
              onClick={() => onRemove(meme.id)}
              className={cn(
                iconButton,
                'absolute top-2 right-2 h-7 w-7 bg-surface hover:text-danger',
              )}
              title="Remove"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
              <span className="sr-only">Remove {meme.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
