# Experience direction

## What the current theme gets right

The light background keeps the page easy to read, and the blue accent gives the selected category and primary action a clear home. Dark mode uses the same blue, so the site still feels like itself after the switch. Rounded buttons and cards make the interface approachable.

## Where the old flow fell short

The categories were at the top, but the page gave little clue about what to do next. The meme and the main action competed for attention, saved memes were hidden in a drawer, and scrolling below the viewer led straight to an FAQ. There was no way to go back, share from the viewer, or let memes advance hands-free. On a phone, a wide row of categories also asked people to scroll sideways just to change the mood.

## What this branch changes

The page now has a simple path: choose a mood, look at one meme, then scroll to your keepers. Categories stay visible in a compact grid. The viewer has one clear next action, with a separate surprise option, previous-meme control, save and share actions, and optional auto-play. A four-item saved preview sits below the viewer; the full collection opens from the top bar. The small three-step guide and scroll cue make the page's flow easier to discover.

The existing blue accent, light and dark palettes, rounded cards, and Confid credit stay recognizable. New pale pink and lime panels add contrast around secondary information, while keeping blue for selection and action.

## Interaction details

- Space or the right arrow loads another meme. The left arrow revisits the current session history. S saves or removes the current meme. D changes theme. Escape closes the saved drawer.
- Surprise me chooses a different category as well as a meme.
- Auto-play advances every nine seconds and pauses when the tab is hidden.
- Save, share, source links, and the saved drawer remain usable by keyboard.
- Reduced-motion preferences are respected.
- Fetches have a timeout, stale category requests are discarded, and image failures receive a clear fallback.

## Known limit

Memeception depends on meme-api.com and the image hosts it returns. The site can explain a fetch failure, but it cannot make an upstream outage disappear. Saved memes are local to the browser and do not sync between devices.
