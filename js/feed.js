// ---- Folder tabs and the video feed ---------------------------------------

let currentFolder = null;     // name of the selected folder tab
let channelFilter = '';       // channel ID to show, or '' for all channels
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
}

// Fill the CHANNEL dropdown with the current folder's channels.
function renderChannelFilter(channelIds) {
  const dropdown = byId('channel-filter');
  dropdown.style.display = '';

  if (channelFilter && !channelIds.includes(channelFilter)) {
    channelFilter = '';
  }

  const options = channelIds.map((channelId) => {
    const selected = channelId === channelFilter ? 'selected' : '';
    return `<option value="${channelId}" ${selected}>${escapeHtml(channelName(channelId))}</option>`;
  });
  dropdown.innerHTML = '<option value="">All channels</option>' + options.join('');
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

  if (!currentFolder || !accessToken) {
    byId('channel-filter').style.display = 'none';
    return;
  }

  const channelIds = appState.folders[currentFolder] || [];
  renderChannelFilter(channelIds);

  if (!channelIds.length) {
    return showStatus('Folder is empty');
  }

  showStatus('Loading…');
  let videos = await loadVideosForChannels(channelFilter ? [channelFilter] : channelIds);

  // A newer render started while we were loading; drop these results.
  if (generation !== renderGeneration) {
    return;
  }

  if (!prefs.shorts) {
    videos = videos.filter((video) => !isShort(video));
  }
  sortVideos(videos);
  showStatus('');

  byId('feed').innerHTML = videos.map(videoCardHtml).join('');
}

// Reflect saved prefs on the header controls.
function syncControls() {
  byId('shorts').classList.toggle('on', prefs.shorts);
  byId('view').textContent = prefs.view === 'grid' ? 'List' : 'Grid';
  byId('feed').className = prefs.view;
  byId('sort').value = prefs.sort;
}
