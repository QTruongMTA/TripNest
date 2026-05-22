# Admin Portal History

## 2026-05-19 - Login redirect and chunk cache issue

- Symptom: after a successful Admin Portal login, the browser could be sent back to `/login`.
- Cause: the session token was stored only in `localStorage`, while Next middleware protects `/admin/*` and `/operator/*` by checking the `portal_token` cookie. Middleware cannot read `localStorage`.
- Fix: `authStore.setSession()` now writes both `localStorage` and the `portal_token` cookie. Logout and API `401` cleanup remove both.

### ChunkLoadError prevention

- Do not run `next build` against `admin-portal` while `next dev -p 4000` is serving the same `.next` directory.
- If the browser shows `ChunkLoadError`, `Loading chunk failed`, or stale `_next/static/chunks/*` files, stop the Admin Portal server, delete `admin-portal/.next`, then restart the server.
- Preferred recovery command from `admin-portal`: `npm run dev:clean`.
- After recovery, hard refresh the browser tab so it no longer requests old chunk filenames.
