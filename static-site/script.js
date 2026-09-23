(() => {
  const categories = [
    ['dankmemes', 'Dank'], ['ProgrammerHumor', 'Tech'],
    ['wholesomememes', 'Wholesome'], ['me_irl', 'Relatable'],
    ['darkmemes', 'Dark'], ['puns', 'Puns'], ['sarcasm', 'Sarcasm'],
    ['cringememes', 'Cringe']
  ];
  const fallbackGenre = 'cursedcomments';
  const storeKey = 'savedMemes';
  const $ = (selector) => document.querySelector(selector);
  const els = {
    body: document.body, genre: $('#genre-container'), img: $('#meme-img'),
    imageContainer: $('#meme-image-container'), loader: $('#loader'),
    card: $('#meme-card'), section: $('.reader-section'), fetch: $('#fetch-btn'),
    surprise: $('#surprise-btn'), prev: $('#prev-btn'), save: $('#save-btn'),
    share: $('#share-btn'), theme: $('#theme-toggle'), themeIcon: $('#theme-icon'),
    savedOpen: $('#view-saved-btn'), savedInline: $('#open-saved-inline'),
    savedCount: $('#saved-count'), keepersTotal: $('#keepers-total'),
    drawerCount: $('#drawer-count'), drawer: $('#drawer'), backdrop: $('#drawer-backdrop'),
    savedGrid: $('#saved-grid'), preview: $('#keepers-preview'), close: $('#close-drawer'),
    toast: $('#toast'), source: $('#meme-source'), title: $('#meme-title'),
    credit: $('#credit'), activeMood: $('#active-mood'), rail: $('#rail-current'),
    number: $('#meme-number'), sessionCount: $('#session-count'),
    autoplay: $('#autoplay-btn')
  };
  const state = {
    genre: 'dankmemes', mood: 'Dank', current: null, history: [], historyIndex: -1,
    requestId: 0, controller: null, loading: false, sessionCount: 0, timer: null, toastTimer: null
  };
  const fallbackImage = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420"><rect width="600" height="420" rx="24" fill="#e0f3ff"/><text x="300" y="205" text-anchor="middle" font-family="sans-serif" font-size="64" fill="#0ea5ff">¯\_(ツ)_/¯</text><text x="300" y="260" text-anchor="middle" font-family="sans-serif" font-size="19" fill="#1e293b">This one got away</text></svg>');

  function readSaved() {
    try {
      const value = JSON.parse(localStorage.getItem(storeKey) || '[]');
      return Array.isArray(value) ? value.filter((item) => item && typeof item.url === 'string') : [];
    } catch { return []; }
  }
  function writeSaved(items) {
    try { localStorage.setItem(storeKey, JSON.stringify(items)); return true; }
    catch { showToast('Could not save. Check your browser storage.'); return false; }
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 2300);
  }
  function setLoading(loading, label = 'Finding your next one') {
    state.loading = loading;
    els.fetch.disabled = loading;
    els.surprise.disabled = loading;
    els.loader.querySelector('span:last-child').textContent = label;
    els.loader.classList.toggle('hidden', !loading);
    els.img.classList.toggle('loaded', !loading);
    els.save.disabled = loading || !state.current;
    els.share.disabled = loading || !state.current;
  }
  function setCategory(value, shouldFetch = true) {
    const selected = categories.find(([genre]) => genre === value);
    if (!selected) return;
    state.genre = selected[0];
    state.mood = selected[1];
    [...els.genre.querySelectorAll('.mood-pill')].forEach((button) => {
      const active = button.dataset.value === state.genre;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const index = categories.findIndex(([genre]) => genre === state.genre);
    els.activeMood.textContent = `${state.mood.toUpperCase()} MODE`;
    els.rail.textContent = String(index + 1).padStart(2, '0');
    if (shouldFetch) loadMeme();
  }
  function validImageUrl(value) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch { return false; }
  }
  function imageLike(url) { return /\.(jpe?g|png|gif|webp)(?:$|[?#])/i.test(url); }
  async function getMeme(url, controller) {
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Meme API returned ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  function preloadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(url);
      image.onerror = () => reject(new Error('Image could not load'));
      image.src = url;
    });
  }
  async function loadMeme({ random = false, fromHistory = false } = {}) {
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;
    const requestId = ++state.requestId;
    setLoading(true, random ? 'Surprising you…' : 'Finding your next one…');
    els.section.classList.add('is-changing');
    const choices = random ? categories.filter(([genre]) => genre !== state.genre) : categories;
    const primary = random ? choices[Math.floor(Math.random() * choices.length)] : null;
    const chosen = primary ? primary[0] : state.genre;
    if (primary) setCategory(chosen, false);
    const sources = [`https://meme-api.com/gimme/${encodeURIComponent(chosen)}`, `https://meme-api.com/gimme/${fallbackGenre}`];
    let meme = null;
    let imageUrl = '';
    let usedFallback = false;
    for (let i = 0; i < sources.length; i++) {
      try {
        const candidate = await getMeme(sources[i], controller);
        if (!candidate || !validImageUrl(candidate.url) || !imageLike(candidate.url)) throw new Error('No image in response');
        await preloadImage(candidate.url);
        meme = candidate;
        imageUrl = candidate.url;
        usedFallback = i > 0;
        break;
      } catch (error) {
        if (requestId !== state.requestId) return;
        console.warn('Could not load meme source:', error.message);
      }
    }
    if (requestId !== state.requestId) return;
    if (!meme) {
      setLoading(false);
      els.img.src = fallbackImage;
      els.img.classList.add('loaded');
      els.source.textContent = 'A little internet hiccup';
      els.title.textContent = 'That meme got away.';
      els.credit.textContent = 'Give it another go in a moment.';
      state.current = null;
      updateActionState();
      showToast('Could not find a meme. Try again in a moment.');
      return;
    }
    const enriched = { ...meme, url: imageUrl, genre: chosen, savedAt: Date.now() };
    state.current = enriched;
    if (!fromHistory) {
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(enriched);
      if (state.history.length > 40) state.history.shift();
      state.historyIndex = state.history.length - 1;
    }
    els.img.src = imageUrl;
    els.img.alt = enriched.title || `Meme from r/${enriched.subreddit || 'memes'}`;
    els.source.textContent = usedFallback ? `r/${meme.subreddit || fallbackGenre} · surprise find` : `r/${meme.subreddit || 'memes'}`;
    els.title.textContent = enriched.title || 'A meme for the moment.';
    const author = document.createElement('span');
    author.textContent = meme.author ? `Shared by u/${meme.author}` : 'A find from the internet';
    els.credit.replaceChildren();
    const sourceLink = document.createElement('a');
    sourceLink.href = /^https?:\/\//i.test(meme.postLink || '') ? meme.postLink : `https://www.reddit.com/r/${encodeURIComponent(meme.subreddit || 'memes')}`;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = `r/${meme.subreddit || 'memes'}`;
    els.credit.append(sourceLink, document.createTextNode(` · ${author.textContent}`));
    state.sessionCount++;
    els.sessionCount.textContent = `${state.sessionCount} ${state.sessionCount === 1 ? 'meme' : 'memes'} found`;
    els.number.textContent = `${String(state.historyIndex + 1).padStart(2, '0')} IN THIS SESSION`;
    setLoading(false);
    updateActionState();
    els.section.classList.remove('is-changing');
  }
  function updateActionState() {
    const saved = readSaved();
    const isSaved = !!state.current && saved.some((item) => item.url === state.current.url);
    els.save.classList.toggle('saved', isSaved);
    els.save.setAttribute('aria-label', isSaved ? 'Remove meme from saved' : 'Save meme');
    els.save.title = isSaved ? 'Saved — tap to remove' : 'Save this one';
    els.savedCount.textContent = saved.length;
    els.keepersTotal.textContent = saved.length;
    els.drawerCount.textContent = saved.length;
    els.prev.disabled = state.historyIndex <= 0;
    renderKeepers(saved);
    renderDrawer(saved);
  }
  function makeImage(src, alt) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt || 'Saved meme';
    image.loading = 'lazy';
    image.onerror = () => { image.src = fallbackImage; };
    return image;
  }
  function renderKeepers(saved) {
    els.preview.replaceChildren();
    if (!saved.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-keeper';
      const mark = document.createElement('span'); mark.className = 'empty-keeper-mark'; mark.textContent = '+';
      const copy = document.createElement('div');
      const heading = document.createElement('strong'); heading.textContent = 'Save the ones you love.';
      const hint = document.createElement('p'); hint.textContent = "They'll show up here, ready for a rewatch.";
      copy.append(heading, hint); empty.append(mark, copy); els.preview.append(empty); return;
    }
    saved.slice(0, 4).forEach((meme, index) => {
      const card = document.createElement('button'); card.className = 'keeper-card'; card.type = 'button';
      card.setAttribute('aria-label', `Open saved meme ${index + 1}: ${meme.title || 'Meme'}`);
      card.append(makeImage(meme.url, meme.title || 'Saved meme'));
      const info = document.createElement('span'); info.className = 'keeper-info';
      const title = document.createElement('strong'); title.textContent = meme.title || 'A keeper';
      const source = document.createElement('span'); source.textContent = `r/${meme.subreddit || 'memes'}`;
      info.append(title, source); card.append(info);
      card.addEventListener('click', () => openSavedMeme(meme)); els.preview.append(card);
    });
  }
  function renderDrawer(saved) {
    els.savedGrid.replaceChildren();
    if (!saved.length) {
      const empty = document.createElement('p'); empty.className = 'drawer-empty'; empty.textContent = 'Nothing saved yet. When a meme gets you, tap the bookmark.'; els.savedGrid.append(empty); return;
    }
    saved.forEach((meme) => {
      const tile = document.createElement('div'); tile.className = 'saved-thumb'; tile.tabIndex = 0;
      tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', `Open saved meme from r/${meme.subreddit || 'memes'}`);
      tile.append(makeImage(meme.url, meme.title || 'Saved meme'));
      const source = document.createElement('span'); source.className = 'saved-subreddit'; source.textContent = `r/${meme.subreddit || 'memes'}`;
      const del = document.createElement('button'); del.className = 'del'; del.type = 'button'; del.setAttribute('aria-label', 'Remove saved meme'); del.textContent = '×';
      del.addEventListener('click', (event) => { event.stopPropagation(); removeSaved(meme.url); });
      tile.addEventListener('click', () => openSavedMeme(meme));
      tile.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSavedMeme(meme); } });
      tile.append(source, del); els.savedGrid.append(tile);
    });
  }
  function toggleSave() {
    if (!state.current) return;
    const saved = readSaved();
    const index = saved.findIndex((item) => item.url === state.current.url);
    if (index >= 0) { saved.splice(index, 1); showToast('Removed from your keepers.'); }
    else { saved.unshift(state.current); showToast('Saved to your keepers.'); }
    if (writeSaved(saved)) { updateActionState(); els.card.classList.add('is-saving'); setTimeout(() => els.card.classList.remove('is-saving'), 450); }
  }
  function removeSaved(url) {
    if (writeSaved(readSaved().filter((item) => item.url !== url))) { updateActionState(); showToast('Removed from your keepers.'); }
  }
  function openSavedMeme(meme) {
    state.current = meme;
    els.img.src = meme.url;
    els.img.alt = meme.title || 'Saved meme';
    els.img.classList.add('loaded');
    els.title.textContent = meme.title || 'A keeper.';
    els.source.textContent = `r/${meme.subreddit || 'memes'} · saved`;
    const link = document.createElement('a'); link.href = /^https?:\/\//i.test(meme.postLink || '') ? meme.postLink : `https://www.reddit.com/r/${encodeURIComponent(meme.subreddit || 'memes')}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `r/${meme.subreddit || 'memes'}`;
    els.credit.replaceChildren(link, document.createTextNode(meme.author ? ` · Shared by u/${meme.author}` : ' · Saved on this device'));
    setLoading(false); updateActionState(); closeDrawer(); $('#reader').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function openDrawer() {
    els.drawer.classList.add('open'); els.backdrop.classList.add('open');
    els.drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); els.close.focus();
  }
  function closeDrawer() {
    els.drawer.classList.remove('open'); els.backdrop.classList.remove('open');
    els.drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open');
  }
  async function shareMeme() {
    if (!state.current) return;
    const url = state.current.postLink || state.current.url;
    const data = { title: state.current.title || 'A meme from Memeception', text: 'Found this on Memeception', url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); showToast('Meme link copied.'); }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Could not share that link.');
    }
  }
  function previousMeme() {
    if (state.historyIndex <= 0 || state.loading) return;
    state.historyIndex--;
    const meme = state.history[state.historyIndex];
    state.current = meme;
    els.img.src = meme.url; els.img.alt = meme.title || 'Meme'; els.img.classList.add('loaded');
    els.title.textContent = meme.title || 'A meme for the moment.';
    els.source.textContent = `r/${meme.subreddit || 'memes'} · back in time`;
    const link = document.createElement('a'); link.href = /^https?:\/\//i.test(meme.postLink || '') ? meme.postLink : `https://www.reddit.com/r/${encodeURIComponent(meme.subreddit || 'memes')}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `r/${meme.subreddit || 'memes'}`;
    els.credit.replaceChildren(link, document.createTextNode(` · Shared by u/${meme.author || 'internet'}`));
    els.number.textContent = `${String(state.historyIndex + 1).padStart(2, '0')} IN THIS SESSION`;
    updateActionState();
  }
  function toggleAutoplay() {
    if (state.timer) {
      clearInterval(state.timer); state.timer = null; els.autoplay.classList.remove('active');
      els.autoplay.setAttribute('aria-label', 'Start autoplay'); showToast('Auto-play paused.'); return;
    }
    state.timer = setInterval(() => { if (!document.hidden) loadMeme(); }, 9000);
    els.autoplay.classList.add('active'); els.autoplay.setAttribute('aria-label', 'Pause autoplay'); showToast('Auto-play on · a new meme every 9 seconds.');
  }
  function setTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    els.theme.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    els.themeIcon.innerHTML = isDark ? '<path d="M20.8 14.3A8.6 8.6 0 0 1 9.7 3.2 8.8 8.8 0 1 0 20.8 14.3Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
  }
  els.genre.addEventListener('click', (event) => { const button = event.target.closest('.mood-pill'); if (button) setCategory(button.dataset.value); });
  els.fetch.addEventListener('click', () => loadMeme());
  els.surprise.addEventListener('click', () => loadMeme({ random: true }));
  els.prev.addEventListener('click', previousMeme);
  els.save.addEventListener('click', toggleSave);
  els.share.addEventListener('click', shareMeme);
  els.theme.addEventListener('click', () => setTheme(!document.body.classList.contains('dark-mode')));
  els.savedOpen.addEventListener('click', openDrawer); els.savedInline.addEventListener('click', openDrawer);
  els.close.addEventListener('click', closeDrawer); els.backdrop.addEventListener('click', closeDrawer);
  els.autoplay.addEventListener('click', toggleAutoplay);
  document.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
    if (event.key === 'Escape' && els.drawer.classList.contains('open')) { closeDrawer(); return; }
    if (els.drawer.classList.contains('open')) return;
    if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); loadMeme(); }
    else if (event.key === 'ArrowLeft') previousMeme();
    else if (event.key.toLowerCase() === 's') toggleSave();
    else if (event.key.toLowerCase() === 'd') setTheme(!document.body.classList.contains('dark-mode'));
  });
  window.addEventListener('storage', (event) => { if (event.key === storeKey) updateActionState(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.timer) { clearInterval(state.timer); state.timer = null; els.autoplay.classList.remove('active'); els.autoplay.setAttribute('aria-label', 'Start autoplay'); } });
  setTheme(localStorage.getItem('theme') === 'dark');
  updateActionState();
  setLoading(true, 'Finding your first one…');
  loadMeme();
})();
