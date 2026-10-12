// ---- App startup and header controls --------------------------------------

// Sign in, load synced folders and subscriptions, then show the feed.
async function signInAndLoad() {
  try {
    showStatus('Signing in…');
    const promptMode = hasCurrentScopes() ? '' : 'consent';
    await requestAccessToken(promptMode);
    byId('login').style.display = 'none';
    updateTabPlacement();
    await loadStateFromDrive();
    await loadSubscriptions();
    renderFeed();
    rerenderOpenView();
  } catch (error) {
    showStatus('Error: ' + (error.message || error.error || error));
  }
}

// Redraw the manager or All page if one is open (e.g. once names arrive).
function rerenderOpenView() {
  if (byId('manager').classList.contains('show')) {
    renderManager();
  }
  if (byId('all-view').classList.contains('show')) {
    renderAllView();
  }
}

// ---- Header control handlers ----

byId('tabs').onclick = (event) => {
  const folder = event.target.dataset.folder;
  if (folder == null) {
    return;
  }
  currentFolder = decodeURIComponent(folder);
  hiddenChannels = new Set();
  closeViews();
  renderFeed();
};

byId('channel-chips').onclick = handleChipClick;

byId('sort').onchange = (event) => {
  prefs.sort = event.target.value;
  savePrefs();
  renderFeed();
};

byId('shorts').onclick = () => {
  prefs.shorts = !prefs.shorts;
  savePrefs();
  syncControls();
  renderFeed();
};

byId('view').onclick = () => {
  prefs.view = prefs.view === 'grid' ? 'list' : 'grid';
  savePrefs();
  syncControls();
};

byId('manage').onclick = () => toggleView('manager');
byId('login').onclick = signInAndLoad;

// ---- Width modes (desktop) ----
// The saved mode is applied in index.html before first paint.

const WIDTH_MODES = ['full', 'medium', 'narrow'];
const WIDTH_MODE_LABELS = { full: '↔', medium: 'M', narrow: 'N' };

function currentWidthMode() {
  const saved = localStorage.getItem('widthMode');
  return WIDTH_MODES.includes(saved) ? saved : 'full';
}

function applyWidthMode(mode) {
  const root = document.documentElement;
  root.classList.remove('width-medium', 'width-narrow');
  if (mode !== 'full') {
    root.classList.add('width-' + mode);
  }

  const nextMode = WIDTH_MODES[(WIDTH_MODES.indexOf(mode) + 1) % WIDTH_MODES.length];
  const button = byId('narrow');
  button.textContent = WIDTH_MODE_LABELS[mode];
  button.title = `Width: ${mode} (tap for ${nextMode})`;

  // The header's left column changed size, so re-check tab wrapping.
  updateTabPlacement();
}

byId('narrow').onclick = () => {
  const mode = currentWidthMode();
  const nextMode = WIDTH_MODES[(WIDTH_MODES.indexOf(mode) + 1) % WIDTH_MODES.length];
  localStorage.setItem('widthMode', nextMode);
  applyWidthMode(nextMode);
};

applyWidthMode(currentWidthMode());

// ---- Light/dark theme ----
// The saved theme is applied in index.html before first paint.

function syncThemeButton() {
  const isLight = document.documentElement.classList.contains('light');
  byId('theme').textContent = isLight ? '☾' : '☀';
  document.querySelector('meta[name=theme-color]').content = isLight ? '#ffffff' : '#0f0f0f';
}

byId('theme').onclick = () => {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  syncThemeButton();
};

// ---- Startup ----

syncControls();
renderTabs();
syncThemeButton();

window.addEventListener('load', () => {
  if (window.APP_CONFIG.CLIENT_ID.startsWith('YOUR_')) {
    return showStatus('Set CLIENT_ID in config.js');
  }
  initTokenClient();
  showStatus('Tap Sign in');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
