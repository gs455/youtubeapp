// ---- Small shared helpers ------------------------------------------------

// Shortcut for document.getElementById.
function byId(id) {
  return document.getElementById(id);
}

// Escape text before inserting it into HTML.
function escapeHtml(text) {
  const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return text.replace(/[&<>"]/g, (char) => replacements[char]);
}

// Convert an ISO 8601 duration like "PT1H2M3S" to seconds.
function parseIsoDuration(isoText) {
  const match = isoText.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  const days = +match[1] || 0;
  const hours = +match[2] || 0;
  const minutes = +match[3] || 0;
  const seconds = +match[4] || 0;
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

// Format seconds as "m:ss" or "h:mm:ss" for the duration badge.
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  if (hours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
}

// Short view count for video cards, e.g. 1.2M or 35K.
function formatViewCount(count) {
  if (count >= 1e6) {
    return (count / 1e6).toFixed(1) + 'M';
  }
  if (count >= 1e3) {
    return (count / 1e3).toFixed(0) + 'K';
  }
  return count;
}

// Short number for channel stats, e.g. 1.2M, 3K, 2.5B.
function formatStatNumber(count) {
  if (count >= 1e9) {
    return (count / 1e9).toFixed(1) + 'B';
  }
  if (count >= 1e6) {
    return (count / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1e3) {
    return (count / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(count);
}

// How long ago a date was, e.g. "5m", "3h", "12d".
function timeAgo(dateText) {
  const secondsAgo = (Date.now() - new Date(dateText)) / 1000;
  if (secondsAgo < 3600) {
    return Math.floor(secondsAgo / 60) + 'm';
  }
  if (secondsAgo < 86400) {
    return Math.floor(secondsAgo / 3600) + 'h';
  }
  return Math.floor(secondsAgo / 86400) + 'd';
}

// Show a status message (the status line is currently hidden by CSS).
function showStatus(message) {
  byId('status').textContent = message || '';
}
