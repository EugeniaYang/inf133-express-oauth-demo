const express = require('express');
const fs = require('node:fs/promises');
const sourceFiles = require('../source-files');
const router = express.Router();

// FEATURE: each source-file link on the lecture guide opens the actual annotated file.
// Only IDs in the explicit map are readable; arbitrary file paths are not accepted.
router.get('/:id', async (req, res) => {
  if (!Object.hasOwn(sourceFiles, req.params.id)) {
    return res.status(404).render('error', { title: 'Source not found', message: 'Choose a file from the lecture guide.' });
  }
  const file = sourceFiles[req.params.id];
  const source = await fs.readFile(file.path, 'utf8');
  res.set('Cache-Control', 'no-store');
  res.render('source', { title: file.label + ' · Source', file, source });
});

module.exports = router;
