# Changelog

## 1.3.0 — 2026-11-27

Renamed to **Bookmark Shelf**, with a new icon, plus a privacy, security and accessibility refactor. Requires Chrome 135 or later.

- Rename the extension from "Bookmark Cover Flow" to **Bookmark Shelf** (书签书架 / 書籤書架) and call the cover view **Covers**, so the name and store copy no longer use an Apple feature name.
- New icon: a vermilion bookmark in front of covers fanning back on a warm paper tile, drawn with Canvas (`npm run icons`, `scripts/draw-icon.mjs`) with pixel-snapped 16 and 32 px versions.
- Make website access optional: the install-time `http://*/*` and `https://*/*` host permissions are gone. **Prefer website preview images** is now off by default; turning it on asks Chrome for website access, and turning it off gives the access back.
- Add the `alarms` permission for a daily sweep that deletes expired preview-cache entries (also on install and update) and caps the cache at 3,000 entries; image URLs over 2 KB are no longer stored, and entries are verified against the stored page URL.
- Fetch previews only from public `http(s)` hosts: loopback, private-network, link-local, `.local`, `.internal` and single-label intranet hosts are skipped, and a redirect into a private network is dropped before its body is read. Requests send no cookies and no referrer, read the page only up to `</head>`, and prioritize the selected cover over its neighbours. Only the extension's own pages can ask for a preview.
- Load preview images over `https` only (plain `http` image URLs are upgraded), without a referrer.
- Tighten the extension-page Content Security Policy: add `default-src 'self'`, `base-uri 'none'`, `form-action 'none'` and `frame-ancestors 'none'`, drop `http:` from `img-src`, and require Trusted Types; all HTML strings go through a literal-only policy.
- Use native modal dialogs for Settings and full screen.
- Move theme colors to `light-dark()` tokens; use outline focus rings with at least 3:1 contrast; extend forced-colors support; size text in `rem`; keep short fades when motion is reduced.
- Add a **Single-key shortcuts** switch so speech-input users can turn off `F` and `/` (WCAG 2.1.4).
- Centralize screen-reader announcements in one live region and expose the List view as a tree grid.
- Improve performance: cover art is built only when a cover is shown, search text is cached, the sidebar updates incrementally, and background video pauses while hidden.
- Raise `minimum_chrome_version` from 120 to 135.
- Fix public IPv6 bookmarks being refused previews; multicast addresses are never fetched.
- Update development dependencies; `npm audit` reports no vulnerabilities.

## 1.2.0 — 2026-10-31

A modern Apple-style redesign. The interface is flat and neutral, and every color on screen comes from the covers.

- Add a sidebar with search, a Library (All Bookmarks, Recently Opened, Recently Added) and the real Chrome folder tree with counts.
- Add three views that share one selection and are remembered: Cover Flow with a list under the stage, an album-style Grid, and a full-height List with website, folder, date added and last opened.
- Rebuild the Cover Flow stage: larger covers, adjustable cover angle (45–80°), mirror reflection, side shading, a hover “Open” pill and a slim scrubber.
- Generate album-style covers for sites without a preview, in four templates chosen per domain and colored from the site's theme color or favicon.
- Add full-screen Cover Flow (`F`), `⌘Enter` to open in a background tab, and keyboard focus zones for the stage, list, grid and sidebar.
- Redesign settings with Appearance, Background and Privacy tabs: stage backgrounds (Default, Mist, Night or a local photo or video), a switch to stop contacting websites for previews, and buttons to clear the preview cache and Recently Opened history.
- Add loading, empty, no-results and error states with retry.
- Retune motion to feel like a 620 ms flip; reduced motion jumps with a short cross-fade.
- Automatically localize the interface in English, Simplified Chinese, Traditional Chinese and Japanese.
- New app icon.
- Remove the Liquid Glass and HDR effects.

## 1.1.0 — 2026-08-23

- Redesign the stage around a graphite-black spatial background and editorial paper covers.
- Add larger webpage previews, varied generated cover compositions, and a more physical reflection.
- Replace the shifting folder menu with a fixed breadcrumb rail and dedicated product identity.
- Redesign View options with accessible custom sort, theme, and reflection controls.
- Make the first-run dark theme match the signature Cover Flow presentation while retaining all themes.
- Refresh real-bookmark screenshots, release documentation, and the GitHub project presentation.

## 1.0.0 — 2026-08-23

- Open Bookmark Cover Flow from its toolbar icon without replacing Chrome's New Tab page.
- Preserve nested Chrome bookmark folders with breadcrumbs and back navigation.
- Add webpage preview images with local caching and favicon/generated fallbacks.
- Add local recent bookmarks and sorting by bookmark order, title, website, or recent use.
- Add system, light, and dark themes plus a reflection preference.
- Complete keyboard, reduced-motion, forced-colors, virtualization, and screen-reader metadata.
- Add store icons, privacy policy, listing copy, packaging workflow, and v1 API documentation.
