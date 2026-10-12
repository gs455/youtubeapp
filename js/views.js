// ---- Overlay views: Folders manager and the All page -----------------------
// Only one view is open at a time; the feed is hidden while one is open.

function closeViews() {
  byId('manager').classList.remove('show');
  byId('all-view').classList.remove('show');
  document.body.classList.remove('view-open');
}

// Open a view, or close it (and show the feed again) if it's already open.
function toggleView(viewId) {
  const wasOpen = byId(viewId).classList.contains('show');
  closeViews();
  if (wasOpen) {
    return renderFeed();
  }

  byId(viewId).classList.add('show');
  document.body.classList.add('view-open');

  if (viewId === 'all-view') {
    renderAllView();
  } else {
    renderManager();
  }
}

// ---- All page ----

function channelStatsText(channelId) {
  const stats = channelStatsCache[channelId];
  if (!stats) {
    return '';
  }
  const subscribers = stats.subs == null ? 'hidden' : formatStatNumber(stats.subs);
  return `${subscribers} subs · ${formatStatNumber(stats.vids)} vids · ${formatStatNumber(stats.views)} views`;
}

function folderDetailsHtml(folderName, isOpen) {
  const channelIds = appState.folders[folderName];
  const channelRows = channelIds.map((channelId) =>
    `<div class="channel-stat-row">` +
    `<a class="channel-link" href="${channelVideosUrl(channelId)}" target="_blank">${escapeHtml(channelName(channelId))}</a>` +
    `<span class="muted channel-stats">${channelStatsText(channelId)}</span>` +
    `</div>`
  ).join('');

  return `<details class="folder" data-folder="${escapeHtml(folderName)}" ${isOpen ? 'open' : ''}>` +
    `<summary>${escapeHtml(folderName)} <span class="muted">(${channelIds.length})</span></summary>` +
    (channelRows || '<div class="muted channel-link">empty</div>') +
    `</details>`;
}

// Draw the All page. Stats are fetched afterwards, then it redraws once.
function renderAllView(shouldFetchStats = true) {
  const view = byId('all-view');
  const names = folderNames();
  const openFolders = new Set([...view.querySelectorAll('details[open]')].map((el) => el.dataset.folder));

  const toolbar = '<div class="button-bar"><button id="expand-all">Expand all</button><button id="collapse-all">Collapse all</button></div>';
  const folders = names.map((name) => folderDetailsHtml(name, openFolders.has(name))).join('');
  view.innerHTML = toolbar + (folders || '<div class="muted">No folders yet</div>');

  byId('expand-all').onclick = () => view.querySelectorAll('details').forEach((el) => { el.open = true; });
  byId('collapse-all').onclick = () => view.querySelectorAll('details').forEach((el) => { el.open = false; });

  if (shouldFetchStats && accessToken) {
    const allChannelIds = names.flatMap((name) => appState.folders[name]);
    loadChannelStats(allChannelIds)
      .then(() => {
        if (view.classList.contains('show')) {
          renderAllView(false);
        }
      })
      .catch(() => {});
  }
}

// ---- Folders manager ----

function folderOfChannel(channelId) {
  return folderNames().find((name) => appState.folders[name].includes(channelId)) || '';
}

function managerChannelRowHtml(subscription) {
  const hasCustomName = appState.names && appState.names[subscription.id];
  const assignedFolder = folderOfChannel(subscription.id);
  const folderOptions = folderNames().map((name) =>
    `<option ${assignedFolder === name ? 'selected' : ''}>${escapeHtml(name)}</option>`
  ).join('');

  return `<div class="channel-row">` +
    `<img src="${subscription.thumb}">` +
    `<a class="channel-name" href="${channelVideosUrl(subscription.id)}" target="_blank">` +
    `${escapeHtml(channelName(subscription.id, subscription.title))}${hasCustomName ? ' <span class="muted">✎</span>' : ''}</a>` +
    `<button class="rename-channel" data-channel="${subscription.id}" title="Rename">✎</button>` +
    (hasCustomName ? `<button class="reset-channel" data-channel="${subscription.id}" title="Reset">↺</button>` : '') +
    `<select data-channel="${subscription.id}"><option value="">—</option>${folderOptions}</select>` +
    `<button class="unsubscribe-channel" data-channel="${subscription.id}" title="Unsubscribe">Unsub</button>` +
    `</div>`;
}

function renderManager() {
  const view = byId('manager');
  const folderButtons = currentFolder
    ? '<button id="rename-folder">Rename</button><button id="delete-folder">Delete</button>'
    : '';

  view.innerHTML =
    `<div class="button-bar"><button id="new-folder">+ New folder</button>${folderButtons}` +
    `<button id="all" class="push-right">All folders</button></div>` +
    subscriptions.map(managerChannelRowHtml).join('');

  byId('all').onclick = () => toggleView('all-view');
  byId('new-folder').onclick = createFolder;
  if (currentFolder) {
    byId('rename-folder').onclick = renameCurrentFolder;
    byId('delete-folder').onclick = deleteCurrentFolder;
  }

  view.querySelectorAll('.rename-channel').forEach((button) => {
    button.onclick = () => renameChannel(button.dataset.channel);
  });
  view.querySelectorAll('.reset-channel').forEach((button) => {
    button.onclick = () => resetChannelName(button.dataset.channel);
  });
  view.querySelectorAll('.unsubscribe-channel').forEach((button) => {
    button.onclick = () => unsubscribeFromChannel(button.dataset.channel);
  });
  view.querySelectorAll('select').forEach((dropdown) => {
    dropdown.onchange = () => assignChannelToFolder(dropdown.dataset.channel, dropdown.value);
  });
}

// Save, then redraw the tabs and the manager.
function afterFolderChange() {
  saveState();
  renderTabs();
  renderManager();
}

function createFolder() {
  const name = prompt('Folder name');
  if (name && !appState.folders[name]) {
    appState.folders[name] = [];
    currentFolder = name;
    afterFolderChange();
  }
}

function renameCurrentFolder() {
  const newName = prompt('Rename', currentFolder);
  if (newName && !appState.folders[newName]) {
    appState.folders[newName] = appState.folders[currentFolder];
    delete appState.folders[currentFolder];
    currentFolder = newName;
    afterFolderChange();
  }
}

function deleteCurrentFolder() {
  if (confirm('Delete ' + currentFolder + '?')) {
    delete appState.folders[currentFolder];
    currentFolder = null;
    afterFolderChange();
  }
}

// A channel lives in at most one folder; '' removes it from all folders.
function assignChannelToFolder(channelId, folderName) {
  for (const name in appState.folders) {
    appState.folders[name] = appState.folders[name].filter((id) => id !== channelId);
  }
  if (folderName) {
    appState.folders[folderName].push(channelId);
  }
  saveState();
  renderManager();
}

// Blank or original name clears the custom name.
function renameChannel(channelId) {
  const subscription = subscriptions.find((sub) => sub.id === channelId) || {};
  const originalTitle = subscription.title;
  const input = prompt('Channel name (blank = original: ' + originalTitle + ')', channelName(channelId, originalTitle));
  if (input === null) {
    return;
  }

  appState.names = appState.names || {};
  const newName = input.trim();
  if (newName && newName !== originalTitle) {
    appState.names[channelId] = newName;
  } else {
    delete appState.names[channelId];
  }
  saveState();
  renderManager();
}

function resetChannelName(channelId) {
  delete appState.names[channelId];
  saveState();
  renderManager();
}

// ---- Unsubscribe ----

// 403 from YouTube when the token was granted without the full youtube scope.
function isMissingPermissionError(error) {
  return error.status === 403 && /insufficient/i.test(error.message);
}

// Remove a channel from the subscription list and every folder, then redraw.
function forgetChannel(channelId) {
  subscriptions = subscriptions.filter((sub) => sub.id !== channelId);
  for (const name in appState.folders) {
    appState.folders[name] = appState.folders[name].filter((id) => id !== channelId);
  }
  saveState();
  renderManager();
  renderTabs();
}

async function unsubscribeFromChannel(channelId) {
  const subscription = subscriptions.find((sub) => sub.id === channelId);
  if (!subscription || !subscription.subscriptionId) {
    alert('Could not find this subscription. Try signing in again.');
    return;
  }
  if (!confirm('Unsubscribe from ' + channelName(channelId, subscription.title) + '?')) {
    return;
  }

  try {
    await deleteSubscription(subscription.subscriptionId);
  } catch (error) {
    if (!isMissingPermissionError(error)) {
      alert('Unsubscribe failed: ' + error.message);
      return;
    }

    // Older sign-in without permission to unsubscribe: ask again, then retry once.
    if (!confirm('Unsubscribing needs extra permission. Sign in again now?')) {
      return;
    }
    try {
      localStorage.removeItem('grantedScopes');
      await requestAccessToken('consent');
      await deleteSubscription(subscription.subscriptionId);
    } catch (retryError) {
      alert('Unsubscribe failed: ' + (retryError.message || retryError.error || retryError));
      return;
    }
  }

  forgetChannel(channelId);
}
