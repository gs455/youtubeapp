// ---- App startup and header controls --------------------------------------

// Sign in, load synced folders and subscriptions, then show the feed.
async function signInAndLoad() {
  try {
    showStatus('Signing in…');
    const promptMode = localStorage.getItem('signedIn') ? '' : 'consent';
    await requestAccessToken(promptMode);
    byId('login').style.display = 'none';
    await loadStateFromDrive();
    await loadSubscriptions();
    renderFeed();
  } catch (error) {
    showStatus('Error: ' + (error.message || error.error || error));
  }
}

// ---- Header control handlers ----

byId('tabs').onclick = (event) => {
  const folder = event.target.dataset.folder;
  if (folder == null) {
    return;
  }
  currentFolder = decodeURIComponent(folder);
  channelFilter = '';
  closeViews();
  renderFeed();
};

byId('channel-filter').onchange = (event) => {
  channelFilter = event.target.value;
  renderFeed();
};

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

// ---- Narrow mode (desktop phone-width column) ----

if (localStorage.getItem('narrow') === '1') {
  document.documentElement.classList.add('narrow');
}

byId('narrow').onclick = () => {
  const isNarrow = document.documentElement.classList.toggle('narrow');
  localStorage.setItem('narrow', isNarrow ? '1' : '0');
};

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
