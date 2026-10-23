# OAuth 2.0 Local Simulation: A 6–8 Minute Walkthrough

## Start

Run `npm start` in the express-demo folder and open **http://127.0.0.1:3000/oauth**. Stop any older instance with Ctrl+C before restarting. No additional dependencies, Spotify account, internet connection, or API key are needed once the project dependencies are installed.

All accounts, data, and tokens are fictional. This simulates the OAuth Authorization Code flow without connecting to Spotify or implementing real identity authentication. Alice is assumed to be signed in at the mock provider, so the consent page does not request a password.

## Walkthrough

1. **Request without a token: about 30 seconds.** Click **Request profile** and observe HTTP 401.
2. **Ask for permission: about 1 minute.** Click **Connect Mock Music Service**. The browser opens the mock provider's consent page. Explain that Alice is granting permissions to Lecture Music App, then click **Allow access**.
3. **Receive a code: about 1 minute.** Expand **See the callback URL** and identify the code. The app has a code, but it has no access token yet and cannot retrieve protected data.
4. **Exchange the code: about 1 minute.** Click **Exchange code for tokens**. Expand **Inspect this demo's tokens** to compare access and refresh tokens. The backend sends the one-time code to the token endpoint using POST. **Follow the requests** shows the direction and result of each call.
5. **Access the API: about 1 minute.** Click **Request profile** or **Request playlists** and observe HTTP 200 with fictional data. The backend sends `Authorization: Bearer access_token`; it does not use the refresh token to read data.
6. **Expire and refresh: about 1–2 minutes.** Click **Expire access token**, then **Retry profile request** to get 401. Click **Refresh access token**, then request the profile again to get 200. No new consent interaction is required in this flow.
7. **Optional scope example.** Reset, select **Profile only**, authorize again, and exchange the code. Profile access returns 200; playlist access returns 403. Having an access token does not grant every permission.
8. **Optional denial example.** Reset and reconnect. Click **Deny** on the consent page. No code or tokens are issued.

## Questions to ask students

- Who is communicating now: the browser, the client backend, the authorization server, or the resource API?
- Is this step sending a code, an access token, or a refresh token?
- Why can't the client use the authorization code directly to read profile data?
- Why might a valid access token still receive a 403 response?

## Source files and roles

| File | Role | Main responsibilities |
| --- | --- | --- |
| `oauth/client.js` | Your application's backend | Connect, callback, code exchange, API forwarding, refresh |
| `oauth/provider.js` | Mock authorization and resource servers | Consent, one-time codes, token endpoint, Bearer and scope checks |
| `oauth/config.js` | Shared local configuration | Fictional client ID, generated server-only secret, PKCE, local URLs |
| `views/oauth-consent.pug` | Mock provider's consent page | Allow or deny permissions |
| `views/oauth.pug` | Client application page | Step-by-step controls, request log, results |

For convenience, the server roles run in one Express process and use separate `/oauth` and `/mock-provider` paths. The client backend still makes actual HTTP POST and GET requests to the mock provider. Real applications commonly run these roles as separate services.

## Matching the slides

- **Slides 35–37:** Roles, authorization code, access token, refresh token, and the four-step flow.
- **Slides 39–47:** Authorization, token exchange, API requests, and refresh.
- **Slides 54–56:** Browser redirects to the provider and back to the client callback; subsequent resource requests pass through the client backend.
- **Slides 67–77:** Query parameters, callback code, token endpoint POST bodies, Basic client authentication, and the Bearer header.

## Teaching simplifications

- Accounts and data are fictional. The demo does not implement real login, registration, persistence, or a production authorization service. Restarting clears the simulation state.
- The app deliberately pauses after the callback until you click **Exchange**. Real applications usually exchange the code automatically.
- Tokens are stored in memory. The visible token values are fake and cannot be used with real services.
- Access tokens last 90 seconds. **Expire** moves the mock token's expiration time into the past; this is a teaching control, not an OAuth protocol endpoint.
- This provider rotates its refresh token on every refresh. That is a policy of this example, rather than a claim that every provider behaves identically.
- The implementation includes state checking, PKCE S256, a client secret, redirect URI binding, and one-time codes. These details can be left for follow-up questions during the initial walkthrough.
- The simulation uses local loopback HTTP and is not intended for production deployment. Real services must meet OAuth transport and security requirements.
- This demonstrates authorization, not OpenID Connect login.

References: [Authorization Code](https://www.rfc-editor.org/rfc/rfc6749#section-4.1), [Refresh](https://www.rfc-editor.org/rfc/rfc6749#section-6), [Bearer tokens](https://www.rfc-editor.org/rfc/rfc6750#section-2.1), [PKCE](https://www.rfc-editor.org/rfc/rfc7636).
