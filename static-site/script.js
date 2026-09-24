/* ==========================================================================
   Memeception v3 — endless snap feed
   No build step, no dependencies. Data: https://meme-api.com
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */
  const API = 'https://meme-api.com/gimme';
  const BATCH = 25;               // memes per API call (API max is 50)
  const APPEND = 4;               // slides added per top-up
  const TOPUP_AT = 3;             // top up when this many slides are left below the active one
  const IMG_RE = /\.(jpe?g|png|gif|webp)$/i;

  // subs[] is tried in order; later entries are fallbacks if a subreddit goes private.
  const GENRES = [
    { slug: 'dank',      label: 'Dank',      subs: ['dankmemes'],                 accent: '#ff7a45' },
    { slug: 'tech',      label: 'Tech',      subs: ['ProgrammerHumor'],           accent: '#4ade80' },
    { slug: 'wholesome', label: 'Wholesome', subs: ['wholesomememes'],            accent: '#f9a8d4' },
    { slug: 'relatable', label: 'Relatable', subs: ['me_irl', 'meirl'],           accent: '#38bdf8' },
    { slug: 'dark',      label: 'Dark',      subs: ['darkmemes', 'cursedcomments'], accent: '#a78bfa' },
    { slug: 'puns',      label: 'Puns',      subs: ['puns'],                      accent: '#facc15' },
    { slug: 'sarcasm',   label: 'Sarcasm',   subs: ['sarcasm'],                   accent: '#2dd4bf' },
    { slug: 'cringe',    label: 'Cringe',    subs: ['cringememes'],               accent: '#fb7185' },
    { slug: 'mix',       label: 'Mix',       subs: [null],                        accent: '#d9f99d' }, // null = API's random pool
  ];
  const bySlug = Object.fromEntries(GENRES.map((g) => [g.slug, g]));

  const MILESTONES = {
    10: 'Depth 10. You are now inside a meme.',
    25: 'Depth 25. The memes are watching you back.',
    50: 'Depth 50. This is a meme about a meme about a meme.',
    100: 'Depth 100. Limbo. Hydrate.',
    200: 'Depth 200. There is no bottom.',
  };

  /* ------------------------------------------------------------------ */
  /* Storage (every access guarded: private mode can throw)             */
  /* ------------------------------------------------------------------ */
  // `area` defaults to localStorage, resolved inside try: with site data blocked,
  // merely touching window.localStorage throws.
  const store = {
    get(key, fallback, area) {
      try { const v = (area || window.localStorage).getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value, area) {
      try { (area || window.localStorage).setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    },
    raw(key, area) { try { return (area || window.localStorage).getItem(key); } catch { return null; } },
    setRaw(key, value, area) { try { (area || window.localStorage).setItem(key, value); } catch { /* ignore */ } },
  };
  const session = (() => { try { return window.sessionStorage; } catch { return { getItem: () => null, setItem() {} }; } })();

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const S = {
    genre: 'dank',
    gen: 0,                        // bumps on every category switch; stale async work checks it
    queues: new Map(),             // slug -> meme[] waiting to be shown
    inflight: new Map(),           // slug -> Promise
    subIdx: new Map(),             // slug -> index into subs[] that last worked
    known: new Set(store.get('mc_seen', [], session)), // urls shown or queued (dedupe)
    slides: [],                    // [{ el, meme }] in feed order
    active: -1,
    appending: false,
    depth: 0,
    saved: [],
    safe: store.get('mc_safe', true),
  };

  /* ------------------------------------------------------------------ */
  /* DOM                                                                 */
  /* ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = {
    feed: $('#feed'),
    genres: $('#genres'),
    tpl: $('#tpl-slide'),
    depth: $('#depth'),
    depthChip: $('#depth-chip'),
    savedBtn: $('#saved-btn'),
    savedCount: $('#saved-count'),
    savedSheet: $('#saved-sheet'),
    savedGrid: $('#saved-grid'),
    savedEmpty: $('#saved-empty'),
    savedTotal: $('#saved-total'),
    exportBtn: $('#export-btn'),
    themeBtn: $('#theme-btn'),
    infoBtn: $('#info-btn'),
    infoSheet: $('#info-sheet'),
    safeToggle: $('#safe-toggle'),
    lightbox: $('#lightbox'),
    lbScroll: $('#lb-scroll'),
    lbImg: $('#lb-img'),
    lbTitle: $('#lb-title'),
    lbMeta: $('#lb-meta'),
    lbSave: $('#lb-save'),
    lbOpen: $('#lb-open'),
    upnext: $('#upnext-list'),
    coach: $('#coach'),
    toasts: $('#toasts'),
    brand: $('#brand'),
    themeColor: document.querySelector('meta[name="theme-color"]'),
  };
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  const isHttps = (u) => typeof u === 'string' && /^https:\/\//i.test(u);
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
    : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n || 0));

  function normalize(m) {
    if (!m || !isHttps(m.url)) return null;
    const preview = Array.isArray(m.preview) ? m.preview.filter(isHttps) : [];
    return {
      id: String(m.id || (m.postLink || m.url).split('/').pop()),
      url: m.url,
      postLink: isHttps(m.postLink) ? m.postLink : m.url,
      subreddit: String(m.subreddit || 'memes'),
      author: String(m.author || 'unknown'),
      title: String(m.title || '').trim(),
      ups: Number(m.ups) || 0,
      nsfw: !!m.nsfw,
      spoiler: !!m.spoiler,
      thumb: m.thumb && isHttps(m.thumb) ? m.thumb : (preview[2] || preview[1] || preview[0] || m.url),
    };
  }

  function rememberSeen() {
    store.set('mc_seen', [...S.known].slice(-600), session);
  }

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */
  async function fetchBatch(slug) {
    const g = bySlug[slug];
    const start = S.subIdx.get(slug) || 0;
    for (let i = start; i < g.subs.length; i++) {
      const sub = g.subs[i];
      const url = sub ? `${API}/${encodeURIComponent(sub)}/${BATCH}` : `${API}/${BATCH}`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.memes)) throw new Error(data.message || res.status);
        S.subIdx.set(slug, i);
        return data.memes.map(normalize).filter(Boolean);
      } catch (err) {
        console.warn(`[memeception] ${sub || 'random'} failed:`, err.message || err);
      }
    }
    throw new Error('unavailable');
  }

  function queueOf(slug) {
    if (!S.queues.has(slug)) S.queues.set(slug, []);
    return S.queues.get(slug);
  }

  function accept(m) {
    return IMG_RE.test(m.url) && !S.known.has(m.url) && !(S.safe && m.nsfw);
  }

  /** Make sure the category has at least `min` memes queued. Deduped per category. */
  function ensureQueue(slug, min = 8) {
    const q = queueOf(slug);
    if (q.length >= min) return Promise.resolve();
    if (S.inflight.has(slug)) return S.inflight.get(slug);
    const p = (async () => {
      for (let attempt = 0; attempt < 3 && q.length < min; attempt++) {
        const batch = await fetchBatch(slug);
        for (const m of batch) {
          if (accept(m)) { q.push(m); S.known.add(m.url); }
        }
      }
      rememberSeen();
    })().finally(() => S.inflight.delete(slug));
    S.inflight.set(slug, p);
    return p;
  }

  /* ------------------------------------------------------------------ */
  /* Feed rendering                                                      */
  /* ------------------------------------------------------------------ */
  const nearIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = slideOf(e.target);
      if (!s) continue;
      if (e.isIntersecting) loadMedia(s); else unloadMedia(s);
    }
  }, { root: el.feed, rootMargin: '200% 0px' });

  const activeIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const i = S.slides.findIndex((s) => s.el === e.target);
        if (i !== -1) setActive(i);
      }
    }
  }, { root: el.feed, threshold: 0.6 });

  const slideOf = (node) => S.slides.find((s) => s.el === node);

  function buildSlide(meme) {
    const frag = el.tpl.content.cloneNode(true);
    const art = frag.querySelector('.slide');
    art.setAttribute('aria-label', meme.title || `Meme from r/${meme.subreddit}`);

    const sub = art.querySelector('.sub');
    sub.textContent = `r/${meme.subreddit}`;
    sub.href = `https://www.reddit.com/r/${encodeURIComponent(meme.subreddit)}/`;
    art.querySelector('.author').textContent = `u/${meme.author}`;
    art.querySelector('.ups b').textContent = fmt(meme.ups);
    art.querySelector('.ups').setAttribute('aria-label', `${meme.ups} upvotes`);

    const title = art.querySelector('.title');
    title.textContent = meme.title || '(untitled)';
    title.addEventListener('click', () => title.classList.toggle('open'));

    const img = art.querySelector('.img');
    img.alt = meme.title ? `Meme: ${meme.title}` : 'Meme';

    const media = art.querySelector('.media');
    if (meme.nsfw || meme.spoiler) {
      media.classList.add('veiled');
      const veil = art.querySelector('.veil');
      veil.hidden = false;
      const btn = veil.querySelector('button');
      btn.textContent = meme.nsfw ? 'NSFW · tap to reveal' : 'Spoiler · tap to reveal';
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        media.classList.remove('veiled');
        veil.hidden = true;
      });
    }
    wireMediaTaps(media, meme);

    art.querySelector('.skip-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      go(1);
    });

    const saveBtn = art.querySelector('.act.save');
    saveBtn.dataset.url = meme.url;
    saveBtn.addEventListener('click', () => toggleSave(meme));
    art.querySelector('.act.share').addEventListener('click', () => share(meme));
    art.querySelector('.act.full').addEventListener('click', () => openLightbox(meme));
    art.querySelector('.act.open').href = meme.postLink;
    syncSaveButton(saveBtn, isSaved(meme.url));

    return art;
  }

  function loadMedia(s) {
    const media = s.el.querySelector('.media');
    const img = s.el.querySelector('.img');
    const amb = s.el.querySelector('.ambient');
    if (!img || img.getAttribute('src')) return;
    img.onload = () => { img.classList.add('loaded'); media.classList.add('has-img'); };
    img.onerror = () => onBroken(s);
    img.src = s.meme.url;
    amb.src = s.meme.thumb;
  }

  function unloadMedia(s) {
    // Frees memory and stops far-away GIFs. Slides have fixed height, so nothing shifts.
    const img = s.el.querySelector('.img');
    const amb = s.el.querySelector('.ambient');
    if (!img || !img.getAttribute('src') || s.el.querySelector('.broken:not([hidden])')) return;
    img.onload = img.onerror = null;
    img.removeAttribute('src');
    amb.removeAttribute('src');
    img.classList.remove('loaded');
    s.el.querySelector('.media').classList.remove('has-img');
  }

  function onBroken(s) {
    const i = S.slides.indexOf(s);
    if (i > S.active + 1) {
      // Not on screen yet: quietly drop it so the user never meets a dead card.
      removeSlide(s);
      topUp();
      return;
    }
    const media = s.el.querySelector('.media');
    media.classList.add('has-img');
    s.el.querySelector('.broken').hidden = false;
  }

  function removeSlide(s) {
    nearIO.unobserve(s.el);
    activeIO.unobserve(s.el);
    s.el.remove();
    S.slides.splice(S.slides.indexOf(s), 1);
    renderUpNext();
  }

  function addSlides(memes) {
    const frag = document.createDocumentFragment();
    for (const meme of memes) {
      const node = buildSlide(meme);
      const s = { el: node, meme };
      S.slides.push(s);
      frag.appendChild(node);
    }
    el.feed.appendChild(frag);
    for (const s of S.slides.slice(-memes.length)) { nearIO.observe(s.el); activeIO.observe(s.el); }
    renderUpNext();
  }

  function messageSlide(kind, heading, text, actionLabel, action) {
    const art = document.createElement('article');
    art.className = `slide ${kind}`;
    const card = document.createElement('div');
    card.className = 'card';
    if (kind === 'skeleton') {
      card.innerHTML = '<div class="bar w40"></div><div class="bar w75"></div><div class="media"></div><div class="actions"></div>';
    } else {
      const h = document.createElement('h2'); h.textContent = heading;
      const p = document.createElement('p'); p.textContent = text;
      card.append(h, p);
      if (actionLabel) {
        const b = document.createElement('button');
        b.className = 'key';
        b.innerHTML = '<svg class="icon"><use href="#i-refresh"/></svg>';
        b.append(document.createTextNode(actionLabel));
        b.addEventListener('click', action);
        card.append(b);
      }
    }
    art.append(card);
    return art;
  }

  /** Move memes from the queue into the feed. Safe to call often. */
  async function topUp() {
    if (S.appending) return;
    S.appending = true;
    const gen = S.gen;
    const slug = S.genre;
    let skel = null;
    if (!S.slides.length && !el.feed.querySelector('.skeleton')) {
      skel = messageSlide('skeleton');
      el.feed.appendChild(skel);
    }
    try {
      const q = queueOf(slug);
      if (q.length < APPEND) {
        try { await ensureQueue(slug, APPEND); } catch { /* handled below */ }
      }
      if (gen !== S.gen) return;
      const take = q.splice(0, APPEND);
      el.feed.querySelectorAll('.skeleton, .message').forEach((n) => n.remove());
      if (take.length) {
        addSlides(take);
        rememberSeen();
      } else {
        const g = bySlug[slug];
        el.feed.appendChild(messageSlide('message',
          'The meme well is dry',
          `Couldn't reach ${g.label} memes right now. The source may be rate-limiting or down.`,
          'Try again',
          () => { el.feed.querySelectorAll('.message').forEach((n) => n.remove()); topUp(); }));
      }
    } finally {
      if (skel && skel.isConnected && gen !== S.gen) skel.remove();
      S.appending = false;
    }
    // Keep a warm queue so the next top-up is instant.
    ensureQueue(slug).catch(() => {});
    if (gen === S.gen && S.slides.length - 1 - S.active < TOPUP_AT) topUp();
  }

  /* ------------------------------------------------------------------ */
  /* Active meme, depth, up next                                         */
  /* ------------------------------------------------------------------ */
  function setActive(i) {
    if (i === S.active) return;
    const prev = S.slides[S.active];
    if (prev) prev.el.classList.remove('is-active');
    S.active = i;
    const s = S.slides[i];
    s.el.classList.add('is-active');

    if (!s.counted) {
      s.counted = true;
      S.depth += 1;
      el.depth.textContent = S.depth;
      el.depthChip.classList.remove('bump');
      void el.depthChip.offsetWidth;
      el.depthChip.classList.add('bump');
      if (MILESTONES[S.depth]) toast(MILESTONES[S.depth]);
    }
    if (i > 0) dismissCoach();
    renderUpNext();
    if (S.slides.length - 1 - i < TOPUP_AT) topUp();
  }

  function renderUpNext() {
    if (!el.upnext) return;
    el.upnext.textContent = '';
    const next = S.slides.slice(S.active + 1, S.active + 4);
    for (const s of next) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      const im = document.createElement('img');
      im.src = s.meme.thumb; im.alt = ''; im.loading = 'lazy';
      if (s.meme.nsfw || s.meme.spoiler) im.style.filter = 'blur(10px)';
      const t = document.createElement('span');
      t.textContent = s.meme.title || `r/${s.meme.subreddit}`;
      b.append(im, t);
      b.addEventListener('click', () => scrollToIndex(S.slides.indexOf(s)));
      li.append(b);
      el.upnext.append(li);
    }
  }

  function scrollToIndex(i) {
    const s = S.slides[Math.max(0, Math.min(i, S.slides.length - 1))];
    if (s) s.el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }
  function go(delta) {
    if (!S.slides.length) return;
    const target = S.active + delta;
    if (target >= S.slides.length) { topUp(); return; }
    scrollToIndex(target);
  }

  /* ------------------------------------------------------------------ */
  /* Media gestures: tap = full size, double-tap = save                  */
  /* ------------------------------------------------------------------ */
  let lastTap = { t: 0, node: null, timer: 0 };
  function wireMediaTaps(media, meme) {
    media.addEventListener('click', (ev) => {
      if (media.classList.contains('veiled') || ev.target.closest('button')) return;
      const now = performance.now();
      if (lastTap.node === media && now - lastTap.t < 320) {
        clearTimeout(lastTap.timer);
        lastTap = { t: 0, node: null, timer: 0 };
        if (!isSaved(meme.url)) addSaved(meme);
        burst(media);
        return;
      }
      clearTimeout(lastTap.timer);
      lastTap = { t: now, node: media, timer: setTimeout(() => { lastTap.node = null; openLightbox(meme); }, 320) };
    });
  }
  function burst(media) {
    const b = media.querySelector('.burst');
    b.classList.remove('go');
    void b.getBoundingClientRect();
    b.classList.add('go');
    if (navigator.vibrate) navigator.vibrate(12);
  }

  /* ------------------------------------------------------------------ */
  /* Saved                                                               */
  /* ------------------------------------------------------------------ */
  // Same localStorage key as v2, so existing saves carry over.
  S.saved = store.get('savedMemes', []).map(normalize).filter(Boolean);
  const savedSet = () => new Set(S.saved.map((m) => m.url));
  let savedUrls = savedSet();
  const isSaved = (url) => savedUrls.has(url);

  function persistSaved() {
    store.set('savedMemes', S.saved);
    savedUrls = savedSet();
    const n = S.saved.length;
    el.savedCount.hidden = n === 0;
    el.savedCount.textContent = n > 99 ? '99+' : String(n);
    el.savedTotal.textContent = n ? `(${n})` : '';
    document.querySelectorAll('.act.save').forEach((b) => syncSaveButton(b, savedUrls.has(b.dataset.url)));
    if (el.lightbox.open && el.lightbox.meme) syncSaveButton(el.lbSave, savedUrls.has(el.lightbox.meme.url));
    if (el.savedSheet.open) renderSaved();
  }
  function syncSaveButton(btn, on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Saved. Remove from saved' : 'Save');
    const label = btn.querySelector('span');
    if (label) label.textContent = on ? 'Saved' : 'Save';
  }
  function addSaved(meme, index = 0) {
    if (isSaved(meme.url)) return;
    S.saved.splice(index, 0, { ...meme, savedAt: Date.now() });
    persistSaved();
    el.savedCount.classList.remove('pop'); void el.savedCount.offsetWidth; el.savedCount.classList.add('pop');
  }
  function removeSaved(meme) {
    const i = S.saved.findIndex((m) => m.url === meme.url);
    if (i === -1) return;
    const [gone] = S.saved.splice(i, 1);
    persistSaved();
    toast('Removed from saved', { label: 'Undo', fn: () => addSaved(gone, i) });
  }
  function toggleSave(meme) {
    if (isSaved(meme.url)) removeSaved(meme);
    else { addSaved(meme); toast('Saved'); }
  }

  function renderSaved() {
    el.savedGrid.textContent = '';
    el.savedEmpty.hidden = S.saved.length > 0;
    el.exportBtn.hidden = S.saved.length === 0;
    for (const m of S.saved) {
      const item = document.createElement('div');
      item.className = 'saved-item';
      const open = document.createElement('button');
      open.setAttribute('aria-label', `Open: ${m.title || 'saved meme'}`);
      const im = document.createElement('img');
      im.src = m.thumb; im.alt = ''; im.loading = 'lazy';
      im.onerror = () => { if (im.src !== m.url) im.src = m.url; };
      open.append(im);
      open.addEventListener('click', () => openLightbox(m));
      const rm = document.createElement('button');
      rm.className = 'rm';
      rm.setAttribute('aria-label', 'Remove');
      rm.innerHTML = '<svg class="icon"><use href="#i-x"/></svg>';
      rm.addEventListener('click', () => removeSaved(m));
      item.append(open, rm);
      el.savedGrid.append(item);
    }
  }

  function exportSaved() {
    const blob = new Blob([JSON.stringify(S.saved, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `memeception-saved-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Share                                                               */
  /* ------------------------------------------------------------------ */
  async function share(meme) {
    const data = { title: meme.title || 'A meme', text: `${meme.title || 'This meme'} (via Memeception)`, url: meme.postLink };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(meme.postLink);
      toast('Link copied');
    } catch {
      window.open(meme.postLink, '_blank', 'noopener');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Lightbox                                                            */
  /* ------------------------------------------------------------------ */
  function openLightbox(meme) {
    el.lightbox.meme = meme;
    el.lbImg.src = meme.url;
    el.lbImg.alt = meme.title ? `Meme: ${meme.title}` : 'Meme';
    el.lbTitle.textContent = meme.title || '(untitled)';
    el.lbMeta.textContent = `r/${meme.subreddit} · u/${meme.author} · ${fmt(meme.ups)} upvotes`;
    el.lbOpen.href = meme.postLink;
    syncSaveButton(el.lbSave, isSaved(meme.url));
    if (!el.lightbox.open) el.lightbox.showModal();
    el.lbScroll.scrollTop = 0;
  }
  el.lbSave.addEventListener('click', () => el.lightbox.meme && toggleSave(el.lightbox.meme));
  el.lbScroll.addEventListener('click', () => el.lightbox.close()); // tap anywhere on the image area to close

  /* ------------------------------------------------------------------ */
  /* Dialog plumbing                                                     */
  /* ------------------------------------------------------------------ */
  for (const d of document.querySelectorAll('dialog:not(#age-gate)')) {
    d.addEventListener('click', (ev) => { if (ev.target === d) d.close(); }); // backdrop click
    d.addEventListener('close', () => { if (el.toasts.parentElement === d) document.body.append(el.toasts); });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
  }
  function openSheet(d) {
    document.querySelectorAll('dialog[open]').forEach((o) => o !== d && o.close());
    if (d === el.savedSheet) renderSaved();
    if (!d.open) d.showModal();
  }
  el.savedBtn.addEventListener('click', () => openSheet(el.savedSheet));
  el.infoBtn.addEventListener('click', () => openSheet(el.infoSheet));
  el.exportBtn.addEventListener('click', exportSaved);

  /* ------------------------------------------------------------------ */
  /* Toasts                                                              */
  /* ------------------------------------------------------------------ */
  function toast(text, action) {
    // A modal <dialog> makes everything outside it inert, so the toast stack
    // moves inside whichever dialog is open (otherwise "Undo" can't be clicked).
    const host = document.querySelector('dialog[open]') || document.body;
    if (el.toasts.parentElement !== host) host.append(el.toasts);
    const t = document.createElement('div');
    t.className = 'toast';
    const span = document.createElement('span');
    span.textContent = text;
    t.append(span);
    if (action) {
      const b = document.createElement('button');
      b.textContent = action.label;
      b.addEventListener('click', () => { action.fn(); dismiss(); });
      t.append(b);
    }
    el.toasts.append(t);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
    const timer = setTimeout(dismiss, action ? 5000 : 2600);
    function dismiss() {
      clearTimeout(timer);
      t.classList.add('out');
      setTimeout(() => t.remove(), 230);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Categories                                                          */
  /* ------------------------------------------------------------------ */
  function renderChips() {
    GENRES.forEach((g, i) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.slug = g.slug;
      b.style.setProperty('--c', g.accent);
      b.innerHTML = '<span class="dot" aria-hidden="true"></span>';
      b.append(document.createTextNode(g.label));
      const num = document.createElement('span');
      num.className = 'num'; num.textContent = String(i + 1); num.setAttribute('aria-hidden', 'true');
      b.append(num);
      b.addEventListener('click', () => setGenre(g.slug));
      el.genres.append(b);
    });
  }

  function setGenre(slug, { force = false } = {}) {
    if (!bySlug[slug]) slug = 'dank';
    const g = bySlug[slug];
    if (slug === S.genre && S.slides.length && !force) {
      scrollToIndex(0);
      return;
    }
    S.genre = slug;
    S.gen += 1;
    S.active = -1;
    S.appending = false;
    for (const s of S.slides) { nearIO.unobserve(s.el); activeIO.unobserve(s.el); }
    S.slides = [];
    el.feed.textContent = '';
    el.feed.scrollTop = 0;

    document.documentElement.style.setProperty('--accent', g.accent);
    if (el.themeColor) el.themeColor.setAttribute('content', g.accent);
    document.title = slug === 'dank' ? 'Memeception | Meme Generator' : `${g.label} memes | Memeception`;
    for (const chip of el.genres.children) {
      const on = chip.dataset.slug === slug;
      chip.setAttribute('aria-selected', String(on));
      chip.tabIndex = on ? 0 : -1;
      if (on) chip.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    const hash = `#${slug}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    renderUpNext();
    topUp();
  }

  // Arrow keys move between chips (tablist pattern)
  el.genres.addEventListener('keydown', (ev) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(ev.key)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const chips = [...el.genres.children];
    const i = chips.indexOf(document.activeElement);
    const dir = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1;
    const next = chips[(i + dir + chips.length) % chips.length];
    next.focus();
    setGenre(next.dataset.slug);
  });

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function themePref() {
    const v = store.raw('theme');
    return v === 'dark' || v === 'light' ? v : 'system';
  }
  function applyTheme(pref) {
    const dark = pref === 'dark' || (pref === 'system' && mq.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (pref === 'system') { try { window.localStorage.removeItem('theme'); } catch { /* ignore */ } }
    else store.setRaw('theme', pref);
    document.querySelectorAll('input[name="theme"]').forEach((r) => { r.checked = r.value === pref; });
  }
  el.themeBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  document.querySelectorAll('input[name="theme"]').forEach((r) => r.addEventListener('change', () => applyTheme(r.value)));
  mq.addEventListener('change', () => { if (themePref() === 'system') applyTheme('system'); });

  /* ------------------------------------------------------------------ */
  /* Safe mode                                                           */
  /* ------------------------------------------------------------------ */
  el.safeToggle.checked = S.safe;
  el.safeToggle.addEventListener('change', () => {
    S.safe = el.safeToggle.checked;
    store.set('mc_safe', S.safe);
    if (S.safe) for (const q of S.queues.values()) { for (let i = q.length - 1; i >= 0; i--) if (q[i].nsfw) q.splice(i, 1); }
    toast(S.safe ? 'Safe mode on' : 'Safe mode off. NSFW posts stay blurred until tapped');
  });

  /* ------------------------------------------------------------------ */
  /* Coach mark                                                          */
  /* ------------------------------------------------------------------ */
  function dismissCoach() {
    if (el.coach.hidden) return;
    el.coach.hidden = true;
    store.setRaw('mc_coached', '1');
  }
  function showCoach() {
    if (store.raw('mc_coached')) return;
    el.coach.hidden = false;
    setTimeout(dismissCoach, 9000);
  }

  /* ------------------------------------------------------------------ */
  /* 18+ notice (shown once; nothing loads until it's confirmed)         */
  /* ------------------------------------------------------------------ */
  function ageGate(start) {
    if (store.raw('mc_age_ok')) { start(); return; }
    const d = $('#age-gate');
    let ok = false;
    d.addEventListener('cancel', (ev) => ev.preventDefault()); // Esc can't skip it
    // Browsers may force-close a modal on repeated Esc; reopen until answered.
    // Focus the dialog, not the Yes button, so a habitual Space can't confirm it.
    const show = () => { d.showModal(); d.focus(); };
    d.addEventListener('close', () => { if (!ok) show(); });
    $('#age-yes').addEventListener('click', () => {
      ok = true;
      store.setRaw('mc_age_ok', '1');
      d.close();
      start();
    }, { once: true });
    show();
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard + wheel                                                    */
  /* ------------------------------------------------------------------ */
  document.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || ev.target.isContentEditable) return;
    const openDialog = document.querySelector('dialog[open]');
    const k = ev.key;
    if (openDialog) {
      if (openDialog === el.lightbox && (k === 's' || k === 'S')) { el.lbSave.click(); }
      return; // Esc is handled natively by <dialog>
    }
    const s = S.slides[S.active];
    const onButton = tag === 'button' || tag === 'a';
    switch (k) {
      case 'j': case 'J': case 'ArrowDown': case 'PageDown':
        ev.preventDefault(); go(1); break;
      case ' ':
        if (onButton) return;
        ev.preventDefault(); go(ev.shiftKey ? -1 : 1); break;
      case 'k': case 'K': case 'ArrowUp': case 'PageUp':
        ev.preventDefault(); go(-1); break;
      case 'Home': ev.preventDefault(); scrollToIndex(0); break;
      case 's': case 'S': if (s) { toggleSave(s.meme); if (isSaved(s.meme.url)) burst(s.el.querySelector('.media')); } break;
      case 'f': case 'F': if (s) openLightbox(s.meme); break;
      case 'o': case 'O': if (s) window.open(s.meme.postLink, '_blank', 'noopener'); break;
      case 'b': case 'B': openSheet(el.savedSheet); break;
      case 't': case 'T': el.themeBtn.click(); break;
      case '?': case 'i': case 'I': openSheet(el.infoSheet); break;
      default:
        if (/^[1-9]$/.test(k) && GENRES[Number(k) - 1]) setGenre(GENRES[Number(k) - 1].slug);
    }
  });

  // Scrolling over the sidebars still moves the feed on desktop.
  document.addEventListener('wheel', (ev) => {
    if (el.feed.contains(ev.target) || ev.target.closest('dialog')) return;
    el.feed.scrollBy({ top: ev.deltaY, behavior: 'auto' });
  }, { passive: true });

  el.brand.addEventListener('click', (ev) => { ev.preventDefault(); scrollToIndex(0); });
  window.addEventListener('hashchange', () => setGenre(location.hash.slice(1)));
  window.addEventListener('online', () => {
    const msg = el.feed.querySelector('.message');
    if (msg) msg.remove();
    if (msg || !S.slides.length) topUp();
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  renderChips();
  applyTheme(themePref());
  persistSaved();
  ageGate(() => {
    setGenre(location.hash.slice(1) || 'dank', { force: true });
    showCoach();
    // Warm the next categories in the background once the first memes are in.
    setTimeout(() => ['tech', 'relatable'].forEach((g) => ensureQueue(g, 4).catch(() => {})), 2500);
  });
})();
