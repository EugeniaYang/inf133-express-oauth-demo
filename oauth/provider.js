// MOCK PROVIDER: this file plays the role of the external service.
// AUTHORIZATION SERVER: /authorize displays consent; /token issues tokens.
// RESOURCE SERVER: /api/me and /api/playlists check access tokens and scopes.
// Everything is fictional; Alice is assumed to be signed in before consent.
const express = require('express');
const {
  CLIENT_ID, CLIENT_SECRET, SCOPES, ACCESS_LIFETIME, randomToken, challenge, origin
} = require('./config');
const router = express.Router();
// Three different kinds of server-side records; none of these tokens are JWTs.
const codes = new Map();
const accessTokens = new Map();
const refreshTokens = new Map();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// FEATURE: validate the request before displaying consent or returning a code.
// Match the registered local client, callback address, scopes, and PKCE method.
// Returning null results in a local 400, rather than redirecting to an unknown URL.
function authorizationRequest(req, input) {
  if (input.client_id !== CLIENT_ID || input.response_type !== 'code' ||
      input.redirect_uri !== origin(req) + '/oauth/callback' ||
      typeof input.state !== 'string' || !input.state ||
      input.code_challenge_method !== 'S256' ||
      typeof input.code_challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.code_challenge)) {
    return null;
  }
  if (typeof input.scope !== 'string') return null;
  const scopes = input.scope.split(' ').filter(Boolean);
  if (!scopes.length || scopes.some((scope) => !SCOPES.includes(scope))) return null;
  return {
    clientId: input.client_id, redirectUri: input.redirect_uri,
    scope: [...new Set(scopes)].join(' '), state: input.state,
    codeChallenge: input.code_challenge
  };
}

// FEATURE: the "Mock Music Service" consent screen.
// GET /mock-provider/authorize is reached after the client's Connect redirect.
router.get('/authorize', (req, res) => {
  const request = authorizationRequest(req, req.query);
  if (!request) return res.status(400).send('Invalid local authorization request.');
  res.render('oauth-consent', { title: 'Mock Music Service · Authorize', request });
});

// FEATURE: "Allow access" / "Deny" buttons on views/oauth-consent.pug.
// Both submit here. Send a code or an access_denied error back through the browser.
router.post('/authorize', (req, res) => {
  const request = authorizationRequest(req, req.body || {});
  if (!request) return res.status(400).send('Invalid local authorization request.');
  const callback = new URL(request.redirectUri);
  callback.searchParams.set('state', request.state);
  if (req.body.decision !== 'approve') {
    callback.searchParams.set('error', 'access_denied');
  } else {
    const code = randomToken('code_');
    // Bind this one-time code to its redirect URI, granted scope, and PKCE hash.
    codes.set(code, { ...request, expiresAt: Date.now() + 5 * 60 * 1000 });
    callback.searchParams.set('code', code);
  }
  res.redirect(303, callback.href);
});

// FEATURE: issue the two token values shown under "Inspect this demo's tokens".
// Access token → API permission + expiry; refresh token → obtain a new token pair.
// grantId groups records so Reset can revoke only this browser's grant.
function tokenPair(grantId, scope) {
  const accessToken = randomToken('at_');
  const refreshToken = randomToken('rt_');
  accessTokens.set(accessToken, { grantId, scope, expiresAt: Date.now() + ACCESS_LIFETIME * 1000 });
  refreshTokens.set(refreshToken, { grantId, scope });
  return { access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_LIFETIME,
    refresh_token: refreshToken, scope };
}

// FEATURE: receive the backend's code-exchange OR refresh request.
// POST /mock-provider/token is called by oauth/client.js, not by a page form.
router.post('/token', (req, res) => {
  const expected = 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
  // This checks the CLIENT APP's credentials, not Alice's password or identity.
  if (req.get('Authorization') !== expected) {
    res.set('WWW-Authenticate', 'Basic realm="mock-token"');
    return res.status(401).json({ error: 'invalid_client' });
  }
  const body = req.body || {};
  // BRANCH A: first exchange. Check code, expiry, redirect URI, and PKCE verifier.
  if (body.grant_type === 'authorization_code') {
    const record = codes.get(body.code);
    if (!record || record.expiresAt <= Date.now() || record.redirectUri !== body.redirect_uri ||
        typeof body.code_verifier !== 'string' || challenge(body.code_verifier) !== record.codeChallenge) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code expired, reused, or not bound to this request.' });
    }
    codes.delete(body.code); // A code can be exchanged only once.
    return res.json(tokenPair(randomToken('grant_'), record.scope));
  }
  // BRANCH B: later refresh. No authorization code is needed for this branch.
  if (body.grant_type === 'refresh_token') {
    const record = refreshTokens.get(body.refresh_token);
    if (!record) return res.status(400).json({ error: 'invalid_grant' });
    refreshTokens.delete(body.refresh_token); // Rotate this demo's refresh token.
    return res.json(tokenPair(record.grantId, record.scope));
  }
  res.status(400).json({ error: 'unsupported_grant_type' });
});

// FEATURE: API responses 200 vs 401 vs 403.
// Missing/expired/revoked access token → 401; missing permission → 403.
// A valid token with the needed scope calls next() and reaches the data handler.
function requireScope(scope) {
  return (req, res, next) => {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const record = accessTokens.get(token);
    if (!record || record.expiresAt <= Date.now()) {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      return res.status(401).json({ error: 'invalid_token', message: 'Missing, expired, or revoked access token.' });
    }
    if (!record.scope.split(' ').includes(scope)) {
      res.set('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${scope}"`);
      return res.status(403).json({ error: 'insufficient_scope', required_scope: scope });
    }
    next();
  };
}

// FEATURE: fictional profile / playlist JSON displayed on the client page.
// requireScope() runs before each handler, so rejected requests never reach res.json().
router.get('/api/me', requireScope('profile:read'), (req, res) => {
  res.json({ id: 'alice-demo', display_name: 'Alice', account: 'Fictional classroom account' });
});

router.get('/api/playlists', requireScope('playlists:read'), (req, res) => {
  res.json({ items: [{ id: 'p1', name: 'Study music' }, { id: 'p2', name: 'Lecture break' }] });
});

// Teaching controls, NOT OAuth endpoints. Never applied to real tokens.
function expireAccess(token) {
  const record = accessTokens.get(token);
  if (record) record.expiresAt = 0;
}

// FEATURE: the client's "Access token status" label, for this local simulation.
// A real client would not directly inspect a remote provider's in-memory records.
function tokenStatus(token) {
  const record = accessTokens.get(token);
  if (!record) return 'None / revoked';
  return record.expiresAt > Date.now() ? 'Valid' : 'Expired';
}

// FEATURE: Reset invalidates old access/refresh tokens from the same grant.
// Other browser sessions' tokens remain valid.
function revokeDemo({ accessToken, refreshToken, code }) {
  const grantId = accessTokens.get(accessToken)?.grantId || refreshTokens.get(refreshToken)?.grantId;
  if (grantId) {
    for (const [token, record] of accessTokens) if (record.grantId === grantId) accessTokens.delete(token);
    for (const [token, record] of refreshTokens) if (record.grantId === grantId) refreshTokens.delete(token);
  }
  codes.delete(code);
}

module.exports = { router, expireAccess, tokenStatus, revokeDemo };
