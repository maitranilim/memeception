'use client';

import {
  Bookmark,
  Command as CommandIcon,
  Keyboard,
  Moon,
  RefreshCw,
  Share2,
  Shuffle,
  Sun,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette, type Command } from '@/components/command-palette';
import { FavoritesPanel } from '@/components/favorites-panel';
import { MemeCard, MemeCardSkeleton } from '@/components/meme-card';
import { ShortcutsDialog } from '@/components/shortcuts-dialog';
import { Toast, useToast } from '@/components/toast';
import { cn } from '@/lib/cn';
import { DEFAULT_GENRE, GENRES, type GenreId, genreLabel } from '@/lib/genres';
import { buttonPrimary, buttonSecondary, card, iconButton } from '@/lib/ui';
import { isMemeError, type Meme, type MemeResponse } from '@/lib/types';
import { useFavorites } from '@/lib/use-favorites';
import { useTheme } from '@/lib/use-theme';

type Tab = 'browse' | 'saved';

async function requestMeme(
  genre: GenreId,
  allowNsfw: boolean,
  signal?: AbortSignal,
): Promise<MemeResponse> {
  const response = await fetch(
    `/api/meme?genre=${encodeURIComponent(genre)}&nsfw=${allowNsfw}`,
    { signal },
  );
  return (await response.json()) as MemeResponse;
}

/** Warms the browser cache so a prefetched meme paints immediately. */
function preload(url: string) {
  const image = new Image();
  image.src = url;
}

export function MemeReader({ initialMeme }: { initialMeme?: Meme }) {
  const [genre, setGenre] = useState<GenreId>(DEFAULT_GENRE);
  const [allowNsfw, setAllowNsfw] = useState(false);
  const [meme, setMeme] = useState<Meme | null>(initialMeme ?? null);
  const [loading, setLoading] = useState(!initialMeme);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('browse');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { message, show } = useToast();
  const {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    exportFavorites,
    importFavorites,
  } = useFavorites();

  // One meme is fetched ahead of time so "Next" is instant rather than a spinner.
  const buffer = useRef<Meme | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const firstRender = useRef(true);

  const fillBuffer = useCallback(
    async (forGenre: GenreId, nsfw: boolean) => {
      try {
        const data = await requestMeme(forGenre, nsfw);
        // Discard if the user changed filters while this was in flight.
        if (forGenre !== genre || nsfw !== allowNsfw) return;
        if (!isMemeError(data)) {
          buffer.current = data;
          preload(data.url);
        }
      } catch {
        // A failed prefetch is not worth surfacing; the next click retries.
      }
    },
    [genre, allowNsfw],
  );

  const load = useCallback(
    async (forGenre: GenreId, nsfw: boolean) => {
      const buffered = buffer.current;
      if (buffered) {
        buffer.current = null;
        setMeme(buffered);
        setError(null);
        setLoading(false);
        void fillBuffer(forGenre, nsfw);
        return;
      }

      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setLoading(true);
      setError(null);

      try {
        const data = await requestMeme(forGenre, nsfw, controller.signal);
        if (controller.signal.aborted) return;

        if (isMemeError(data)) {
          setError(data.error);
          setMeme(null);
        } else {
          setMeme(data);
          void fillBuffer(forGenre, nsfw);
        }
      } catch (caught) {
        if ((caught as Error).name === 'AbortError') return;
        setError('Could not reach the server. Check your connection.');
        setMeme(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [fillBuffer],
  );

  // Refetch when the filters change; the first render may already have a meme.
  useEffect(() => {
    buffer.current = null;
    if (firstRender.current) {
      firstRender.current = false;
      if (initialMeme) {
        void fillBuffer(genre, allowNsfw);
        return;
      }
    }
    void load(genre, allowNsfw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, allowNsfw]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const next = useCallback(() => {
    setTab('browse');
    void load(genre, allowNsfw);
  }, [load, genre, allowNsfw]);

  const save = useCallback(() => {
    if (!meme) return;
    show(toggleFavorite(meme) ? 'Saved' : 'Removed from saved');
  }, [meme, toggleFavorite, show]);

  const share = useCallback(async () => {
    if (!meme) return;
    const url = `${window.location.origin}/m/${meme.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: meme.title, url });
        return;
      } catch {
        // The user dismissed the sheet, or sharing is unavailable; fall through.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      show('Link copied');
    } catch {
      show('Could not copy the link');
    }
  }, [meme, show]);

  const commands = useMemo<Command[]>(() => {
    const genreCommands: Command[] = GENRES.map((entry) => ({
      id: `genre-${entry.id}`,
      label: entry.label,
      group: 'Categories',
      hint: entry.description,
      keywords: entry.id,
      icon: Shuffle,
      run: () => {
        setTab('browse');
        setGenre(entry.id);
      },
    }));

    return [
      ...genreCommands,
      {
        id: 'next',
        label: 'Next meme',
        group: 'Actions',
        hint: 'Space',
        icon: RefreshCw,
        run: next,
      },
      {
        id: 'save',
        label: isFavorite(meme?.id ?? '') ? 'Remove from saved' : 'Save meme',
        group: 'Actions',
        hint: 'S',
        icon: Bookmark,
        run: save,
      },
      {
        id: 'share',
        label: 'Copy share link',
        group: 'Actions',
        hint: 'C',
        icon: Share2,
        run: () => void share(),
      },
      {
        id: 'saved',
        label: 'View saved memes',
        group: 'Actions',
        hint: 'F',
        icon: Bookmark,
        run: () => setTab('saved'),
      },
      {
        id: 'theme',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Actions',
        hint: 'D',
        icon: theme === 'dark' ? Sun : Moon,
        run: toggleTheme,
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        group: 'Actions',
        hint: '?',
        icon: Keyboard,
        run: () => setShortcutsOpen(true),
      },
    ];
  }, [next, save, share, theme, toggleTheme, isFavorite, meme?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShortcutsOpen(false);
        setPaletteOpen((open) => !open);
        return;
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setShortcutsOpen(false);
        return;
      }

      if (typing || paletteOpen || shortcutsOpen) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case ' ':
        case 'ArrowRight':
          event.preventDefault();
          next();
          break;
        case '?':
          event.preventDefault();
          setShortcutsOpen(true);
          break;
        default:
          switch (event.key.toLowerCase()) {
            case 's':
              event.preventDefault();
              save();
              break;
            case 'c':
              event.preventDefault();
              void share();
              break;
            case 'f':
              event.preventDefault();
              setTab((current) => (current === 'saved' ? 'browse' : 'saved'));
              break;
            case 'd':
              event.preventDefault();
              toggleTheme();
              break;
          }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, save, share, toggleTheme, paletteOpen, shortcutsOpen]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Memeception</h1>
          <span className="hidden text-sm text-muted sm:inline">
            {genreLabel(genre)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(buttonSecondary, 'hidden sm:inline-flex')}
            aria-label="Open command palette"
          >
            <CommandIcon aria-hidden className="h-3.5 w-3.5" />
            <span className="text-muted">Search</span>
            <kbd className="ml-2 rounded border border-border-subtle px-1.5 py-0.5 text-[11px] text-muted">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className={iconButton}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className={iconButton}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
          >
            {theme === 'dark' ? (
              <Sun aria-hidden className="h-4 w-4" />
            ) : (
              <Moon aria-hidden className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <nav
        aria-label="Views"
        className="mt-6 flex items-center gap-1 border-b border-border-subtle"
      >
        {(
          [
            ['browse', 'Browse'],
            ['saved', `Saved${favorites.length ? ` (${favorites.length})` : ''}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-current={tab === value ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              tab === value
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 py-6">
        {tab === 'saved' ? (
          <FavoritesPanel
            favorites={favorites}
            onRemove={removeFavorite}
            onClear={clearFavorites}
            onExport={exportFavorites}
            onImport={async (file) => {
              const added = await importFavorites(file);
              show(added ? `Imported ${added} memes` : 'Nothing new to import');
            }}
            onBrowse={() => setTab('browse')}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="genre" className="sr-only">
                Category
              </label>
              <select
                id="genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value as GenreId)}
                className="h-9 rounded-md border border-border-subtle bg-surface px-3 text-sm hover:bg-elevated focus-visible:border-accent"
              >
                {GENRES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>

              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 text-sm text-muted hover:bg-elevated">
                <input
                  type="checkbox"
                  checked={allowNsfw}
                  onChange={(event) => setAllowNsfw(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--app-accent)]"
                />
                Include NSFW
              </label>
            </div>

            {loading ? (
              <MemeCardSkeleton />
            ) : error ? (
              <div className={cn(card, 'px-6 py-16 text-center')}>
                <p className="text-sm font-medium">{error}</p>
                <button
                  type="button"
                  onClick={next}
                  className={cn(buttonSecondary, 'mt-6')}
                >
                  <RefreshCw aria-hidden className="h-4 w-4" />
                  Try again
                </button>
              </div>
            ) : meme ? (
              <MemeCard
                key={meme.id}
                meme={meme}
                saved={isFavorite(meme.id)}
                onToggleSave={save}
                onShare={() => void share()}
              />
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={next}
                disabled={loading}
                className={cn(buttonPrimary, 'flex-1')}
              >
                {loading ? 'Loading' : 'Next meme'}
              </button>
              <span className="hidden text-xs text-muted sm:block">
                or press{' '}
                <kbd className="rounded border border-border-subtle px-1.5 py-0.5">
                  Space
                </kbd>
              </span>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border-subtle pt-4 text-xs text-muted">
        <p>
          Content from Reddit. Saved memes are stored in this browser only.{' '}
          <a
            href="https://github.com/maitranilim/memeception"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            Source
          </a>
        </p>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <Toast message={message} />
    </div>
  );
}
