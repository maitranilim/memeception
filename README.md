# Memeception

A fast, keyboard-driven meme reader. Pick a category, hold Space, save the ones
worth keeping, and share a link that unfurls with the actual image.

Built with Next.js (App Router), React 19, TypeScript and Tailwind CSS v4.

## Features

**Keyboard first.** Every action has a shortcut, and `?` lists them.

| Key | Action |
| --- | --- |
| `Space` / `→` | Next meme |
| `S` | Save or unsave |
| `C` | Copy a share link |
| `F` | Toggle the saved tab |
| `D` | Toggle theme |
| `⌘K` / `Ctrl+K` | Command palette |
| `?` | Show all shortcuts |

**Command palette.** `⌘K` opens a searchable list of every category and action,
with subsequence matching — `pgh` finds *Programmer Humor*.

**Saved memes, no account.** Favourites are kept in `localStorage` and never
leave the browser. Export them to JSON and import them somewhere else. Open tabs
stay in sync through the `storage` event.

**Share links that preview.** Every meme has a permalink at `/m/<id>` rendered
on the server, with an OpenGraph image generated per meme, so a link pasted into
Slack, iMessage or Discord unfurls with the meme instead of a generic card.

**No layout shift.** The image's real aspect ratio is reserved before it loads,
and the next meme is prefetched while you look at the current one, so `Next` is
instant rather than a spinner.

**Theme without a flash.** An inline script applies the stored or system theme
before first paint; React reads it back through `useSyncExternalStore` rather
than keeping a second copy that could disagree during hydration.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Set `NEXT_PUBLIC_SITE_URL` to your deployed origin so OpenGraph URLs resolve
absolutely. It defaults to `http://localhost:3000`.

## How it works

```
app/
  api/meme/route.ts        Validates input, proxies Reddit, normalises the response
  m/[id]/page.tsx          Server-rendered share permalink
  m/[id]/opengraph-image.tsx  Per-meme OG card via next/og
  layout.tsx               Metadata and the pre-paint theme script
components/                Presentational components
lib/
  genres.ts                Subreddit allow-list (a security boundary, not just UI data)
  reddit.ts                Upstream client: timeouts, caching, response shaping
  favorites-store.ts       localStorage store exposed via useSyncExternalStore
```

The `genre` parameter arrives from user input and is interpolated into an
upstream URL, so it is checked against the allow-list in `lib/genres.ts` before
any request is made. Without that check the API route would be an open proxy for
arbitrary subreddits.

Images are rendered with a plain `<img>` rather than `next/image` on purpose:
sources are arbitrary user-submitted hosts, and routing them through the image
optimizer would proxy unbounded third-party traffic through the deployment.

## Design

Interaction feedback is limited to colour and opacity over 120ms. Nothing
scales, lifts, or animates its layout on hover. Colours resolve through CSS
custom properties on `:root` and `[data-theme]`, so a theme is a set of values
rather than a conditional in every component. `prefers-reduced-motion` is
honoured.

## Deployment

Deploy to any platform that runs Next.js. The API route and share pages are
server-rendered on demand; everything else is static.

## Licence

[MIT](LICENSE)
