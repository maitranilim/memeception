# Memeception

I made this to browse memes without digging through a feed. Pick a category, scroll, and save the ones you want to see again.

The live site is [memeception.vercel.app](https://memeception.vercel.app). Its files are in [`static-site/`](static-site). The Next.js app in `app/` is an older, separate build and is not what the live site serves.

## This branch: v3

`feature/memeception-v3` is the next version of the site. It lives in this same repo, so there's only one project to maintain. `main` stays exactly as it is until I merge.

What's new in v3:

- **Scroll to get the next meme.** No more pressing a button every time. Each scroll snaps to one meme, and you can see the top of the next one waiting below.
- **No loading between memes.** The site grabs 25 memes at a time and loads the images before you get to them.
- **Tap a category and it loads right away.** Each category has its own color, and the whole site switches to it.
- **Double-tap to save.** Tap once to see the meme full size. Removing a saved meme has an Undo.
- **Titles and upvotes** show on every meme.
- **Safe mode** is on by default. It hides NSFW posts. If you turn it off, they show up blurred until you tap them.
- **Depth counter.** It counts how many memes you've gone through.
- **Keyboard shortcuts** on desktop: J/K to move, S to save, 1–9 for categories, ? for the full list.
- **Dark category fixed.** r/darkmemes went private, so Dark now falls back to r/cursedcomments on purpose.

Saved memes and the theme you picked on the current site carry over to v3.

The full breakdown (what I kept, what I changed and why, and how to put it on Vercel) is in [`inst.md`](inst.md).

## What it does

- Shows memes from meme-api.com. Each category uses one or more subreddits.
- Lets you switch between light and dark mode. By default it follows your device.
- Saves memes in your browser's local storage. The bookmark button opens them, and Export downloads a copy. Clearing site data also clears your saved memes.

If the meme API or an image host is down, a meme might not load. The site tells you and gives you a Try again button.

## Run it locally

Serve `static-site/` with a local web server. There is no build step.

```bash
cd static-site
python -m http.server 8080
```

Then open http://localhost:8080.

Vercel deploys `static-site/` from this repo's `main` branch to [memeception.vercel.app](https://memeception.vercel.app). Any other branch gets its own preview link, so the live site doesn't change.

Made by [Confid](https://x.com/confid_sh).
