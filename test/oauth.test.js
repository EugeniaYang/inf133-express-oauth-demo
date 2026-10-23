const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const app = require('../app');
const { CLIENT_ID, CLIENT_SECRET, challenge, randomToken } = require('../oauth/config');
const provider = require('../oauth/provider');
let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});

function form(path, body, cookie, extra = {}) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (cookie) headers.Cookie = cookie;
  return fetch(base + path, { method: 'POST', headers, body: new URLSearchParams(body), redirect: 'manual', ...extra });
}

async function newBrowser() {
  const response = await fetch(base + '/oauth');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /LOCAL SIMULATION/);
  return response.headers.get('set-cookie').split(';')[0];
}

async function authorize(cookie, { scope = 'profile:read playlists:read', decision = 'approve' } = {}) {
  const connect = await fetch(`${base}/oauth/connect?scope=${encodeURIComponent(scope)}`, {
    headers: { Cookie: cookie }, redirect: 'manual'
  });
  const authorizationUrl = new URL(connect.headers.get('location'));
  assert.equal(authorizationUrl.origin, base);
  const consent = await fetch(authorizationUrl);
  assert.equal(consent.status, 200);
  assert.match(await consent.text(), /Alice is a fictional/);
  const approved = await form('/mock-provider/authorize', {
    ...Object.fromEntries(authorizationUrl.searchParams), decision
  });
  const callback = approved.headers.get('location');
  assert.equal(new URL(callback).origin, base);
  const received = await fetch(callback, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(received.status, 303);
  return callback;
}

async function dashboard(cookie) {
  return (await fetch(base + '/oauth', { headers: { Cookie: cookie } })).text();
}

function tokensFrom(html) {
  return { access: html.match(/at_[A-Za-z0-9_-]+/)?.[0], refresh: html.match(/rt_[A-Za-z0-9_-]+/)?.[0] };
}

function tokenRequest(parameters, authorization = 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) {
  return form('/mock-provider/token', parameters, null, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authorization }
  });
}

test('client flow: code, tokens, API 200, expiration 401, refresh, and API 200 again', async () => {
  const cookie = await newBrowser();
  await form('/oauth/api', { resource: 'me' }, cookie);
  assert.match(await dashboard(cookie), /HTTP 401/);
  const callback = await authorize(cookie);
  assert.ok(new URL(callback).searchParams.get('code'));
  let html = await dashboard(cookie);
  assert.match(html, /Code received/);
  assert.equal(tokensFrom(html).access, undefined);
  await form('/oauth/exchange', {}, cookie);
  html = await dashboard(cookie);
  const original = tokensFrom(html);
  assert.ok(original.access && original.refresh);
  await form('/oauth/api', { resource: 'me' }, cookie);
  assert.match(await dashboard(cookie), /HTTP 200/);
  await form('/oauth/expire', {}, cookie);
  await form('/oauth/api', { resource: 'me' }, cookie);
  assert.match(await dashboard(cookie), /HTTP 401/);
  await form('/oauth/refresh', {}, cookie);
  const updated = tokensFrom(await dashboard(cookie));
  assert.notEqual(updated.access, original.access);
  assert.notEqual(updated.refresh, original.refresh);
  await form('/oauth/api', { resource: 'me' }, cookie);
  assert.match(await dashboard(cookie), /HTTP 200/);
  const oldRefresh = await tokenRequest({ grant_type: 'refresh_token', refresh_token: original.refresh });
  assert.equal(oldRefresh.status, 400);
  await form('/oauth/reset', {}, cookie);
  assert.equal((await fetch(base + '/mock-provider/api/me', { headers: { Authorization: 'Bearer ' + updated.access } })).status, 401);
  assert.equal(tokensFrom(await dashboard(cookie)).access, undefined);
});

test('consent denial issues no code or token; state mismatch is rejected', async () => {
  const cookie = await newBrowser();
  const callback = await authorize(cookie, { decision: 'deny' });
  assert.equal(new URL(callback).searchParams.get('error'), 'access_denied');
  const html = await dashboard(cookie);
  assert.match(html, /User denied permission/);
  assert.equal(tokensFrom(html).access, undefined);
  const invalid = await fetch(base + '/oauth/callback?code=bad&state=wrong', { headers: { Cookie: cookie } });
  assert.equal(invalid.status, 400);
});

test('profile-only consent leads to playlists 403; refresh token cannot access API', async () => {
  const cookie = await newBrowser();
  await authorize(cookie, { scope: 'profile:read' });
  await form('/oauth/exchange', {}, cookie);
  const tokens = tokensFrom(await dashboard(cookie));
  assert.equal((await fetch(base + '/mock-provider/api/me', { headers: { Authorization: 'Bearer ' + tokens.access } })).status, 200);
  assert.equal((await fetch(base + '/mock-provider/api/playlists', { headers: { Authorization: 'Bearer ' + tokens.access } })).status, 403);
  assert.equal((await fetch(base + '/mock-provider/api/me', { headers: { Authorization: 'Bearer ' + tokens.refresh } })).status, 401);
});

test('provider binds code to redirect and PKCE, checks client credentials, and rejects code reuse', async () => {
  const verifier = randomToken('');
  const parameters = {
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: base + '/oauth/callback',
    state: 'test-state', scope: 'profile:read', code_challenge_method: 'S256', code_challenge: challenge(verifier), decision: 'approve'
  };
  const consent = await form('/mock-provider/authorize', parameters);
  const code = new URL(consent.headers.get('location')).searchParams.get('code');
  const body = { grant_type: 'authorization_code', code, redirect_uri: parameters.redirect_uri, code_verifier: verifier };
  assert.equal((await tokenRequest(body, 'Basic invalid')).status, 401);
  assert.equal((await tokenRequest({ ...body, redirect_uri: base + '/wrong' })).status, 400);
  assert.equal((await tokenRequest({ ...body, code_verifier: 'wrong' })).status, 400);
  const exchanged = await tokenRequest(body);
  assert.equal(exchanged.status, 200);
  const tokens = await exchanged.json();
  assert.equal(tokens.expires_in, 90);
  assert.equal((await tokenRequest(body)).status, 400);
  provider.expireAccess(tokens.access_token);
  const expired = await fetch(base + '/mock-provider/api/me', { headers: { Authorization: 'Bearer ' + tokens.access_token } });
  assert.equal(expired.status, 401);
  assert.match(expired.headers.get('www-authenticate'), /invalid_token/);
});

test('provider rejects unregistered redirect URLs and unsupported scopes', async () => {
  const parameters = { client_id: CLIENT_ID, response_type: 'code', redirect_uri: 'https://example.com/callback',
    state: 'test', scope: 'profile:read', code_challenge_method: 'S256', code_challenge: challenge(randomToken('')) };
  let response = await fetch(base + '/mock-provider/authorize?' + new URLSearchParams(parameters), { redirect: 'manual' });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('location'), null);
  parameters.redirect_uri = base + '/oauth/callback';
  parameters.scope = 'admin';
  response = await fetch(base + '/mock-provider/authorize?' + new URLSearchParams(parameters));
  assert.equal(response.status, 400);
});

test('resetting one browser grant does not revoke a different browser grant', async () => {
  const cookies = [await newBrowser(), await newBrowser()];
  const tokens = [];
  for (const cookie of cookies) {
    await authorize(cookie);
    await form('/oauth/exchange', {}, cookie);
    tokens.push(tokensFrom(await dashboard(cookie)));
  }
  assert.notEqual(tokens[0].access, tokens[1].access);
  await form('/oauth/reset', {}, cookies[0]);
  assert.equal((await fetch(base + '/mock-provider/api/me', { headers: { Authorization: 'Bearer ' + tokens[0].access } })).status, 401);
  assert.equal((await fetch(base + '/mock-provider/api/me', { headers: { Authorization: 'Bearer ' + tokens[1].access } })).status, 200);
});

test('localhost entry is normalized before creating a callback session cookie', async () => {
  // fetch controls Host itself; use HTTP directly to emulate a localhost browser.
  const response = await new Promise((resolve, reject) => {
    http.get(base + '/oauth', { headers: { Host: 'localhost:' + server.address().port } }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    }).on('error', reject);
  });
  assert.equal(response.status, 303);
  assert.equal(response.headers.location, base + '/oauth');
  assert.equal(response.headers['set-cookie'], undefined);
});
