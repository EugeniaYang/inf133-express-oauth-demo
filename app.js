// SERVER ENTRY MAP: this file configures the app; bin/www starts listening.
// Read in order: template setup → middleware → routers → error responses.
const express = require('express');
const path = require('node:path');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const studentsRouter = require('./routes/students');
const examplesRouter = require('./routes/examples');
const middlewareRouter = require('./routes/middleware');
const oauthClient = require('./oauth/client');
const oauthProvider = require('./oauth/provider');
const sourceRouter = require('./routes/source');

const app = express();

// FEATURE: Pug pages (slides 97-98).
// res.render('students', data) will load views/students.pug using these settings.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// FEATURE: terminal request log (slides 89-90).
// Every incoming request reaches this middleware before a route can answer it.
app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});

// FEATURE: the home page's JSON form, HTML form, and cookie gate (slide 99).
// Each parser attaches incoming data to a different property on req.
// Content-Type: application/json → req.body.
app.use(express.json());
// Content-Type: application/x-www-form-urlencoded → req.body.
app.use(express.urlencoded({ extended: false }));
// Cookie header → req.cookies; also used to find an OAuth demo session.
app.use(cookieParser());

// FEATURE: /welcome.html, page styling, and browser-side button handlers.
// /stylesheets/style.css maps to public/stylesheets/style.css (slides 91, 95, 99).
app.use(express.static(path.join(__dirname, 'public')));

// FEATURE MAP: a mounted prefix is combined with each router's local path.
// Example: /students + /:id in routes/students.js becomes GET /students/:id.
// Slides 96, 99: import routers and mount them at URL prefixes.
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/user', usersRouter); // Singular URL used in slide 87.
app.use('/students', studentsRouter);
app.use('/', examplesRouter);
app.use('/middleware', middlewareRouter);
// FEATURE: OAuth walkthrough and provider consent page.
// /oauth/* = our client app; /mock-provider/* = the simulated external service.
app.use('/oauth', oauthClient);
app.use('/mock-provider', oauthProvider.router);
// FEATURE: read-only source viewer for the files linked from the lecture guide.
app.use('/source', sourceRouter);

// FEATURE: a helpful 404 page when no earlier route handled the URL.
app.use((req, res) => {
  res.status(404).render('error', { title: '404 Not Found', message: 'No route matches this URL.' });
});

app.get('/error', (req, res) => {
  res.status(500).render('error', { title: '500 Internal Server Error', message: 'This is a test error page.' });
});

// FEATURE: error responses, including malformed JSON submitted to /echo.
// Four arguments identify this as Express error-handling middleware.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).render('error', { title: 'Request error', message: err.message });
});

module.exports = app;
