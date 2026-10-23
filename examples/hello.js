// Slide 84: a standalone, minimal Express app.
// FEATURE: the smallest route → response → listening example, without Pug or routers.
// Run with npm run demo:hello; the main demo uses port 3000.
const express = require('express');
const expressApp = express();

expressApp.get('/', (httpRequest, httpResponse) => {
  httpResponse.send('hello world');
});

expressApp.listen(3001, '127.0.0.1', () => {
  console.log('Hello-world demo: http://127.0.0.1:3001');
});
