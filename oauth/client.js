// CLIENT APP: all code in this file runs in Node, not in the browser.
// BUTTON → ROUTE → NEXT ROLE:
// Connect → GET /oauth/connect → browser visits provider /authorize.
// Exchange → POST /oauth/exchange → backend calls provider /token.
// Request profile/playlists → POST /oauth/api → backend calls resource API.
// Refresh → POST /oauth/refresh → backend calls provider /token again.
// UI markup for these buttons lives in views/oauth.pug.
const express = require('express');
const { CLIENT_ID, CLIENT_SECRET, randomToken, challenge, origin } = require('./config');
const provider = require('./provider');
const router = express.Router();
// Server-side memory holds each browser's pending code, tokens, and request log.
// The browser cookie contains only a random session ID, not the OAuth tokens.
const sessions = new Map();

// FEATURE: the expandable "Follow the requests" log on the OAuth page.
// These entries explain the flow; logging itself is not an OAuth protocol step.
function event(session, title, direction, detail) {
  session.events.push({ title, direction, detail });
  session.events = session.events.slice(-24);
}

// FEATURE: Reset and reconnect revoke this demo session's old grant.
function clearGrant(session) {
  provider.revokeDemo(session);
  for (const key of Object.keys(session)) if (key !== 'events') delete session[key];
}

// FEATURE: keep the same demo state while the browser leaves and returns.
// cookie-parser in app.js already parsed req.cookies; we look up the session ID.
router.use((req, res, next) => {
  // Keep the browser and callback on the same host for session cookies.
  if (req.hostname === 'localhost') return res.redirect(303, origin(req) + req.originalUrl);
  res.set('Cache-Control', 'no-store');
  let id = req.cookies.oauth_demo_session;
  if (!sessions.has(id)) {
    id = randomToken('session_');
    sessions.set(id, { events: [] });
    res.cookie('oauth_demo_session', id, { httpOnly: true, sameSite: 'lax', path: '/oauth' });
  }
  req.oauthDemo = sessions.get(id);
  next();
});

// FEATURE: display code/token status, API results, notices, and request history.
// Only this classroom page deliberately renders fake token values for inspection.
function render(req, res, status = 200) {
  const session = req.oauthDemo;
  res.status(status).render('oauth', {
    title: 'OAuth 2.0 · Local simulation', session,
    accessStatus: provider.tokenStatus(session.accessToken),
    pretty: (value) => JSON.stringify(value, null, 2)
  });
}

router.get('/', (req, res) => render(req, res));

// FEATURE: "Connect Mock Music Service" (OAuth step 1; slides 40, 54, 67-68).
// The form supplies scope through req.query. res.redirect() moves the BROWSER
// to the provider's consent page; this is not a backend fetch() call.
router.get('/connect', (req, res) => {
  const session = req.oauthDemo;
  clearGrant(session);
  // state lets the callback check that it belongs to this browser's request.
  session.state = randomToken('state_');
  // PKCE: keep the verifier here; send only its hash in the authorization URL.
  session.verifier = randomToken('');
  session.redirectUri = origin(req) + '/oauth/callback';
  const scope = req.query.scope === 'profile:read' ? 'profile:read' : 'profile:read playlists:read';
  const authorize = new URL(origin(req) + '/mock-provider/authorize');
  // response_type=code requests a code, not an access token in the redirect.
  // client_id identifies the app; redirect_uri says where to return the browser.
  // The client secret is not included in this browser-visible URL.
  authorize.search = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: session.redirectUri,
    scope, state: session.state,
    code_challenge: challenge(session.verifier), code_challenge_method: 'S256'
  }).toString();
  event(session, '1. Ask for authorization', 'Browser → authorization server', 'GET ' + authorize.href);
  res.redirect(authorize.href);
});

// FEATURE: "Code received" and "See the callback URL" (slide 69).
// The provider redirects the BROWSER here with ?code=...&state=... or an error.
// We pause after storing the code so the instructor can explain it before exchange.
router.get('/callback', (req, res) => {
  const session = req.oauthDemo;
  // Reject a callback that does not match this session's pending request.
  if (!session.state || req.query.state !== session.state) {
    session.notice = 'Callback rejected: state does not match the authorization request.';
    return render(req, res, 400);
  }
  delete session.state;
  session.callbackUrl = origin(req) + req.originalUrl;
  // "Deny" on the provider page takes this branch instead of issuing a code.
  if (req.query.error) {
    session.notice = 'User denied permission. No code or tokens were issued.';
    event(session, 'Authorization denied', 'Authorization server → browser → client callback', 'error=access_denied');
  } else if (typeof req.query.code === 'string' && req.query.code) {
    session.code = req.query.code;
    session.notice = 'Code received. Next, let the backend exchange it for tokens.';
    event(session, 'Code received at callback', 'Authorization server → browser → client callback', session.callbackUrl);
  } else {
    session.notice = 'Callback did not contain a code.';
  }
  res.redirect(303, '/oauth#tokens');
});

// SHARED BACKEND HELPER: code exchange and refresh both POST to /token.
// The grant_type and body differ, but the token endpoint is the same.
async function requestTokens(req, parameters) {
  const session = req.oauthDemo;
  const visibleParameters = { ...parameters };
  if (visibleParameters.code_verifier) visibleParameters.code_verifier = '[server-only PKCE verifier]';
  event(session, 'Token request', 'Client backend → authorization server',
    'POST /mock-provider/token\nAuthorization: Basic [client credentials kept on server]\n' +
    new URLSearchParams(visibleParameters).toString());
  // FEATURE: the actual server-to-server token request shown in the request log.
  // Basic encodes client_id:client_secret as Base64; Base64 is not encryption.
  // URLSearchParams creates the form-encoded body expected by this endpoint.
  const response = await fetch(origin(req) + '/mock-provider/token', {
    method: 'POST', headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    }, body: new URLSearchParams(parameters), signal: AbortSignal.timeout(5000)
  });
  const result = await response.json();
  event(session, 'Token response', 'Authorization server → client backend',
    'HTTP ' + response.status + '\n' + JSON.stringify(result, null, 2));
  // Store the returned tokens on the client BACKEND for later API/refresh calls.
  if (response.ok) {
    session.accessToken = result.access_token;
    session.refreshToken = result.refresh_token;
    session.scope = result.scope;
    session.expiresIn = result.expires_in;
    delete session.apiResult;
    session.notice = 'Tokens received. Try requesting the profile or playlists.';
  } else {
    session.notice = 'Token request failed: ' + result.error;
  }
}

// FEATURE: "Exchange code for tokens" (OAuth step 2; slides 41-42, 70-74).
// The browser submits to our /oauth/exchange route. This handler then asks
// requestTokens() to exchange the code with the authorization server.
router.post('/exchange', async (req, res) => {
  const session = req.oauthDemo;
  if (!session.code) {
    session.notice = 'Authorize first to receive a code.';
  } else {
    await requestTokens(req, {
      grant_type: 'authorization_code', code: session.code,
      redirect_uri: session.redirectUri, code_verifier: session.verifier
    });
    // Once exchanged, remove the pending code and disable the Exchange button.
    if (session.accessToken) {
      session.lastCode = session.code;
      delete session.code;
      delete session.verifier;
    }
  }
  res.redirect(303, '/oauth#tokens');
});

// FEATURE: "Request profile", "Request playlists", and "Retry profile request".
// OAuth step 3 (slides 43-45, 56, 75-76): browser → our backend → resource API.
router.post('/api', async (req, res) => {
  const session = req.oauthDemo;
  const resource = req.body?.resource === 'playlists' ? 'playlists' : 'me';
  event(session, '3. Request protected data', 'Browser → client backend → resource server',
    `GET /mock-provider/api/${resource}\nAuthorization: ${session.accessToken ? 'Bearer ' + session.accessToken : '[missing]'}`);
  // Only the ACCESS token belongs in this Bearer header, not the refresh token.
  const response = await fetch(origin(req) + '/mock-provider/api/' + resource, {
    headers: session.accessToken ? { Authorization: 'Bearer ' + session.accessToken } : {},
    signal: AbortSignal.timeout(5000)
  });
  // FEATURE: "Last API response" shows the resource API's HTTP status and JSON.
  // A 401 suggests a missing/expired token; a 403 means the scope was not granted.
  session.apiResult = { status: response.status, body: await response.json() };
  event(session, 'API response', 'Resource server → client backend → browser',
    'HTTP ' + response.status + '\n' + JSON.stringify(session.apiResult.body, null, 2));
  session.notice = response.ok ? 'Protected data received.' :
    response.status === 401 ? 'API returned 401. Try refreshing the access token.' :
      'API returned 403: this permission was not granted. Reconnect with both scopes.';
  res.redirect(303, '/oauth#data');
});

// FEATURE: "Expire access token". This is a CLASSROOM CONTROL, not OAuth.
// Change the mock provider's expiration record so the next API call returns 401.
router.post('/expire', (req, res) => {
  const session = req.oauthDemo;
  provider.expireAccess(session.accessToken);
  session.notice = 'Mock access token expired. Call the profile API again to see 401.';
  event(session, 'Teaching control: expire access token', 'Local simulation only',
    'Set expiresAt into the past. This is not an OAuth protocol endpoint.');
  res.redirect(303, '/oauth#refresh');
});

// FEATURE: "Refresh access token" (OAuth step 4; slides 46-47, 77).
// Send refresh_token to the token endpoint with grant_type=refresh_token.
// No authorization-code redirect or new user-consent page is needed here.
router.post('/refresh', async (req, res) => {
  const session = req.oauthDemo;
  if (!session.refreshToken) {
    session.notice = 'No refresh token yet. Authorize and exchange the code first.';
  } else {
    await requestTokens(req, { grant_type: 'refresh_token', refresh_token: session.refreshToken });
  }
  res.redirect(303, '/oauth#data');
});

// FEATURE: "Reset this demo". Revoke local tokens and clear this browser's log.
// This teaching convenience is not an OAuth protocol endpoint.
router.post('/reset', (req, res) => {
  clearGrant(req.oauthDemo);
  req.oauthDemo.events = [];
  req.oauthDemo.notice = 'Reset complete. Start again, or try denying consent / choosing profile-only access.';
  res.redirect(303, '/oauth');
});

module.exports = router;
