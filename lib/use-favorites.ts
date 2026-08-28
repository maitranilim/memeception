'use client';

import { useCallback, useSyncExternalStore } from 'react';
import * as store from './favorites-store';
import type { Meme } from './types';

/**
 * Favourites live entirely in the browser: no account, no backend, nothing
 * leaves the device. `useSyncExternalStore` reads localStorage without a
 * hydration mismatch — the server snapshot is empty and React swaps in the
 * real list once mounted.
 */
export function useFavorites() {
  const favorites = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const isFavorite = useCallback(
    (id: string) => favorites.some((meme) => meme.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback((meme: Meme) => store.toggle(meme), []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite: store.remove,
    clearFavorites: store.clear,
    exportFavorites: store.exportToFile,
    importFavorites: store.importFromFile,
  };
}
