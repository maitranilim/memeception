# Memeception v3: what changed and how to ship it

This is my plan for the next version of Memeception. It covers what's wrong with the current site, what v3 does differently, and how to get it on Vercel without breaking the live site.

- **Branch:** `feature/memeception-v3`
- **Files changed:** only `static-site/` (the folder Vercel serves), plus the READMEs and this file
- **Stack:** still plain HTML, CSS and JavaScript. No build step, no packages.

---

## 1. Rules so the live site stays safe

- All v3 work stays on `feature/memeception-v3`. Nothing gets committed straight to `main`.
- Vercel builds the live site from `main` only. Every other branch gets its own preview link, so pushing this branch doesn't touch memeception.vercel.app.
- I don't touch the old Next.js app (`app/`, `components/`, `lib/`, `package.json`). The live site doesn't use it.
- I don't add a `vercel.json`, and I don't change the Vercel project's **Root Directory** (`static-site`) or its **Production Branch** (`main`). Those two settings are what keep the live site on `main`.
- I never click **Promote to Production** on a preview and never run `vercel --prod` from this branch.
- v3 goes live only through a pull request into `main`, after I've gone through the checklist in section 5.
- v3 keeps the same storage keys (`savedMemes` and `theme`), so people keep their saved memes and theme.

---

## 2. The current site: what works and what doesn't

### What works (keeping it)

- **The 3D keycap buttons.** Pressing them feels physical. It's the most "Memeception" thing about the site, so v3 builds its whole look around them.
- **The Meme*ception* logo.** Short and a clear pun. In v3, "ception" becomes a colored sticker.
- **Simple.** One accent color, one font, nothing fighting the meme.
- **No build step.** It deploys in seconds.
- **No sign-up.** Pick a category and go.

### What doesn't work

- **On phones, the main button is off-screen.** The 8 category buttons take 4 rows, so "Gimme Meme" gets pushed below the bottom of a 390px-wide phone screen.
- **Scrolling shows the FAQ, not memes.** People scroll by habit on meme sites, and here they hit the FAQ. That's the biggest reason people stop browsing.
- **Picking a category doesn't load anything.** You tap the category, then you still have to press Gimme Meme.
- **A spinner before every meme.** Each meme is fetched one at a time, so there's always a wait.
- **It looks like a dashboard.** Grey, white and blue is too plain for memes.
- **The shadows don't match.** Buttons have hard shadows, the card has a soft blurry one, and the image has two frames around it.
- **Useful info is thrown away.** The API sends the meme's title, upvotes and NSFW flag, and the site shows none of them. The title is often the punchline.
- **Lots of empty space on desktop.** About 340px of empty background on each side of a 1366px screen.
- **No going back.** Once you move on, that meme is gone.

### Bugs I found

1. **The Dark category is broken.** r/darkmemes is now private, so the site quietly shows r/cursedcomments instead.
2. **NSFW posts show unblurred.** r/cursedcomments returned 4 NSFW posts out of 18, and the site ignores the NSFW flag.
3. **Security risk.** Meme data from the API goes straight into the page's HTML, so bad data could run code on the page.
4. **Hard to use with a keyboard or screen reader.** The category buttons aren't real buttons, the 💾 button has no label, and the saved drawer can't be closed with Esc.
5. **`alert('Saved already!')`** freezes the page until you close it.
6. **Dark mode flashes white** when the page loads, and the site ignores your device's dark mode setting.
7. **Saved memes lose their credit.** Opening one just says "Saved Meme" instead of showing the subreddit and author.

---

## 3. What v3 looks like

### The look: "sticker deck"

I kept the keycap buttons and built everything else to match: thick dark outlines, hard shadows, a warm paper-colored background, and a bold font for headings (Bricolage Grotesque, with Inter for everything else).

**Every category has its own color.** When you switch categories, the whole site recolors: the logo sticker, the buttons, the subreddit tag, even the browser bar on Android.

| Category | Color |
| --- | --- |
| Dank | `#ff7a45` orange |
| Tech | `#4ade80` green |
| Wholesome | `#f9a8d4` pink |
| Relatable | `#38bdf8` blue |
| Dark | `#a78bfa` purple |
| Puns | `#facc15` yellow |
| Sarcasm | `#2dd4bf` teal |
| Cringe | `#fb7185` red |
| Mix | `#d9f99d` lime |

All of these are light enough to put dark text on top, so they work in both light and dark mode. I never use them as text color on the light background, because yellow on cream is unreadable.

### Scrolling is the main feature

**Scrolling moves you to the next meme.** Each scroll, swipe or J press snaps to exactly one meme.

Here's what you see as you scroll:

1. **The next meme peeking out.** Each meme is slightly shorter than the screen, so you can always see the top of the next one below it. That's enough to make you want to scroll again.
2. **The meme's details sliding in.** When a meme settles, the subreddit, author and upvotes fade in first, then the title, then the buttons. Memes that aren't in focus shrink a little and fade.
3. **Your depth going up.** A "Depth" counter at the top counts every meme you've seen. At 10, 25, 50, 100 and 200 a little message pops up. It's the Inception joke: you keep going deeper.
4. **What's coming next.** On desktop, an "Up next" column shows the next 3 memes. Click one to jump to it.
5. **No end.** New memes load before you reach the bottom. The FAQ moved into the ⓘ button.

How it fits different screens:

- **Phones:** logo and buttons at the top, one scrollable row of categories, and the meme filling the rest, with Save / Share / Full / Reddit buttons under it.
- **Tablets and small laptops:** same, but the buttons sit in a column to the right of the meme.
- **Desktop (1120px and up):** categories in a sidebar on the left (with 1–9 key hints), memes in the middle, "Up next" on the right. Scrolling over the sidebars still scrolls the memes.

### Features, most important first

1. **No waiting.** Each category loads 25 memes in one go (`/gimme/{sub}/25`), and images load before you scroll to them. The site keeps a stock of memes and refills it in the background.
2. **Scroll feed** (see above).
3. **Categories load right away when you tap them.** The link updates too (`#tech`, `#wholesome`…), so you can share or bookmark a category. Going back to a category you already opened is instant.
4. **Double-tap to save.** A bookmark pops up on the meme and your phone buzzes a little. Tap once to see it full size. The Save button and the S key also work. Removing a saved meme shows an Undo button.
5. **Full-size view.** Tall memes scroll. It shows the title, subreddit, author and upvotes, with Save and Open on Reddit. Tap, press Esc, or tap outside to close.
6. **Title and upvotes on every meme.** Long titles show 2 lines. Tap to see the rest.
7. **Safe mode, on by default.** It hides NSFW posts. With it off, they show up blurred until you tap. Spoilers are always blurred. The setting is under ⓘ.
8. **Backup subreddits.** Each category has a list of subreddits to try. Dark tries r/darkmemes first, then r/cursedcomments, so it goes back to normal if r/darkmemes reopens. There's also a new **Mix** category with random memes.
9. **Blurred background.** Behind each meme there's a blurry, colorful copy of it, so the empty space around the meme picks up the meme's own colors. It uses the small preview image, so it's cheap to load.
10. **Share.** On phones it opens the normal share menu. On desktop it copies the Reddit link.
11. **Saved memes.** A panel that slides up on phones and in from the right on desktop. Thumbnails, an × to remove (with Undo), and an **Export** button that downloads your saved list as a file. Memes saved on the current site show up here too.
12. **Keyboard shortcuts:** J/↓/Space next, K/↑ back, S save, F full size, O open on Reddit, 1–9 categories, B saved, T theme, ? help, Esc close. Hidden on phones.
13. **Theme without the flash.** The theme is set before the page draws. It follows your device by default, and you can pick System, Light or Dark under ⓘ.
14. **First-visit hint.** A small bubble that says "Scroll for the next meme · double-tap to save". It goes away after your first scroll and only shows once.
15. **Small pop-up messages** for saves, Undo, copied links and depth milestones.
16. **Handles problems gracefully.**
    - Images far off-screen get unloaded so the page stays light and GIFs stop playing.
    - A meme whose image won't load gets removed before you reach it. If it's already on screen, you get a "Skip it" button.
    - If a category can't load, you see "The meme well is dry" with a Try again button. It also retries when your internet comes back.
    - You don't see the same meme twice in one visit.
    - It still works in private mode or when the browser blocks storage.
    - Data from the API is always added as plain text, never as HTML, which fixes the security bug.
17. **Accessible.** Real buttons everywhere, labels on icon buttons, visible focus outlines, Esc closes panels, and all animations turn off if your device is set to reduce motion.

### Files changed

- `static-site/index.html`: rewritten. Top bar, categories, meme feed, "Up next", the saved / full-size / info panels, and a template for each meme card. **The AdSense tag is exactly the same as before.** Also added social preview tags and a favicon.
- `static-site/style.css`: rewritten for the new look, the scroll feed and the three screen sizes.
- `static-site/script.js`: rewritten. Around 780 lines, still no libraries.
- `README.md`, `static-site/README.md`, `inst.md`: updated docs.

Nothing else in the repo changes.

### Things it can't do (yet)

- **No download button.** Reddit's image server blocks downloads from other sites, so the Full button opens the big version instead, and you can long-press or right-click to save it.
- **Share links go to Reddit.** meme-api can't look up one specific meme, so I can't make a memeception.vercel.app link for a single meme yet.
- **Ads.** If AdSense auto ads are on, I need to check the preview and make sure no ad covers the top bar or the meme buttons.

---

## 4. How to put it on Vercel

### Check two settings first (just look, don't change)

In Vercel, open the **memeception** project, then **Settings**:

- **Build and Deployment → Root Directory** should be `static-site`.
- **Environments → Production → Branch Tracking** should be `main`. (On older dashboards it's under Settings → Git → Production Branch.)

If both are right, pushing any other branch creates a preview and the live site stays the same.

### Push the branch

```bash
git push -u origin feature/memeception-v3
```

Vercel builds a **Preview** within a few seconds. The link shows up in Vercel under Deployments, and on GitHub next to the commit. There's also a link that always shows the newest version of this branch, which looks like `memeception-git-feature-memeception-v3-<team>.vercel.app`.

**If people see a Vercel login page** when they open the preview, preview protection is on. Turn it off under Settings → Deployment Protection → Vercel Authentication, or use the option below.

### Optional: a permanent link like memeception-v3.vercel.app

This uses the same repo, so there's still only one codebase.

1. In Vercel, click **Add New → Project** and import `maitranilim/memeception` again.
2. Name it `memeception-v3`, set Root Directory to `static-site`, set Framework to **Other**, and leave the build command empty.
3. After it's created, go to Settings → Environments → Production → Branch Tracking and set it to `feature/memeception-v3`.
4. Redeploy. Now `memeception-v3.vercel.app` shows the branch, and `memeception.vercel.app` still shows `main`.

### Test it locally

```bash
cd static-site
python -m http.server 8080
```

Then open http://localhost:8080.

---

## 5. Checklist before merging

- [ ] The first meme shows up fast, and each scroll (or J) moves exactly one meme.
- [ ] The Depth counter goes up, and a message shows at 10.
- [ ] Every category loads when tapped, the colors change, and the link changes. Opening `/#tech` goes straight to Tech.
- [ ] Dark shows r/cursedcomments with no NSFW posts while Safe mode is on. With Safe mode off, NSFW posts are blurred.
- [ ] Double-tap saves. A single tap opens full size, and Esc closes it.
- [ ] Removing a saved meme and pressing Undo brings it back. Export downloads a file.
- [ ] Memes saved on the live site show up in v3. (This only works on the same address, so check it on the permanent link or after merging.)
- [ ] Dark mode doesn't flash white on reload.
- [ ] With the internet off, the "meme well is dry" message shows, and Try again works when it's back on.
- [ ] Everything works with only a keyboard.
- [ ] No red errors in the browser console. Ad blocker errors about AdSense are fine.

## 6. Going live and undoing it

- **To go live:** open a pull request from `feature/memeception-v3` into `main`, check the preview one last time, and merge.
- **To undo:** in Vercel, go to Deployments, find the last v2 deployment and click **Instant Rollback**. Then revert the merge on `main` so the code matches the site.
- I don't have to merge at all. The branch and its preview can stay up for as long as I want.

## 7. Ideas for later

1. **Links to single memes:** a small Vercel function so a shared link shows the meme itself on X or WhatsApp.
2. **Download button:** a small Vercel function that downloads Reddit images for you. It should only allow Reddit image links.
3. **Install as an app:** a manifest and service worker so people can add it to their home screen.
4. **Daily streak:** count days in a row next to Depth.
5. **Smoother category switching:** fade from the old category into the new one.
