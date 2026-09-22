/* -------------------------------------------------------------------------- */
/* MEME LOGIC (CORE)                                                          */
/* -------------------------------------------------------------------------- */
const state = {
  genre: 'dankmemes',
  currentMeme: null,
  isLoading: false
};

const els = {
  img: document.getElementById('meme-img'),
  loader: document.getElementById('loader'),
  fetchBtn: document.getElementById('fetch-btn'),
  saveBtn: document.getElementById('save-btn'),
  credit: document.getElementById('credit'),
  savedDrawer: document.getElementById('drawer'),
  savedGrid: document.getElementById('saved-grid')
};

// Ensure critical elements exist before running logic
if (els.fetchBtn && els.img) {

    // Initialize
    fetchMeme();

    // Event Listeners
    els.fetchBtn.addEventListener('click', () => {
    fetchMeme();
    });

    const genreContainer = document.getElementById('genre-container');
    if (genreContainer) {
        genreContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            state.genre = e.target.dataset.value;
        }
        });
    }

    // --- SAVE SYSTEM ---
    els.saveBtn.addEventListener('click', () => {
    if (!state.currentMeme) return;
    const saved = JSON.parse(localStorage.getItem('savedMemes') || '[]');
    if (saved.some(m => m.url === state.currentMeme.url)) return alert('Saved already!');

    saved.unshift(state.currentMeme);
    localStorage.setItem('savedMemes', JSON.stringify(saved));
    renderSaved();

    // Feedback
    els.saveBtn.innerText = '✅';
    setTimeout(() => els.saveBtn.innerText = '💾', 1000);
    });
}

// --- FETCH ---
async function fetchMeme() {
  if (state.isLoading) return;
  state.isLoading = true;
  els.loader.style.opacity = '1';
  els.saveBtn.disabled = true;

  const urls = [
    `https://meme-api.com/gimme/${state.genre}`,
    `https://meme-api.com/gimme/cursedcomments` // Fallback
  ];

  for (let url of urls) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.url && data.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        // Preload image
        const tempImg = new Image();
        tempImg.onload = () => {
          els.img.src = data.url;
          els.credit.innerHTML = `<a href="${data.postLink}" style="color:var(--accent);text-decoration:none;">r/${data.subreddit}</a> • u/${data.author}`;
          state.currentMeme = data;
          state.isLoading = false;
          els.loader.style.opacity = '0';
          els.saveBtn.disabled = false;
        };
        tempImg.src = data.url;
        return;
      }
    } catch (e) {
      console.log(e);
    }
  }

  // Error State
  state.isLoading = false;
  els.loader.style.opacity = '0';
  els.credit.innerText = "Error fetching meme 😢";
}

// --- DRAWER LOGIC ---
const viewSavedBtn = document.getElementById('view-saved-btn');
const closeDrawerBtn = document.getElementById('close-drawer');

if (viewSavedBtn) viewSavedBtn.addEventListener('click', () => els.savedDrawer.classList.add('open'));
if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => els.savedDrawer.classList.remove('open'));

function renderSaved() {
  if (!els.savedGrid) return;
  const saved = JSON.parse(localStorage.getItem('savedMemes') || '[]');
  els.savedGrid.innerHTML = saved.map((m, i) => `
    <div class="saved-thumb" onclick="loadSaved(${i})">
      <div class="del" onclick="event.stopPropagation(); deleteMeme(${i})">✕</div>
      <img src="${m.url}">
    </div>
  `).join('');
}

window.deleteMeme = (i) => {
  const saved = JSON.parse(localStorage.getItem('savedMemes'));
  saved.splice(i, 1);
  localStorage.setItem('savedMemes', JSON.stringify(saved));
  renderSaved();
};

window.loadSaved = (i) => {
  const saved = JSON.parse(localStorage.getItem('savedMemes'));
  const m = saved[i];
  els.img.src = m.url;
  state.currentMeme = m;
  els.credit.innerHTML = `Saved Meme`;
  els.savedDrawer.classList.remove('open');
  els.saveBtn.disabled = true;
};

// --- THEME LOGIC ---
const themeToggle = document.getElementById('theme-toggle');
const sun = document.getElementById('icon-sun');
const moon = document.getElementById('icon-moon');

if (themeToggle) {
    // Check saved theme
    if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    sun.style.display = 'none';
    moon.style.display = 'block';
    }

    themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    sun.style.display = isDark ? 'none' : 'block';
    moon.style.display = isDark ? 'block' : 'none';

    });
}

renderSaved();
