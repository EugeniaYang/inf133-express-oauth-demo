// This file runs in the BROWSER. routes/*.js run in Node on the SERVER.
// FEATURE: put HTTP status and response data into the page's result box.
// fetch() sends a request; textContent displays its result without rendering HTML.
async function showResponse(url, options, output) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let body = text;
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      body = JSON.stringify(JSON.parse(text), null, 2);
    }
    output.textContent = `HTTP ${response.status}\n${body}`;
  } catch (err) {
    output.textContent = `Request failed: ${err.message}`;
  }
}

// FEATURE: the GET / POST / PUT / DELETE / PATCH buttons in views/index.pug.
// data-method on each button determines the request method sent to /methods.
document.querySelectorAll('[data-method]').forEach((button) => {
  button.addEventListener('click', async () => {
    const method = button.dataset.method;
    const options = { method };
    if (method !== 'GET') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify({ message: 'Hello from the browser' });
    }
    button.disabled = true;
    await showResponse('/methods', options, document.querySelector('#method-result'));
    button.disabled = false;
  });
});

// FEATURE: "Send JSON" in the home page's second form.
// Prevent the normal form navigation, serialize the inputs, and POST JSON to /echo.
// Compare with the first form: the browser submits that one normally as form data.
document.querySelector('#json-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  await showResponse('/echo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, document.querySelector('#body-result'));
});
