// ---- Folder tabs and the video feed ---------------------------------------

let currentFolder = null;     // name of the selected folder tab
let hiddenChannels = new Set(); // channel IDs switched off with the chips
let folderVideos = [];          // videos loaded for the current folder
let renderGeneration = 0;     // ignores results from outdated renders

function folderNames() {
  return Object.keys(appState.folders);
}

// Draw the folder tabs, selecting the first folder if none is selected.
function renderTabs() {
  const names = folderNames();
  if (!names.includes(currentFolder)) {
    currentFolder = names[0] || null;
  }

  const tabsHtml = names.map((name) => {
    const selectedClass = name === currentFolder ? 'on' : '';
    return `<button class="${selectedClass}" data-folder="${encodeURIComponent(name)}">${escapeHtml(name)}</button>`;
  }).join('');

  byId('tabs').innerHTML = tabsHtml || '<span class="muted">No folders yet — tap Folders</span>';
  updateTabPlacement();
}

// Draw one chip per channel in the folder, plus an All on/off toggle.
function renderChannelChips(channelIds) {
  const row = byId('channel-chips');
  if (!channelIds.length) {
    row.innerHTML = '';
    return;
  }

  const allShown = channelIds.every((id) => !hiddenChannels.has(id));
  const toggleAll = `<button class="chip chip-toggle-all on" data-toggle-all="1">${allShown ? 'All off' : 'All on'}</button>`;
  const chips = channelIds.map((channelId) => {
    const onClass = hiddenChannels.has(channelId) ? '' : 'on';
    return `<button class="chip ${onClass}" data-channel="${channelId}">${escapeHtml(channelName(channelId))}</button>`;
  });
  row.innerHTML = toggleAll + chips.join('');
}

// Chip taps: toggle one channel, or turn all on/off. Redraws from the
// already-loaded videos, so no extra API calls.
function handleChipClick(event) {
  const chip = event.target.closest('.chip');
  if (!chip) {
    return;
  }
  const channelIds = appState.folders[currentFolder] || [];

  if (chip.dataset.toggleAll) {
    const allShown = channelIds.every((id) => !hiddenChannels.has(id));
    hiddenChannels = allShown ? new Set(channelIds) : new Set();
  } else if (hiddenChannels.has(chip.dataset.channel)) {
    hiddenChannels.delete(chip.dataset.channel);
  } else {
    hiddenChannels.add(chip.dataset.channel);
  }

  renderChannelChips(channelIds);
  drawFeedVideos();
}

function sortVideos(videos) {
  if (prefs.sort === 'popular') {
    videos.sort((a, b) => b.views - a.views);
  } else {
    videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
}

function videoCardHtml(video) {
  const badge = video.isLive ? 'LIVE' : formatDuration(video.durationSeconds);
  const meta = `${escapeHtml(channelName(video.channelId, video.channelTitle))} · ${formatViewCount(video.views)} · ${timeAgo(video.publishedAt)}`;
  return `<a class="video" href="https://www.youtube.com/watch?v=${video.id}" target="_blank">` +
    `<div class="thumb"><img loading="lazy" src="${video.thumb}"><span class="duration">${badge}</span></div>` +
    `<div class="video-title">${escapeHtml(video.title)}</div>` +
    `<div class="muted">${meta}</div>` +
    `</a>`;
}

// Redraw the tabs and the feed for the selected folder.
async function renderFeed() {
  renderTabs();
  const generation = ++renderGeneration;
  byId('feed').innerHTML = '';
  folderVideos = [];

  if (!currentFolder || !accessToken) {
    byId('channel-chips').innerHTML = '';
    return;
  }

  const channelIds = appState.folders[currentFolder] || [];
  renderChannelChips(channelIds);

  if (!channelIds.length) {
    return showStatus('Folder is empty');
  }

  // Fetch titles for any channels we can't name yet, then redraw the chips.
  loadMissingChannelTitles(channelIds)
    .then((fetched) => {
      if (fetched && generation === renderGeneration) {
        renderChannelChips(channelIds);
      }
    })
    .catch(() => {});

  showStatus('Loading…');
  const videos = await loadVideosForChannels(channelIds);

  // A newer render started while we were loading; drop these results.
  if (generation !== renderGeneration) {
    return;
  }

  folderVideos = videos;
  showStatus('');
  drawFeedVideos();

  // Video details may have supplied missing channel titles.
  renderChannelChips(channelIds);
}

// Draw the loaded videos, skipping Shorts (unless shown) and hidden channels.
function drawFeedVideos() {
  let videos = folderVideos.filter((video) => !hiddenChannels.has(video.channelId));
  if (!prefs.shorts) {
    videos = videos.filter((video) => !isShort(video));
  }
  sortVideos(videos);
  byId('feed').innerHTML = videos.map(videoCardHtml).join('');
}

// Reflect saved prefs on the header controls.
function syncControls() {
  byId('shorts').classList.toggle('on', prefs.shorts);
  byId('view').textContent = prefs.view === 'grid' ? 'List' : 'Grid';
  byId('feed').className = prefs.view;
  byId('sort').value = prefs.sort;
}
