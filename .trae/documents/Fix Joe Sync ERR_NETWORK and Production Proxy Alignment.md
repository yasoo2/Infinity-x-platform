## Diagnosis
- The frontend requests `http://localhost:4000/api/v1/chat-history/sessions` directly in dev, bypassing Vite proxy (`http://localhost:5173/api/...`), causing `ERR_NETWORK` when the backend isn’t reachable at that URL.
- In production, requests and Socket.IO must target `https://api.xelitesolutions.com`, not `www.xelitesolutions.com`. Any `/api` or `/socket.io` call to `www` returns 405 or fails WebSocket.

## Goals
1. Ensure dev uses Vite proxy for all REST calls and Socket.IO, never flipping `baseURL` to `http://localhost:4000` automatically.
2. Ensure production forces `api.xelitesolutions.com` for REST and Socket.IO from `www`/bare domain.
3. Make Joe resilient: graceful sync retries, clearer UI errors, and successful guest-token fallback.

## Frontend Changes
### 1) Stabilize Axios `baseURL` in dev
- File: `dashboard-x/src/api/client.js`
- Change: Lock `baseURL` to `window.location.origin` in dev (`import.meta.env.DEV`) and remove/guard any fallback logic that flips `baseURL` to `http://localhost:4000` on transient errors.
- Keep production override: if host is `www.xelitesolutions.com` or `xelitesolutions.com`, set `baseURL='https://api.xelitesolutions.com'`.

### 2) Socket.IO and WebSocket base resolution
- Files:
  - `dashboard-x/src/utils/websocket.js`
  - `dashboard-x/src/hooks/useJoeChat.js`
- Change: In dev, derive HTTP base from `apiClient.defaults.baseURL` or `window.origin` and preserve the Vite proxy; don’t rewrite to port `4000` unless truly necessary.
- In production, if host is `www.xelitesolutions.com` or bare domain, force HTTP base to `https://api.xelitesolutions.com` and SIO path to `/socket.io`.

### 3) Resilient session sync
- File: `dashboard-x/src/hooks/useJoeChat.js`
- Change: In `syncBackendSessions`:
  - Add exponential backoff on `ERR_NETWORK` (e.g., 1s, 2s, 4s, capped at 10s) before re-attempt.
  - Abort previous sync requests when new requests start.
  - If guest-token issuance fails, log a clear UI message and skip sync without breaking UI.

### 4) User-facing error messaging
- Files:
  - `dashboard-x/src/hooks/useJoeChat.js` (dispatch UI status)
  - `dashboard-x/src/components/joe/TopBar.jsx` (optional toast)
- Change: When `ERR_NETWORK` occurs, show a concise banner/toast: “فشل الاتصال بالخادم. تحقق من تشغيل الباكند أو إعدادات الـ API.”

## Backend Checks (no breaking changes)
### 5) Health and CORS
- File: `backend/src/api/health.router.mjs`
- Confirm existing CORS and that `GET /api/v1/health` returns `{ success: true }`.
- Ensure Render environment sets `CORS_ORIGINS` to include `https://www.xelitesolutions.com` and `https://xelitesolutions.com`.

### 6) Auth fallback for Super Admin
- File: `backend/src/api/auth.router.mjs`
- Keep the short-circuit login for Super Admin (email `info.auraaluxury@gmail.com`, password `younes2025`) so login works even if DB is temporarily unavailable.

## Cloudflare & Render Configuration
### 7) Cloudflare Pages
- Ensure SPA rewrites: all routes (e.g., `/dashboard/*`) fallback to `index.html` to avoid 404.
- Confirm Pages build injects `VITE_API_BASE_URL=https://api.xelitesolutions.com` (optional, redundancy to code guard).

### 8) Cloudflare DNS/Workers
- DNS: `api.xelitesolutions.com` points to Render service.
- Worker (if proxying): allow WebSocket upgrades on `/socket.io` and pass-through `Upgrade`/`Connection` headers.

### 9) Render Backend
- Environment vars:
  - `MONGO_URI` — MongoDB Atlas URI
  - `JWT_SECRET` — secure value
  - Optional: `OPENAI_API_KEY`/`GOOGLE_API_KEY`
- Verify service responds on `/api/v1/health`.

## Validation Plan
1. Dev: Run backend (`:4000`) + frontend (`:5173`), verify requests are `:5173/api/...`, Socket.IO connects, chat works; no `ERR_NETWORK`.
2. Production: From `https://www.xelitesolutions.com/dashboard`, login (Super Admin), activate provider, send a message; verify REST calls go to `https://api.xelitesolutions.com/api/v1/...` and Socket.IO to `wss://api.xelitesolutions.com/socket.io`.
3. Error cases: Temporarily stop backend, verify UI shows clear network error banner and retries don’t break the UI.

## Acceptance Criteria
- No direct REST calls to `www` in production; all to `api.xelitesolutions.com`.
- No direct `http://localhost:4000` flips in dev; dev uses proxy consistently.
- Joe responds to messages after provider activation; session history sync succeeds without `ERR_NETWORK`.
- UI shows clear message on network problems and recovers when backend returns.

## Next Steps
- Proceed to implement the frontend network base and SIO fixes, session sync backoff, and UI error messaging.
- Verify dev and prod behavior, then adjust Cloudflare/Render settings if needed.
- Share a short test report and logs from Browser Console and Network tab after deployment.