// ---- Google sign-in -------------------------------------------------------
// Uses the Google Identity Services token client. Tokens live only in memory
// and last about an hour; when one expires we silently ask for a new one.
// The full youtube scope is needed to unsubscribe.

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

let tokenClient = null;
let accessToken = null;
let accessTokenExpiresAt = 0;

// Create the token client once the Google script has loaded.
function initTokenClient() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: APP_CONFIG.CLIENT_ID,
    scope: OAUTH_SCOPES,
    callback: () => {},
  });
}

// Ask Google for an access token. promptMode is '' (silent if possible)
// or 'consent' (show the consent screen).
function requestAccessToken(promptMode) {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        return reject(response);
      }
      accessToken = response.access_token;
      accessTokenExpiresAt = Date.now() + (response.expires_in - 60) * 1000;
      localStorage.setItem('signedIn', '1');
      if (google.accounts.oauth2.hasGrantedAllScopes(response, ...OAUTH_SCOPES.split(' '))) {
        localStorage.setItem('grantedScopes', OAUTH_SCOPES);
      } else {
        localStorage.removeItem('grantedScopes');
      }
      resolve();
    };
    tokenClient.requestAccessToken({ prompt: promptMode });
  });
}

// True if this device already signed in with the scopes we need now.
// After a scope change this is false, so the consent screen is shown again.
function hasCurrentScopes() {
  return localStorage.getItem('signedIn') && localStorage.getItem('grantedScopes') === OAUTH_SCOPES;
}

// Fetch a Google API URL with the access token, refreshing it when needed.
async function apiFetch(url, options = {}) {
  if (!accessToken || Date.now() > accessTokenExpiresAt) {
    await requestAccessToken('');
  }

  const response = await fetch(url, {
    ...options,
    headers: { Authorization: 'Bearer ' + accessToken, ...(options.headers || {}) },
  });

  // Token was rejected: drop it and try again with a fresh one.
  if (response.status === 401) {
    accessToken = null;
    return apiFetch(url, options);
  }

  if (!response.ok) {
    const error = new Error(response.status + ' ' + await response.text());
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}
