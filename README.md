# ytshelves

A small web app (PWA) for organizing your YouTube subscriptions into folders.
Open it in Safari on iPhone/iPad and use **Share → Add to Home Screen** to
install it like an app. Live at https://gs455.github.io/ytshelves/

## What it does

- Signs in with your Google account (YouTube access, used to read subscriptions and to unsubscribe).
- Lets you put subscribed channels into folders, shown as tabs at the top.
- Shows each folder's recent uploads, sorted by Recent or Popular, in a grid
  or a compact one-line list, with a duration badge on every thumbnail.
- Hides Shorts (3 minutes or less, or tagged #shorts) unless you turn them on.
- Filters a folder's feed to one channel.
- Lets you give channels custom names.
- The **All** page (in the Folders manager) lists every folder with its
  channels and their subscriber, video and view counts.
- Light/dark theme, and desktop width modes (full, medium 900px, narrow 600px) on the ↔ button.
- Folders and custom names sync between devices through a hidden file
  (`folders.json`) in your own Google Drive app-data folder. Nothing is stored
  on any server.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout (header, tabs, controls, views) |
| `styles.css` | All styling; light theme overrides at the bottom |
| `config.js` | Google OAuth client ID |
| `js/util.js` | Small helpers: formatting numbers, durations, dates |
| `js/auth.js` | Google sign-in and authenticated API requests |
| `js/storage.js` | Local cache and Google Drive sync of folders/names |
| `js/youtube.js` | YouTube Data API calls (subscriptions, videos, stats) |
| `js/feed.js` | Folder tabs and the video feed |
| `js/views.js` | Folders manager and the All page |
| `js/main.js` | Header button handlers and startup |
| `sw.js` | Service worker (offline cache); bump `CACHE_NAME` on every change |
| `manifest.json`, `icon.svg` | Home-screen app info and icon |

There is no build step: the files are served as-is by GitHub Pages.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a
   project and enable **YouTube Data API v3** and **Google Drive API**.
2. Configure the OAuth consent screen with the scopes
   `youtube` (needed to unsubscribe) and `drive.appdata`, and add your account as a test user.
3. Create an **OAuth client ID** of type *Web application* with the
   authorized JavaScript origin `https://gs455.github.io`.
4. Put the client ID in `config.js`.
