# Deployment

The site is deployed as a static site with GitHub Pages from a public repository.

- **Public URL:** https://devynx.github.io/vite-launcher-site/
- **Repository:** https://github.com/devynx/vite-launcher-site (public, branch `main`)
- **Deployed:** 2026-10-19
- **Pages configuration:** source `main` / repository root, build type `legacy`, HTTPS enforced
- **Account service:** `https://iljiovhwkrtfuvmhcfhn.supabase.co/functions/v1/vite-auth` (Supabase `vite-launcher`, `eu-north-1`)

## HTTP checks

| Path | Status | Content-Type |
| --- | --- | --- |
| `/` | 200 | `text/html; charset=utf-8` |
| `styles.css` | 200 | `text/css; charset=utf-8` |
| `main.js` | 200 | `application/javascript; charset=utf-8` |
| `assets/launcher-library.png` | 200 | `image/png` |
| `assets/overlay-fullscreen.png` | 200 | `image/png` |
| `assets/vite-logo.png` | 200 | `image/png` |
| `assets/fonts/anton-latin.woff2` | 200 | `font/woff2` |
| `downloads/Vite_0.1.0_x64-setup.exe` | 200 | `application/octet-stream` |
| `DEPLOY.md` | 200 | `text/plain; charset=utf-8` |

The root document title is `Vite — Local-first game launcher for Windows`.

## Installer integrity

The installer downloaded from the public URL is **4,465,492 bytes** with SHA-256:

```text
2182023C441759D98F61552FA30B830C96633C91563E4731467192695BD561B0
```

This matches the SHA-256 printed on the site's download card and the file served from `site/downloads/`.

## Account flow

The site shares the desktop app's hosted account service:

- Create account: username + display name + password; no email.
- Sign in / sign out and add/remove friends by 8-character code.
- The same account works in the desktop app and on the website.
- The account service stores username, display name, a PBKDF2-SHA256 password hash, friend code, and mutual friend ids. The library is never uploaded.

## Browser check

Playwright (Chromium) against the local site and the public URL at 1440×1000 and 390×844:

- HTTP 200 and the expected `<title>`.
- Local Anton and Manrope woff2 fonts load (no fallback to Impact/system sans).
- All images load; zero failed requests; zero console errors.
- No horizontal overflow at either width.
- Primary nav contains Features, Overlay, Stats, Accounts, Download.
- Account section renders signed-out and signed-in states; signup/login and friend add work against the live account service.
- The boost disclaimer, accounts section, and download card are present in the DOM text.

## Page content notes

- **Accounts & friends** are described as hosted online accounts; the same credentials work in the app and website, and no library data is uploaded.
- **Game Boost off vs on** uses illustrative frame-time bars and illustrative 50/38 (off) and 60/56 (on) FPS previews. The page states it is not a game benchmark, that results vary by game/GPU/CPU, and that Game Boost cannot guarantee FPS or network latency.
- **Player counts** are sampled locally every five minutes through the official Steam API; there is no SteamCharts or other third-party history merge.
- **Overlay** is a full-screen capture; the page notes it is an always-on-top window that covers desktop, windowed, and borderless games, while exclusive fullscreen may draw over it.
- **Installer** is unsigned; Windows SmartScreen may warn on first run. It is not auto-updating.

## Notes

- All site paths are relative, so the site works under the `/vite-launcher-site/` project subpath and from any local HTTP server.
- Opening `index.html` directly via `file://` still renders, but Chrome blocks local woff2 fonts under the file scheme; the display font falls back to Impact. Use a local server for the intended typography.
- `_redirects` is a Netlify artifact kept for reference; GitHub Pages ignores it.
- The stats sparkline on the page is an illustrative shape rendered in CSS/SVG; the app draws the real chart from local samples.
