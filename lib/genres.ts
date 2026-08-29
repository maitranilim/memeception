export type Genre = {
  /** Subreddit name, and the value used in the `genre` query parameter. */
  id: string;
  label: string;
  description: string;
};

/**
 * The allow-list of subreddits this app will proxy.
 *
 * This is a security boundary, not just UI data: `genre` arrives from user
 * input (query string, shared links) and is interpolated into an upstream
 * URL. Without the allow-list the API route is an open Reddit proxy.
 */
export const GENRES = [
  {
    id: 'memes',
    label: 'Classic',
    description: 'The mainstream front page of memes',
  },
  {
    id: 'ProgrammerHumor',
    label: 'Programming',
    description: 'Jokes that only compile for developers',
  },
  {
    id: 'wholesomememes',
    label: 'Wholesome',
    description: 'Kind, gentle, reliably uplifting',
  },
  {
    id: 'me_irl',
    label: 'Me IRL',
    description: 'Uncomfortably accurate self-portraits',
  },
  {
    id: 'dankmemes',
    label: 'Dank',
    description: 'Layered, chaotic, extremely online',
  },
  {
    id: 'AdviceAnimals',
    label: 'Advice Animals',
    description: 'Impact font on an animal, as intended',
  },
] as const satisfies readonly Genre[];

export type GenreId = (typeof GENRES)[number]['id'];

export const DEFAULT_GENRE: GenreId = 'memes';

const GENRE_IDS = new Set<string>(GENRES.map((genre) => genre.id));

export function isGenreId(value: string): value is GenreId {
  return GENRE_IDS.has(value);
}

export function getGenre(id: string): Genre | undefined {
  return GENRES.find((genre) => genre.id === id);
}

export function genreLabel(id: string): string {
  return getGenre(id)?.label ?? id;
}
