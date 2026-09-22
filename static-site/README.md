# Static Memeception site

This is the reviewed copy of the site served at https://memeception.vercel.app,
retrieved on 2026-09-23. That deployment differs from the Next.js app in this
repository. This directory preserves its design with the requested fixes.

- Removed cursor-driven viewer tilt and the Three.js polygon background.
- Removed polygon callbacks from theme and fetch controls.
- Fixed genre-pill clipping during horizontal scrolling.
- Added a confid footer link to https://x.com/confid_sh.

Serve this directory with a static HTTP server; no build step is needed.
Merging this directory does not change the root Next.js app or automatically
update the live deployment. Deploy this directory explicitly, or copy these
three assets into the actual static deployment source once located.

Verified in Chromium with mocked meme API/image responses: stationary card at
1280px, 541px and 390px; genre scrolling at start/middle/end; theme and fetch
controls; saving, reopening and deleting favorites across reloads; footer link;
no JavaScript errors. Live API availability was not tested in these checks.
