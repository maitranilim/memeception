# Site files

This folder is the whole site: `index.html`, `style.css` and `script.js`. No build step and no packages.

Vercel uses this folder as the project root. `main` goes to memeception.vercel.app, and every other branch gets its own preview link.

Memes come from meme-api.com. Saved memes, the theme and the Safe mode setting are kept in your browser's local storage.

To run it locally, serve this folder with any web server, for example `python -m http.server 8080`.
