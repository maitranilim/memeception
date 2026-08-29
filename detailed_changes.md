# Detailed changes

A record of the rework on branch `claude/portfolio-professionalization-pwd3wg`.

**Goal:** strip the decorative animation and hover effects, and add interaction
that holds up to a technical read.

**Scale:** 35 files, +9,121 / −326 lines (6,899 of the additions are
`package-lock.json`).

---

## 1. The blocking problem

The project did not run.

There was no `package.json`, no Tailwind installation, no PostCSS config, no
`_app.js`, and no stylesheet. `pages/index.js` was 182 lines of Tailwind utility
classes with nothing to compile them — every class was inert markup. Cloning the
repo and running `npm install` produced an error, not a website.

Two related inconsistencies:

- `next.config.js` configured `images.domains` for `next/image`, but the code
  used a plain `<img>`. The config was dead.
- The README advertised "CSS variables + local storage for persistent theme
  preferences". `pages/index.js:47-49` was a `useState` toggle that persisted
  nothing, and there were no CSS variables.

Everything below is secondary to this. Visual polish does not survive a reader
who cannot start the app.

---

## 2. Stack

Migrated from the Pages Router to the current default Next.js stack.

| | Before | After |
| --- | --- | --- |
| Router | Pages (`pages/`) | App (`app/`) |
| Language | JavaScript | TypeScript, `strict` + `noUncheckedIndexedAccess` |
| Next.js | none installed | 16.3.3 |
| React | none installed | 19.2.8 |
| Tailwind | classes only, never installed | 4.3.3, CSS-first config |
| Icons | emoji | `lucide-react` 1.35.0 |
| Lint | none | `eslint-config-next` flat config |

Also added: `.gitignore`, `LICENSE` (the README claimed MIT with no licence
file), `app/icon.svg` as a real favicon, and `npm run lint` / `npm run typecheck`
scripts.

### A note on two version choices

- **TypeScript 5.9, not 7.0.** 7.0.2 is the current `latest` tag, but
  `eslint-config-next@16.3.3` resolves `typescript-eslint` against 5.x. Pinned to
  the version the toolchain actually supports.
- **ESLint 9, not 10.** Installing ESLint 10 produced `ERESOLVE` peer warnings
  against `typescript-eslint@8.68`. A deprecation notice on install is cosmetic;
  a lint command that cannot run is not.

---

## 3. The professionalization pass

All nine items, with their original locations.

| # | Was | Now |
| --- | --- | --- |
| 1 | `index.js:63` — headline in `bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent` | Solid foreground, `font-semibold tracking-tight` |
| 2 | `index.js:170` — CTA with `hover:scale-105`, `transform`, gradient fill, `transition-all` | Flat accent fill; hover darkens the background only |
| 3 | `index.js:113` — `animate-spin` on a 🌀 emoji | Skeleton card locked to the image's aspect ratio |
| 4 | `index.js:51` — `transition-colors duration-300` on the page root | Removed; the theme flips instantly |
| 5 | `index.js:68,82,93,146` — `transition-all` | Scoped to `color, background-color, border-color, opacity` at 120ms |
| 6 | `index.js:108` — `shadow-2xl` | 1px border, no shadow |
| 7 | Throughout — 🧠 ☀️ 🌙 🔞 👤 📍 ⬆️ 🎲 ☕ 😂 as interface chrome | Lucide SVG icons with `aria-hidden` and `sr-only` labels |
| 8 | `api/meme.js:29,45` — "The meme machine broke. Try turning it off and on again. 🔧" | "Reddit is not responding. Try again in a moment." |
| 9 | `index.js:172` — "🎲 Gimme Another Meme!" | "Next meme" |

### Theming

The seven `theme === 'dark' ? … : …` ternaries scattered through the JSX are
gone. Colours resolve through CSS custom properties on `:root` and
`[data-theme]`, mapped into Tailwind utilities via `@theme inline`. A theme is
now a set of values in one place rather than a conditional in every component.

Also added in `app/globals.css`:

- A `prefers-reduced-motion` block that collapses the one remaining animation
  (the skeleton shimmer).
- `:focus-visible` outlines, which the original had none of.
- `color-scheme` per theme, so native form controls and scrollbars match.

---

## 4. Features

### Command palette — `components/command-palette.tsx`

`⌘K` / `Ctrl+K`. Searches every category and action, grouped, with arrow-key
navigation and `aria-activedescendant` wired to a listbox.

Matching falls back to a subsequence scan, so `pgh` finds *Programmer Humor*.

Mounted only while open, so each launch starts from a clean query and selection
without an effect to reset them.

### Keyboard shortcuts — `components/meme-reader.tsx`

| Key | Action |
| --- | --- |
| `Space` / `→` | Next meme |
| `S` | Save or unsave |
| `C` | Copy a share link |
| `F` | Toggle the saved tab |
| `D` | Toggle theme |
| `⌘K` / `Ctrl+K` | Command palette |
| `?` | Shortcut sheet |
| `Esc` | Close any overlay |

The handler ignores keystrokes while focus is in an input, textarea, select, or
`contenteditable`, and while a dialog is open.

### Saved memes — `lib/favorites-store.ts`, `components/favorites-panel.tsx`

Entirely client-side. No account, no backend, nothing leaves the browser.

- Backed by `localStorage`, capped at 200 entries.
- JSON export and import, where import merges by id rather than overwriting.
- Multiple open tabs stay in sync through the `storage` event.
- Every read and write is wrapped — private mode and blocked cookies degrade to
  an in-memory list rather than throwing.
- Parsed entries are validated before use; a corrupted key yields an empty list.

### Share permalinks — `app/m/[id]/`

`/m/<id>` is server-rendered, so a shared link arrives with the meme already in
the markup.

`opengraph-image.tsx` generates a 1200×630 card per meme through `next/og`,
which means a link pasted into Slack, iMessage, Discord or X unfurls with the
actual meme rather than a generic site card.

The share button uses `navigator.share` where available and falls back to the
clipboard with a toast.

### Perceived performance

- The next meme is fetched and its image preloaded while you look at the current
  one, so `Next` swaps instantly instead of showing a spinner.
- The image's real aspect ratio (from Reddit's `preview.images[0].source`) is
  reserved before it loads, so nothing on the page moves. The original `<img>`
  had no dimensions and shifted the layout on every load.
- An inline script in `app/layout.tsx` applies the stored or system theme before
  first paint, so there is no flash of the wrong theme.

---

## 5. Bugs fixed

### `params` is a Promise in metadata image routes

**This one would have shipped silently.** In Next 16, `params` in
`opengraph-image.tsx` is a Promise, and Next's generated route validator does
*not* type-check metadata image routes — only `page.tsx`. Reading `params.id`
synchronously returned `undefined`, the lookup failed, and the route rendered its
"no longer available" fallback while still returning HTTP 200.

Every share link would have unfurled the wrong card, with nothing in the build
output, the type checker, or the logs to indicate a problem. Caught by probing
the runtime shape rather than trusting the signature. Fixed by awaiting `params`.

### Open proxy in the API route

`api/meme.js:7` interpolated the `genre` query parameter straight into the Reddit
URL with no validation, making the deployment a free proxy for any subreddit.
`genre` is now checked against the allow-list in `lib/genres.ts` before any
request is made. `?genre=../../etc/passwd` returns 400.

### Missing User-Agent

Reddit throttles and 403s anonymous requests from datacenter IPs. The original
sent no `User-Agent`, which works on a laptop and fails once deployed to Vercel —
the worst failure mode, because it looks fine in development.

### Request race

`pages/index.js:42-44` refetched on `[genre, allowNsfw]` with no cancellation, so
switching category twice quickly could render the earlier response over the later
one. Requests now carry an `AbortController` and stale responses are discarded.

### React 19 correctness

Lint flagged five `react-hooks/set-state-in-effect` errors. These were real —
`setState` in an effect body causes cascading renders — and were fixed rather
than suppressed:

- `lib/use-theme.ts` and `lib/use-favorites.ts` now read external state through
  `useSyncExternalStore`, which is the sanctioned way to read browser-only state
  without a hydration mismatch.
- `components/command-palette.tsx` resets by remounting, and clamps the active
  index instead of correcting it in an effect.
- `components/meme-card.tsx` resets its error state via a `key` on the parent.

---

## 6. Scope decisions

Recording these so the diff does not contain unexplained surprises.

### Included although not selected

Three items from the "correctness fixes" option that was not chosen. All three
sit in files that were being rewritten anyway, and shipping the new code without
them would have meant knowingly writing broken code:

- **Genre allow-list.** Share links accept `genre` from a URL, so the new routes
  take untrusted input by design. Leaving the open proxy in place would have
  widened it.
- **User-Agent and timeout.** Without these the app fails specifically in
  production.
- **AbortController.** The prefetch path makes concurrent requests routine rather
  than incidental.

Each is small and independently removable.

### Declined, and still recommended

- **The NSFW toggle stayed.** Restyled per item 7, but kept. It remains a
  liability on a link sent to a recruiter.
- **No tests or CI.** There is no automated regression net. The verification in
  section 8 was performed once, by hand, and is not repeatable in CI.

### Judgment calls

- **Plain `<img>`, not `next/image`.** Sources are arbitrary user-submitted
  hosts. Routing them through the image optimizer would proxy unbounded
  third-party traffic through the deployment and inflate the bill. Documented at
  the call site so it does not read as an oversight.
- **`AGENTS.md` / `CLAUDE.md` gitignored.** Written by `next dev`, not project
  code.

---

## 7. File map

```
app/
  layout.tsx                    Metadata, viewport, pre-paint theme script
  page.tsx                      Home
  globals.css                   Design tokens, base layer, skeleton utility
  not-found.tsx                 404
  icon.svg                      Favicon
  api/meme/route.ts             Input validation, upstream call, error shaping
  m/[id]/page.tsx               Server-rendered share permalink
  m/[id]/opengraph-image.tsx    Per-meme OG card

components/
  meme-reader.tsx     (492)     Page state, data fetching, keyboard handling
  command-palette.tsx (217)     ⌘K palette
  favorites-panel.tsx (132)     Saved tab
  meme-card.tsx       (122)     Image, metadata, actions
  shortcuts-dialog.tsx (86)     ? overlay
  toast.tsx            (39)     Transient status messages

lib/
  favorites-store.ts  (135)     localStorage store for useSyncExternalStore
  reddit.ts           (123)     Upstream client: UA, timeout, cache, shaping
  genres.ts            (64)     Subreddit allow-list — a security boundary
  use-theme.ts         (64)     Theme via useSyncExternalStore
  use-favorites.ts     (36)     Thin hook over favorites-store
  types.ts             (24)     Meme, MemeError, isMemeError guard
  ui.ts                (15)     Shared control classes
  cn.ts                 (4)     Class joiner
```

---

## 8. Verification

`npm run lint`, `npm run typecheck`, and `npm run build` all pass clean from a
removed `.next`.

Thirteen assertions driven through Chromium against the **production** build
(`npm start`), not just dev:

| Check | Result |
| --- | --- |
| Home renders a meme card | pass |
| Honours `prefers-color-scheme: dark` | pass |
| `D` flips dark → light | pass |
| Theme choice persists to `localStorage` | pass |
| `Space` advances with no spinner gap | pass |
| `S` saves and toasts | pass |
| Saved tab lists the saved meme | pass |
| Favourites survive a reload | pass |
| Palette matches `prog` → Programming | pass |
| Palette `Enter` switches category | pass |
| `?` opens the shortcuts overlay | pass |
| Upstream failure shows a plain error with retry | pass |
| Primary button has no `transform`, no `transition-all` | pass (computed style) |
| No console errors | pass |

Checked directly over HTTP:

- `?genre=../../etc/passwd` → `400`
- `?genre=aww` (real subreddit, not allow-listed) → `400`
- Unreachable upstream → `502` with plain copy, not a stack trace
- `/m/<unknown>` → `404`, not `500`
- `/m/<id>/opengraph-image` → `200`, `image/png`, and the card renders with the
  image, title, subreddit and score
- `/m/<id>` emits `og:image`, `og:title`, `twitter:card`, and the meme title in
  the server-rendered body

### What was not verified

**Live Reddit calls were never exercised.** The sandbox this work was done in
blocks egress to `reddit.com` at the proxy. Every code path *around* the upstream
call was tested with a stubbed response, but the real request, its JSON shape,
and the image-filtering logic against live data have not run.

Run `npm run dev` locally to confirm. If it works locally and 403s once deployed,
the `User-Agent` header in `lib/reddit.ts` is the reason it will not.

---

## 9. Known limitations

- **`components/meme-reader.tsx` is 492 lines** and owns fetching, prefetching,
  keyboard handling, sharing, and layout. It is the obvious next refactor —
  fetch and prefetch belong in a hook.
- **No tests.** Nothing in section 8 is repeatable in CI.
- **`lib/reddit.ts` is bound to Reddit.** A `lib/sources/` interface with a
  fallback provider would make the app resilient to Reddit blocking the
  deployment, which is a live risk rather than a hypothetical one.
- **In-memory cache only.** `next: { revalidate: 300 }` is per-instance; a
  serverless deployment gets no shared cache between cold starts.
- **`NEXT_PUBLIC_SITE_URL` must be set** on the deployment, or OpenGraph URLs
  resolve against `http://localhost:3000` and share cards break.
