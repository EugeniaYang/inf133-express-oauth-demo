const express = require('express');
const in4matx133 = require('../in4matx133');
const router = express.Router();

// FEATURE: GET /users. app.js supplies the /users prefix to this local '/' path.
router.get('/', (req, res) => {
  res.json(in4matx133.enrolledStudents());
});

// FEATURE: "Request parameters" link (slides 86-87).
// /user/2?foo=9 produces req.params.user_id === '2' and req.query.foo === '9'.
// Both /user and /users are mounted prefixes in app.js.
router.get('/:user_id', (req, res) => {
  res.json({
    params: req.params,
    query: req.query,
    user: in4matx133.isEnrolled(req.params.user_id)
  });
});

module.exports = router;
