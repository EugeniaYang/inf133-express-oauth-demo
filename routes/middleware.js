const express = require('express');
const router = express.Router();

// FEATURE: "Open the middleware gate" → GET /middleware/private (slides 90, 99).
// No marker cookie: return 401 immediately. Cookie present: attach req.demoUser
// and call next() so the route below can render the allowed page.
// This is a classroom marker, NOT verified identity or a real login session.
function requireDemoCookie(req, res, next) {
  if (!req.cookies.demo_user) {
    return res.status(401).render('private', { title: 'Middleware gate', demoUser: null });
  }
  req.demoUser = req.cookies.demo_user;
  next();
}

// The function above runs BEFORE this final route handler.
router.get('/private', requireDemoCookie, (req, res) => {
  res.render('private', { title: 'Middleware gate', demoUser: req.demoUser });
});

// FEATURE: "Set demo cookie and retry" form on the blocked page.
// The 303 redirect tells the browser to GET /middleware/private after setting it.
router.post('/login', (req, res) => {
  const name = req.body && req.body.name;
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).send('Please enter a demo name.');
  }
  res.cookie('demo_user', name.trim().slice(0, 40), { httpOnly: true, sameSite: 'lax' });
  res.redirect(303, '/middleware/private');
});

// FEATURE: "Clear cookie and try again" makes the next gate check fail again.
router.post('/logout', (req, res) => {
  res.clearCookie('demo_user');
  res.redirect(303, '/middleware/private');
});

module.exports = router;
