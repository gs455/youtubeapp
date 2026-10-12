// ---- YouTube Data API -----------------------------------------------------

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3/';
const SHORTS_MAX_SECONDS = 180;
const API_BATCH_SIZE = 50;

let subscriptions = [];        // [{ id, title, thumb }]
const videoCache = {};         // videoId -> video details
const channelStatsCache = {};  // channelId -> { subs, vids, views }

// channelId -> channel title from channels.list, kept on this device so
// names show even for channels missing from the subscriptions list.
const channelTitleCache = JSON.parse(localStorage.getItem('channelTitles') || '{}');

// Load every subscribed channel, 50 per page.
async function loadSubscriptions() {
  subscriptions = [];
  let pageToken = '';
  do {
    const pageParam = pageToken ? '&pageToken=' + pageToken : '';
    const page = await apiFetch(`${YOUTUBE_API}subscriptions?part=snippet&mine=true&maxResults=50&order=alphabetical${pageParam}`);
    for (const item of page.items) {
      subscriptions.push({
        id: item.snippet.resourceId.channelId,
        title: item.snippet.title,
        thumb: item.snippet.thumbnails.default.url,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}

// A channel's uploads playlist ID is its channel ID with "UC" -> "UU".
function uploadsPlaylistId(channelId) {
  return 'UU' + channelId.slice(2);
}

// Get the latest 50 video IDs from one channel (empty list on error).
async function fetchRecentVideoIds(channelId) {
  try {
    const page = await apiFetch(`${YOUTUBE_API}playlistItems?part=contentDetails&maxResults=50&playlistId=${uploadsPlaylistId(channelId)}`);
    return page.items.map((item) => item.contentDetails.videoId);
  } catch (error) {
    return [];
  }
}

// Fetch details (title, duration, views...) for videos not yet cached.
async function fetchVideoDetails(videoIds) {
  const missingIds = videoIds.filter((id) => !videoCache[id]);
  for (let start = 0; start < missingIds.length; start += API_BATCH_SIZE) {
    const batch = missingIds.slice(start, start + API_BATCH_SIZE).join(',');
    const result = await apiFetch(`${YOUTUBE_API}videos?part=snippet,contentDetails,statistics&id=${batch}`);
    for (const video of result.items) {
      const thumbnails = video.snippet.thumbnails;
      videoCache[video.id] = {
        id: video.id,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        thumb: (thumbnails.medium || thumbnails.default).url,
        durationSeconds: parseIsoDuration(video.contentDetails.duration || ''),
        views: +(video.statistics.viewCount || 0),
        isLive: video.snippet.liveBroadcastContent !== 'none',
      };
      // Remember the channel title as a fallback display name.
      if (!channelTitleCache[video.snippet.channelId]) {
        channelTitleCache[video.snippet.channelId] = video.snippet.channelTitle;
      }
    }
  }
}

// Recent videos for a list of channels, with full details.
async function loadVideosForChannels(channelIds) {
  const idLists = await Promise.all(channelIds.map(fetchRecentVideoIds));
  const videoIds = idLists.flat();
  await fetchVideoDetails(videoIds);
  return videoIds.map((id) => videoCache[id]).filter(Boolean);
}

// Shorts: 3 minutes or less, or tagged #short / #shorts in the title.
function isShort(video) {
  const isShortLength = video.durationSeconds > 0 && video.durationSeconds <= SHORTS_MAX_SECONDS;
  return isShortLength || /#shorts?\b/i.test(video.title);
}

// Fetch titles and subscriber/video/view counts from channels.list.
async function fetchChannelInfo(channelIds) {
  for (let start = 0; start < channelIds.length; start += API_BATCH_SIZE) {
    const batch = channelIds.slice(start, start + API_BATCH_SIZE).join(',');
    const result = await apiFetch(`${YOUTUBE_API}channels?part=snippet,statistics&maxResults=50&id=${batch}`);
    for (const channel of result.items || []) {
      const stats = channel.statistics;
      channelStatsCache[channel.id] = {
        subs: stats.hiddenSubscriberCount ? null : +stats.subscriberCount,
        vids: +stats.videoCount,
        views: +stats.viewCount,
      };
      channelTitleCache[channel.id] = channel.snippet.title;
    }
  }
  localStorage.setItem('channelTitles', JSON.stringify(channelTitleCache));
}

// Load stats for channels whose stats aren't cached yet.
async function loadChannelStats(channelIds) {
  const missingIds = [...new Set(channelIds)].filter((id) => !channelStatsCache[id]);
  await fetchChannelInfo(missingIds);
}

// Look up titles for channels we can't name yet. Returns true if any
// were fetched, so the caller knows to redraw.
async function loadMissingChannelTitles(channelIds) {
  const missingIds = [...new Set(channelIds)].filter((id) => !knownChannelTitle(id));
  if (!missingIds.length || !accessToken) {
    return false;
  }
  await fetchChannelInfo(missingIds);
  return true;
}

// Title from the subscriptions list or channels.list, if we have one.
function knownChannelTitle(channelId) {
  const subscription = subscriptions.find((sub) => sub.id === channelId);
  return (subscription && subscription.title) || channelTitleCache[channelId] || '';
}

// Display name: custom name, else subscription/channel title, else the
// title passed in (e.g. from a video), else the raw ID as a last resort.
function channelName(channelId, fallbackTitle) {
  const customName = appState.names && appState.names[channelId];
  return customName || knownChannelTitle(channelId) || fallbackTitle || channelId;
}

function channelVideosUrl(channelId) {
  return `https://www.youtube.com/channel/${channelId}/videos`;
}
