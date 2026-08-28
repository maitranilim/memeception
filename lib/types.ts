export type Meme = {
  /** Reddit post id, e.g. `1a2b3c`. Used as the share permalink slug. */
  id: string;
  url: string;
  title: string;
  author: string;
  subreddit: string;
  ups: number;
  permalink: string;
  width: number | null;
  height: number | null;
};

export type MemeError = {
  error: string;
  /** Machine-readable reason, so the UI can decide what to offer next. */
  code: 'unknown-genre' | 'empty-genre' | 'upstream-unavailable' | 'not-found';
};

export type MemeResponse = Meme | MemeError;

export function isMemeError(value: MemeResponse): value is MemeError {
  return 'error' in value;
}
