import type { Meme } from './types';

const STORAGE_KEY = 'memeception:favorites';
const MAX_FAVORITES = 200;

/** Stable identity for the server render, so React does not see a new array. */
const EMPTY: Meme[] = [];

let cache: Meme[] | null = null;
const listeners = new Set<() => void>();

function isMeme(value: unknown): value is Meme {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Meme).id === 'string' &&
    typeof (value as Meme).url === 'string'
  );
}

function parse(raw: string | null): Meme[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMeme) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  // Keep multiple open tabs in agreement.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = parse(event.newValue);
      emit();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Must be cheap and return a stable reference between writes, because React
 * calls it on every render to decide whether the store changed.
 */
export function getSnapshot(): Meme[] {
  if (cache === null) {
    try {
      cache = parse(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

export function getServerSnapshot(): Meme[] {
  return EMPTY;
}

function commit(next: Meme[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage blocked; the in-memory list still works.
  }
  emit();
}

/** Returns true when the meme was added, false when it was removed. */
export function toggle(meme: Meme): boolean {
  const current = getSnapshot();
  const exists = current.some((saved) => saved.id === meme.id);
  commit(
    exists
      ? current.filter((saved) => saved.id !== meme.id)
      : [meme, ...current].slice(0, MAX_FAVORITES),
  );
  return !exists;
}

export function remove(id: string) {
  commit(getSnapshot().filter((meme) => meme.id !== id));
}

export function clear() {
  commit(EMPTY);
}

export function exportToFile() {
  const blob = new Blob([JSON.stringify(getSnapshot(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'memeception-favorites.json';
  link.click();
  URL.revokeObjectURL(url);
}

/** Merges an exported file into the current list. Returns the number added. */
export async function importFromFile(file: File): Promise<number> {
  try {
    const parsed: unknown = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) return 0;

    const byId = new Map(getSnapshot().map((meme) => [meme.id, meme]));
    let added = 0;

    for (const item of parsed) {
      if (isMeme(item) && !byId.has(item.id)) {
        byId.set(item.id, item);
        added += 1;
      }
    }

    if (added > 0) commit([...byId.values()].slice(0, MAX_FAVORITES));
    return added;
  } catch {
    return 0;
  }
}
