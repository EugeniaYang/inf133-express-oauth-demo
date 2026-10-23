const express = require('express');
const router = express.Router();

// FEATURE: the "middleware" field in every HTTP method button's result.
// Slides 86, 89: all() adds a property for every method; next() continues routing.
router.all('/methods', (req, res, next) => {
  req.demoMessage = 'Added by middleware before the route handler';
  next();
});

function methodResult(req, handler) {
  return { method: req.method, handler, middleware: req.demoMessage, body: req.body || null };
}

// FEATURE: GET / POST / PUT / DELETE buttons on the home page (slide 86).
// The URL stays /methods; only the HTTP method changes which handler answers.
// These handlers report the method and body; they do not modify student records.
router.get('/methods', (req, res) => {
  res.json(methodResult(req, 'router.get'));
});

router.post('/methods', (req, res) => {
  res.json(methodResult(req, 'router.post'));
});

router.put('/methods', (req, res) => {
  res.json(methodResult(req, 'router.put'));
});

router.delete('/methods', (req, res) => {
  res.json(methodResult(req, 'router.delete'));
});

// FEATURE: the PATCH button demonstrates the all() fallback.
// No PATCH-specific handler matched, so routing reaches this final all().
router.all('/methods', (req, res) => {
  res.json(methodResult(req, 'router.all fallback'));
});

// FEATURE: "Submit form" and "Send JSON" both POST to /echo (slides 87, 99).
// app.js has already parsed the form or JSON into req.body before this handler.
router.post('/echo', (req, res) => {
  res.json({ contentType: req.get('Content-Type'), body: req.body });
});

// FEATURE: "Write a response in parts" link → GET /response (slide 88).
// status() sets the HTTP code; write() appends body data; end() finishes it.
// write() returns a boolean, so it cannot be chained as res.write(...).write(...).
router.get('/response', (req, res) => {
  res.status(200).type('text/plain');
  res.write('First part of the response.\n');
  res.write('Second part of the response.\n');
  res.end('Done.\n');
});

module.exports = router;
