const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../app');
const { students } = require('../students.json');
let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

test('Pug renders shared layout and students; original names API still works', async () => {
  for (const route of ['/', '/students']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<html lang="en">/);
    assert.match(html, /stylesheets\/style.css/);
    if (route === '/students') {
      for (const name of students) assert.ok(html.includes(name));
      assert.ok(html.includes(`There are ${students.length} students.`));
    }
  }
  assert.deepEqual(await (await fetch(base + '/api/students')).json(), { students });
});

test('student fixed and parameter routes return success and not found', async () => {
  const list = await fetch(base + '/students/list');
  assert.equal(list.status, 200);
  assert.equal((await list.json()).length, students.length);
  assert.deepEqual(await (await fetch(base + '/students/2')).json(), { id: '2', name: 'Bob' });
  const missing = await fetch(base + '/students/999');
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), 'Not found');
});

test('mounted routers distinguish params from query', async () => {
  for (const prefix of ['/user', '/users']) {
    const response = await fetch(`${base}${prefix}/2?foo=9&course=INF133`);
    const data = await response.json();
    assert.deepEqual(data.params, { user_id: '2' });
    assert.deepEqual(data.query, { foo: '9', course: 'INF133' });
  }
});

test('method routes run middleware and use all() fallback for PATCH', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
    const options = { method };
    if (method !== 'GET') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify({ message: 'test' });
    }
    const response = await fetch(base + '/methods', options);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.method, method);
    assert.equal(data.handler, method === 'PATCH' ? 'router.all fallback' : `router.${method.toLowerCase()}`);
    assert.match(data.middleware, /Added by middleware/);
    if (method !== 'GET') assert.deepEqual(data.body, { message: 'test' });
  }
});

test('body parsers handle form and JSON; malformed JSON fails cleanly', async () => {
  for (const [contentType, body] of [
    ['application/json', JSON.stringify({ name: 'Alice', course: 'INF133' })],
    ['application/x-www-form-urlencoded', 'name=Alice&course=INF133']
  ]) {
    const response = await fetch(base + '/echo', { method: 'POST', headers: { 'Content-Type': contentType }, body });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).body, { name: 'Alice', course: 'INF133' });
  }
  const invalid = await fetch(base + '/echo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(invalid.status, 400);
});

test('cookie gate rejects, permits after setting cookie, and clears it on logout', async () => {
  assert.equal((await fetch(base + '/middleware/private')).status, 401);
  const setCookie = await fetch(base + '/middleware/login', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'name=Alice', redirect: 'manual'
  });
  assert.equal(setCookie.status, 303);
  assert.equal(setCookie.headers.get('location'), '/middleware/private');
  const cookie = setCookie.headers.get('set-cookie').split(';')[0];
  const allowed = await fetch(base + '/middleware/private', { headers: { Cookie: cookie } });
  assert.equal(allowed.status, 200);
  assert.match(await allowed.text(), /The demo name is Alice/);
  const cleared = await fetch(base + '/middleware/logout', {
    method: 'POST', headers: { Cookie: cookie }, redirect: 'manual'
  });
  assert.match(cleared.headers.get('set-cookie'), /^demo_user=;/);
  assert.equal((await fetch(base + '/middleware/private')).status, 401);
  const invalid = await fetch(base + '/middleware/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":[]}'
  });
  assert.equal(invalid.status, 400);
});

test('response methods finish correctly; static files do not expose source', async () => {
  const response = await fetch(base + '/response');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'First part of the response.\nSecond part of the response.\nDone.\n');
  assert.equal(await (await fetch(base + '/hello')).text(), 'hello world');
  for (const path of ['/welcome.html', '/stylesheets/style.css', '/javascripts/demo.js']) {
    assert.equal((await fetch(base + path)).status, 200);
  }
  for (const path of ['/app.js', '/package.json', '/students.json', '/missing']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
});

test('source viewer serves only listed files and escapes HTML source', async () => {
  const fs = require('node:fs');
  const sourceFiles = require('../source-files');
  for (const [id, file] of Object.entries(sourceFiles)) {
    assert.equal(fs.existsSync(file.path), true, `Missing source: ${file.label}`);
    const response = await fetch(base + '/source/' + id);
    assert.equal(response.status, 200, `Source viewer failed: ${file.label}`);
  }
  const htmlSource = await (await fetch(base + '/source/static-html')).text();
  assert.ok(htmlSource.includes('&lt;!doctype html&gt;'));
  assert.ok(!htmlSource.includes('<h1>Hello from a static HTML file</h1>'));
  for (const id of ['unknown', 'package.json', '__proto__', 'constructor', '%2e%2e%2fpackage.json', '%2fetc%2fpasswd']) {
    assert.equal((await fetch(base + '/source/' + id)).status, 404, `Unexpected source access: ${id}`);
  }
});
