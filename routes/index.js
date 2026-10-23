const express = require('express');
const { students } = require('../students.json');
const sourceFiles = require('../source-files');
const router = express.Router();

// FEATURE: the demo directory at GET / (slide 96).
// title becomes a template variable in views/index.pug.
router.get('/', (req, res) => {
  res.render('index', { title: 'Lecture 9 · Server-side Development & OAuth', sourceFiles });
});

// FEATURE: "Hello world" link → GET /hello → send text directly (slide 84).
router.get('/hello', (req, res) => {
  res.send('hello world');
});

// FEATURE: "View the same names as JSON" on the student page.
// res.json() returns data; res.render() instead turns data into an HTML page.
router.get('/api/students', (req, res) => {
  res.json({ students });
});

module.exports = router;
