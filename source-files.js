// Explicit source files for classroom viewing. Request input never becomes a path.
const path = require('node:path');
const files = {
  'node-hello': ['examples/node/hello.js', 'Node', 'Node HTTP server and Hello World', 'server'],
  'node-starter': ['examples/node/setup1.js', 'Node', 'Starter for the file-reading exercise', 'server'],
  'node-students': ['examples/node/solution1.js', 'Node', 'Read JSON and return student names', 'server'],
  'node-data': ['examples/node/133_class.json', 'Data', 'Input for the original Node example', 'server'],
  'express-hello': ['examples/hello.js', 'Node / Express', 'Minimal standalone Express server', 'express'],
  app: ['app.js', 'Node / Express', 'Parsers, static middleware, and router mounting', 'express'],
  startup: ['bin/www', 'Node', 'HTTP server startup and port configuration', 'express'],
  'index-router': ['routes/index.js', 'Node / Express', 'Home page, Hello World, and JSON endpoint', 'express'],
  'users-router': ['routes/users.js', 'Node / Express', 'URL parameters and query strings', 'express'],
  'students-router': ['routes/students.js', 'Node / Express', 'Student page, list, and ID lookup', 'express'],
  'student-helper': ['in4matx133.js', 'Node', 'Student lookup functions', 'express'],
  'examples-router': ['routes/examples.js', 'Node / Express', 'HTTP methods, request bodies, and responses', 'express'],
  'middleware-router': ['routes/middleware.js', 'Node / Express', 'Cookie gate: return early or call next()', 'express'],
  'browser-js': ['public/javascripts/demo.js', 'Browser JavaScript', 'Method buttons and JSON-form fetch requests', 'express'],
  'pug-layout': ['views/layout.pug', 'Pug on the server', 'Shared HTML layout and block content', 'express'],
  'pug-students': ['views/students.pug', 'Pug on the server', 'Generate a student list from data', 'express'],
  'pug-home': ['views/index.pug', 'Pug on the server', 'This lecture guide and its forms', 'express'],
  'static-html': ['public/welcome.html', 'Browser HTML', 'A file served directly by express.static()', 'express'],
  'oauth-client': ['oauth/client.js', 'Client backend in Node', 'Connect, callback, exchange, API, refresh, reset', 'oauth'],
  'oauth-provider': ['oauth/provider.js', 'Mock provider in Node', 'Consent, code/token issuance, Bearer and scope checks', 'oauth'],
  'oauth-config': ['oauth/config.js', 'Node', 'Fictional client configuration and PKCE helpers', 'oauth'],
  'oauth-view': ['views/oauth.pug', 'Pug on the server', 'OAuth buttons, status, and request log', 'oauth'],
  'oauth-consent': ['views/oauth-consent.pug', 'Pug on the server', 'Provider consent form: allow or deny', 'oauth']
};

module.exports = Object.fromEntries(Object.entries(files).map(([id, [label, runtime, feature, section]]) => [
  id, { label, runtime, feature, section, path: path.join(__dirname, label) }
]));
