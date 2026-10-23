const { randomBytes, createHash } = require('node:crypto');

// Fictional client credentials shared by our local client and mock provider.
// The secret is generated on startup, stays on the server, and is never rendered.
const CLIENT_ID = 'lecture-music-app';
const CLIENT_SECRET = randomBytes(32).toString('base64url');
const SCOPES = ['profile:read', 'playlists:read'];
const ACCESS_LIFETIME = 90; // Seconds, deliberately short for class.

// FEATURE: different opaque values for codes, access tokens, refresh tokens,
// state, and session IDs. Prefixes help students distinguish these fake values.
function randomToken(prefix) {
  return prefix + randomBytes(24).toString('base64url');
}

// FEATURE: PKCE S256. The client sends this hash during authorization;
// the provider compares it with the hash of the verifier during code exchange.
function challenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

// Use the actual local listener, never an incoming Host header.
function origin(req) {
  return `http://127.0.0.1:${req.socket.localPort}`;
}

module.exports = { CLIENT_ID, CLIENT_SECRET, SCOPES, ACCESS_LIFETIME, randomToken, challenge, origin };
