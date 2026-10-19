# Deployment

The site is deployed as a static site with GitHub Pages from a public repository.

- **Public URL:** https://praisethefacts.github.io/vite-launcher-site/
- **Repository:** https://github.com/praisethefacts/vite-launcher-site (public, branch `main`)
- **Live site commit:** `2312f8010f2888982bc68b60ae9b41e2e3f292ad` — "Add Boost off/on comparison and local accounts & friends sections"
- **Initial commit:** `72a34ffb9ecee9a3ae1de5e1fd61777cae8cdb64` — "Vite marketing site: static single-page site with real app captures and Windows installer"
- **Deployed:** 2026-10-19
- **Pages configuration:** source `main` / repository root, build type `legacy`, HTTPS enforced
- **Build status:** GitHub Pages build for commit `2312f80` completed with status `built`

## HTTP checks

Performed on 2026-10-19 against the public URL after the Pages build finished.

| Path | Status | Content-Length | Content-Type |
| --- | --- | --- | --- |
| `/` | 200 | 46,229 | `text/html; charset=utf-8` |
| `styles.css` | 200 | 49,324 | `text/css; charset=utf-8` |
| `main.js` | 200 | 3,289 | `application/javascript; charset=utf-8` |
| `assets/launcher-library.png` | 200 | 401,799 | `image/png` |
| `assets/overlay-fullscreen.png` | 200 | 596,509 | `image/png` |
| `assets/vite-logo.png` | 200 | 8,187 | `image/png` |
| `assets/fonts/anton-latin.woff2` | 200 | 18,612 | `font/woff2` |
| `downloads/Vite_0.1.0_x64-setup.exe` | 200 | 4,383,799 | `application/octet-stream` |
| `DEPLOY.md` | 200 | — | `text/plain; charset=utf-8` |

The root document title is `Vite — Local-first game launcher for Windows`.

## Installer integrity

The installer downloaded from the public URL is **4,383,799 bytes** with SHA-256:

```text
0AEEC8185719DA37D2F6FA3C44EBBE39BEC55FD46F0DE729AC6E51A5A385A195
```

This matches the SHA-256 printed on the site's download card and the file served from `site/downloads/`.

## Browser check

Playwright (Chromium) against the public URL at 1440×1000 and 390×844:

- HTTP 200 and the expected `<title>`.
- Local Anton and Manrope woff2 fonts load (no fallback to Impact/system sans).
- All 8 images load; zero failed requests; zero console errors.
- No horizontal overflow at either width; page height 12,004 px desktop and 13,728 px mobile.
- Primary nav contains Features, Overlay, Stats, Accounts, Download.
- Both new sections are present and rendered: `#boost-lab` ("Boost off, boost on.") and `#accounts` ("Accounts, without the cloud.").
- The required boost disclaimer and the explicit local-only profiles note are present in the DOM text.

## Page content notes

- **Accounts & friends** are described as local-first: a local profile stored in `vite.db`, manual friend codes, no email, no account server, and no online sync or cloud service.
- **Game Boost off vs on** uses illustrative frame-time bars and illustrative 58/44 (off) and 63/55 (on) FPS previews. The page states it is not a game benchmark, that results vary by game/GPU/CPU, and that Game Boost cannot guarantee FPS or network latency.
- **Player counts** are sampled locally every five minutes through the official Steam API; there is no SteamCharts or other third-party history merge.
- **Overlay** is a full-screen capture; the page notes it is an always-on-top window that covers desktop, windowed, and borderless games, while exclusive fullscreen may draw over it.
- **Installer** is unsigned; Windows SmartScreen may warn on first run. It is not auto-updating.

## Notes

- All site paths are relative, so the site works under the `/vite-launcher-site/` project subpath and from any local HTTP server.
- Opening `index.html` directly via `file://` still renders, but Chrome blocks local woff2 fonts under the file scheme; the display font falls back to Impact. Use a local server for the intended typography.
- `_redirects` is a Netlify artifact kept for reference; GitHub Pages ignores it.
- The stats sparkline on the page is an illustrative shape rendered in CSS/SVG; the app draws the real chart from local samples.
