// ---- Saved data and Drive sync --------------------------------------------
// appState = { folders: { folderName: [channelId, ...] },
//              names:   { channelId: customName },   (optional)
//              updated: timestamp }
// It is cached in localStorage and synced to folders.json in the user's
// hidden Google Drive appDataFolder. The newer copy wins.
// prefs (sort, view, shorts) stay on this device only.

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const SYNC_FILE_NAME = 'folders.json';

let appState = JSON.parse(localStorage.getItem('state') || '{"folders":{},"updated":0}');
let prefs = JSON.parse(localStorage.getItem('prefs') || '{"shorts":false,"view":"grid","sort":"recent"}');

let driveFileId = null;
let pendingSaveTimer = null;

function savePrefs() {
  localStorage.setItem('prefs', JSON.stringify(prefs));
}

function cacheStateLocally() {
  localStorage.setItem('state', JSON.stringify(appState));
}

// Save a change: cache locally now, upload to Drive shortly after.
function saveState() {
  appState.updated = Date.now();
  cacheStateLocally();
  clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(uploadStateToDrive, 800);
}

// Load folders.json from Drive. Use it if it is at least as new as the
// local copy; otherwise push the local copy up.
async function loadStateFromDrive() {
  const query = encodeURIComponent(`name='${SYNC_FILE_NAME}'`);
  const listing = await apiFetch(`${DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=files(id)`);

  if (!listing.files.length) {
    uploadStateToDrive();
    return;
  }

  driveFileId = listing.files[0].id;
  const remoteState = await apiFetch(`${DRIVE_FILES_URL}/${driveFileId}?alt=media`);

  if (remoteState && remoteState.updated >= appState.updated) {
    appState = remoteState;
    cacheStateLocally();
  } else {
    uploadStateToDrive();
  }
}

// Create or update folders.json in Drive with a multipart upload.
async function uploadStateToDrive() {
  const metadata = { name: SYNC_FILE_NAME, mimeType: 'application/json' };
  if (!driveFileId) {
    metadata.parents = ['appDataFolder'];
  }

  const boundary = 'xx' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${JSON.stringify(driveFileId ? {} : metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${JSON.stringify(appState)}\r\n` +
    `--${boundary}--`;

  const url = driveFileId
    ? `${DRIVE_UPLOAD_URL}/${driveFileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  const result = await apiFetch(url, {
    method: driveFileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
  driveFileId = result.id;
}
