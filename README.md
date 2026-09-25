# Memeception

I made this because I wanted memes without scrolling through a whole feed. Pick a category, hit **Gimme Meme**, and save the ones you want to look at again.

Live at [memeception.vercel.app](https://memeception.vercel.app).

## What it does

- pulls memes from meme-api.com. Each category is a subreddit, and if a request fails it falls back to cursedcomments
- light and dark mode, and it remembers which one you picked
- saves memes in your browser's local storage. Open them with the bookmark button up top. Clearing site data wipes them, so heads up
- shows a one-time 18+ notice, since it's public Reddit content and some of it gets spicy

Sometimes a meme won't load because the API or an image host is down. Just hit the button again.

## What's in the repo

There are two versions in here:

- **`static-site/`** is the live site. It's plain HTML, CSS and JS with no build step. Vercel deploys this folder from `main`.
- **`app/`, `components/`, `lib/`** is a Next.js + TypeScript version I built separately. It has a ⌘K command palette, keyboard shortcuts, share links with preview cards, and JSON export/import for saved memes. It isn't what the live site serves right now.

## Run it locally

Live site:

```bash
npx serve static-site
```

Any static server works.

Next.js version:

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run lint` and `npm run typecheck` are there too. Set `NEXT_PUBLIC_SITE_URL` when you deploy it, or the share previews will point at localhost.

## License

MIT. See [LICENSE](LICENSE).

---

Made by [maitranilim](https://github.com/maitranilim), aka [Confid](https://x.com/confid_sh) on X.
