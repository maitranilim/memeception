# Memeception

I made this to browse memes without digging through a feed. Pick a category, hit Gimme Meme, and save the ones you want to see again.

The live site is [memeception.vercel.app](https://memeception.vercel.app). Its files are in [`static-site/`](static-site). The Next.js app in `app/` is an older, separate build and is not what the live site serves.

## What it does

- Shows memes from meme-api.com. Each category uses a subreddit, with cursedcomments as a fallback when a request fails.
- Lets you switch between light and dark mode.
- Saves memes in your browser's local storage. The bookmark button opens them. Clearing site data also clears your saved memes.

If the meme API or an image host is down, a meme might not load.

## Run it locally

Serve `static-site/` with a local web server. There is no build step for the live site.

Vercel deploys `static-site/` from this repo's `main` branch to [memeception.vercel.app](https://memeception.vercel.app).

Made by [Confid](https://x.com/confid_sh).
