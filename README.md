# Express and OAuth Lecture Demo

Runnable examples for Lecture 9, including the Express material on slides 84–100. All student names and OAuth account data are fictional.

Requires Node.js 20 or newer. All demo files are included in this repository.

**OAuth simulation:** after starting the server, open http://127.0.0.1:3000/oauth . See [OAUTH-DEMO.md](OAUTH-DEMO.md) for a 6–8 minute walkthrough, source files, and slide references. No Spotify account or API key is needed.

## Run the demo

```sh
git clone https://github.com/EugeniaYang/inf133-express-oauth-demo.git
cd inf133-express-oauth-demo
npm ci
npm start
```

Open **http://127.0.0.1:3000** for all demo links. If dependencies are already installed, just run `npm start`.

The home page follows the main slide flow: Node/server basics → authentication and authorization → OAuth → OpenID Connect. The detailed Express examples are in an expandable lab, in appendix slide order. Each demo lists its source files; click a filename to read the actual annotated code in the browser. The bundled Node examples run separately on port 8080: `npm run demo:node` for Hello World, or `npm run demo:students` for the JSON example. Stop one before starting the other.

- Stop the server with Ctrl+C.
- After changing JavaScript or `students.json`, restart the server and refresh the browser.
- After changing Pug, CSS, or HTML, refresh the browser in development mode.
- If port 3000 is busy, run `PORT=3002 npm start` and open http://127.0.0.1:3002 .
- The original `node server.js` command still works; it delegates to `bin/www`.

## A five-minute Express walkthrough

1. **Hello world: 1 minute.** Open `/hello`, show `examples/hello.js`, and explain `app.get()` and `res.send()`.
2. **Routing: 1 minute.** Open `/students/list` and `/students/2`. Compare a fixed route with a parameter route.
3. **Pug: 2 minutes.** Open `/students`. Compare `res.render()`, `views/students.pug`, and `views/layout.pug`. Explain how data and a template become HTML.
4. **Middleware: 1 minute.** Show the request logs in the terminal and point out `app.use()` and `next()`.

Use the remaining examples as optional extensions during the 80-minute lecture.

## Slides → demo → source

| PDF slide | Topic | Browser URL or action | Source |
| --- | --- | --- | --- |
| 84 | `express()`, `get()`, `send()`, `listen()` | `/hello`; or run `npm run demo:hello` and open http://127.0.0.1:3001 | `examples/hello.js`, `routes/index.js` |
| 85 | Installing Express | Inspect `package.json`, `package-lock.json`, and `node_modules`; installation command: `npm install express` | `package.json` |
| 86 | GET / POST / PUT / DELETE / ALL | Expand the Express lab and use section B; PATCH uses the `all()` fallback | `routes/examples.js`, `public/javascripts/demo.js` |
| 87 | `request.params`, `request.query` | `/user/2?foo=9&course=INF133` | `routes/users.js` |
| 87, 99 | `request.body` | Submit the HTML form and JSON form in Express lab section C; both send to `/echo` | `app.js`, `routes/examples.js` |
| 88 | `status()`, `write()`, `end()`, `send()` | `/response`; compare with `/hello` | `routes/examples.js` |
| 89 | `all()` middleware, adding properties, `next()` | Click a method button and inspect the middleware field; also inspect terminal logs | `routes/examples.js`, `app.js` |
| 90 | Stopping or continuing a request | `/middleware/private`: 401 without the demo cookie; continue after setting it; 401 again after clearing it | `routes/middleware.js`, `views/private.pug` |
| 91, 95 | `express.static()` | `/welcome.html`, `/stylesheets/style.css`, `/javascripts/demo.js` | `app.js`, `public/` |
| 92 | Student list and ID lookup | `/students/list`, `/students/2`, `/students/999` | `routes/students.js`, `in4matx133.js` |
| 93–95 | Generator project structure | Compare the directory tree below; this project follows the same basic organization | Project directory |
| 96 | `express.Router()`, `module.exports` | The index router renders the home page; another router handles `/users` | `routes/index.js`, `routes/users.js` |
| 97–98 | Pug, `extends`, `block`, template variables | The home and student pages share a layout; View Page Source shows generated HTML | `views/layout.pug`, `views/index.pug`, `views/students.pug` |
| 99 | Routers, body parsers, cookie parser, static middleware | Follow the order in `app.js`, then submit a form or try the cookie example | `app.js` |
| 100 | `bin/www`, HTTP server, port, error / listening events | Run `npm start` and inspect startup logs; optionally use `PORT=3002 npm start` | `bin/www`, `server.js` |

Slide numbers refer to the shared l9-server_authentication.pdf. Edited Keynote slide numbers may differ; use the slide titles to match them.

## How the examples work

### Read the code alongside the page

Search for **FEATURE:** in the source. Each section names the page, button, or response it implements, with the corresponding route and slide references where applicable. OAuth comments distinguish client-backend code from provider code and label Reset/Expire as classroom controls. Pug uses `//-` comments, which are not included in the generated HTML.

Suggested reading order: `app.js` → the relevant file in `routes/` → its Pug template. For OAuth: `views/oauth.pug` → `oauth/client.js` → `oauth/provider.js`. See `public/javascripts/demo.js` for the home page's browser-side fetch calls.

### URL parameters and query strings

Open http://127.0.0.1:3000/user/2?foo=9 . The response contains `params.user_id` as the string `2`, `query.foo` as the string `9`, and Bob's record. `/users/2` also works: `app.js` mounts the same router at both prefixes to match the slides' singular `/user` and the generator's plural `/users`.

### HTML forms and JSON bodies

Both forms on the home page send to `/echo`. `express.urlencoded()` parses the HTML form body; `express.json()` parses the JSON body. Compare the returned `contentType` and `body` fields.

### HTTP methods and middleware

The method buttons return the matching handler and request data. They do not modify the student list. GET, POST, PUT, and DELETE match their corresponding routes; PATCH reaches the final `all()` handler.

The first `all()` adds `req.demoMessage` for every method, then calls `next()` to continue. The fetch calls in `public/javascripts/demo.js` run in the browser; the JavaScript in `routes/` runs in Node.

### Cookie gate

This marker cookie demonstrates middleware control flow. It does not validate a password, establish identity, or implement a real login session. `cookie-parser` parses the Cookie header into `req.cookies`.

Walkthrough: no cookie → 401; submit the form → set cookie and continue; clear cookie → 401 again. Use a fictional name such as Alice.

## Corrections and adaptations from the slides

- **Slide 88:** `res.write()` returns a boolean, so `res.write(...).write(...).end()` is invalid. This demo uses separate `write()` calls followed by `end()`. `res.status(200).send(...)` can be chained.
- **Slide 99:** `express.urlencoded()` parses incoming URL-encoded form bodies; it does not encode URLs.
- **Slide 91:** Only `public/` is served as static content, rather than exposing the entire source directory.
- **Slide 92:** This demo implements the missing `in4matx133` helper. Missing students return 404 rather than the slide's 400. The fixed `/list` route is registered before `/:id`.
- **Slide 94:** A global generator installation is unnecessary for this demo. To explore the generator separately, use `npx express-generator --view=pug another-demo` in a fresh directory.
- Examples use `const` and straight quotation marks. The variable `app` represents the same kind of Express object as `expressApp` in the slides.

## Project structure

```text
express-demo/
├── app.js                     # Configure middleware and mount routers
├── bin/www                    # Start the HTTP server (npm start)
├── server.js                  # Preserve the original startup command
├── examples/hello.js          # Minimal standalone example from slide 84
├── examples/node/             # Bundled Node HTTP and JSON-reading examples
├── in4matx133.js              # Student lookup helper from slide 92
├── students.json              # Fictional student names
├── oauth/
│   ├── client.js              # Client backend and OAuth walkthrough
│   ├── provider.js            # Mock authorization and resource servers
│   └── config.js              # Local client configuration and PKCE helpers
├── routes/
│   ├── index.js               # Home page, hello, original JSON endpoint
│   ├── users.js               # params / query
│   ├── students.js            # Student page, list, ID lookup
│   ├── examples.js            # HTTP methods, body, response
│   ├── middleware.js          # Cookie gate
│   └── source.js              # Allowlisted, read-only source viewer
├── views/
│   ├── layout.pug             # Shared HTML layout
│   ├── index.pug              # Demo directory
│   ├── students.pug           # Student list
│   ├── private.pug            # Cookie gate result
│   ├── error.pug              # Error page
│   ├── oauth.pug              # OAuth walkthrough
│   ├── oauth-consent.pug      # Mock provider's consent page
│   └── source.pug             # Escaped source text for classroom viewing
├── public/
│   ├── welcome.html           # Static HTML
│   ├── stylesheets/style.css
│   └── javascripts/demo.js    # Browser-side fetch
├── test/
│   ├── demo.test.js           # Express integration checks
│   └── oauth.test.js          # OAuth integration checks
├── OAUTH-DEMO.md              # OAuth teaching guide
├── source-files.js            # Explicit source-file map used by the guide
└── package.json
```

The Node and file-reading examples (`hello.js`, `setup1.js`, `solution1.js`, and `133_class.json`) are bundled under `examples/node/`. The JSON solution resolves its data path relative to its own file so it can run from the repository root. See [OAUTH-DEMO.md](OAUTH-DEMO.md) for the OAuth simulation.

## Credits

The bundled Node exercise is adapted from the INF133 lecture demo provided by Travis Linden Reid: [W4_L2_Oct22_ServerAuth](https://github.com/travislindenreid/INF33-Demos/tree/main/W4_L2_Oct22_ServerAuth). The lecture sequence and slide references follow the supplied Lecture 9 materials. This repository adds the Express teaching guide and a fictional local OAuth simulation; it does not include the lecture slides or connect to Spotify.

## Verification

```sh
npm test
```

Tests use temporary local ports and shut down afterward, leaving the classroom port available.

References: [Express API](https://expressjs.com/en/5x/api/), [Express generator](https://expressjs.com/en/starter/generator/), [cookie-parser](https://expressjs.com/en/resources/middleware/cookie-parser/), [Node HTTP response.write](https://nodejs.org/api/http.html#responsewritechunk-encoding-callback).
