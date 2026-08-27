<div align="center">
  <img src="public/icons/icon-128.png" width="96" height="96" alt="Bookmark Cover Flow icon">

# Bookmark Cover Flow

**Your Chrome bookmarks, in motion and glass.**

[![CI](https://github.com/kekincai/bookmark-cover-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/kekincai/bookmark-cover-flow/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/kekincai/bookmark-cover-flow?display_name=tag&sort=semver)](https://github.com/kekincai/bookmark-cover-flow/releases/latest)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](public/manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-f4f3ef.svg)](LICENSE)

[Install](#install) · [Features](#features) · [Architecture](docs/architecture.md) · [Privacy](docs/privacy-policy.md) · [Contributing](docs/contributing.md)

</div>

![Bookmark Cover Flow showing real public bookmarks](docs/assets/screenshot.png)

Bookmark Cover Flow is a quiet, spatial way to browse Chrome bookmarks. Click the extension button and it opens in a normal tab—never over your New Tab page. Real bookmark folders remain intact, with image-first covers, continuous motion, and Infinity-inspired Liquid Glass.

<div align="center">
  <a href="docs/motion-design.md"><strong>Explore the motion and optical design →</strong></a>
</div>

## Why it feels different

| Image-first covers                                                                                        | Spatial motion                                                                                | Your folders, unchanged                                                                                 |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Open Graph images, favicons, and deterministic fallbacks make bookmarks recognizable before opening them. | Trackpad, wheel, pointer drag, keyboard, inertia, and snap share one continuous motion model. | Nested Chrome folders become a stable breadcrumb rail with no uploads, account, or proprietary library. |

## Features

- opens from the toolbar as a regular bookmarkable or pinnable extension tab
- navigates the real Chrome bookmark hierarchy with stable breadcrumbs and back navigation
- previews real Open Graph imagery inside rounded, image-first covers; unavailable previews use an honest monogram fallback
- ports Infinity Newtab's Snell-law SVG refraction, precision lens, lip-profile switch, and WebGPU HDR rim shader
- supports trackpad, wheel, pointer drag, click, and keyboard navigation
- searches titles, hostnames, and URLs instantly without leaving Cover Flow
- includes a local Recent collection and four sorting modes
- offers dark, light, and system themes plus optional floor reflection
- defaults new installations to a pastel light theme; existing saved theme choices are preserved
- virtualizes the scene to `selectedIndex ± 7` for large libraries
- respects reduced motion, forced colors, focus navigation, and screen-reader metadata
- stays local-first with no analytics, account, backend, or bookmark uploads

## Install

### From a release

1. Download `bookmark-cover-flow.zip` from the [latest release](https://github.com/kekincai/bookmark-cover-flow/releases/latest).
2. Unzip it.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the unzipped folder.
6. Pin **Bookmark Cover Flow**, then click its toolbar icon.

### From source

Requirements: Node.js 22+ and Chrome 120+.

```bash
git clone https://github.com/kekincai/bookmark-cover-flow.git
cd bookmark-cover-flow
npm ci
npm run build
```

Load the generated `dist` folder from `chrome://extensions`. Running `npm run dev` opens a public demo library and never reads personal bookmarks.

## Keyboard

| Key                   | Action                   |
| --------------------- | ------------------------ |
| `←` / `→`             | Previous / next bookmark |
| `Enter`               | Open the active bookmark |
| `/` or `⌘K`           | Focus search             |
| `Esc`                 | Clear and leave search   |
| `Home` / `End`        | First / last bookmark    |
| `PageUp` / `PageDown` | Move five bookmarks      |

## Architecture

```text
Domain → Application → Infrastructure → UI
```

Native TypeScript and browser APIs keep the extension small. Pure functions own search, sorting, cover transforms, selection, and motion physics; Chrome APIs, storage, events, animation frames, and DOM rendering stay at the edge.

Read the [architecture](docs/architecture.md), [stable APIs](docs/api.md), [motion design](docs/motion-design.md), and [performance validation](docs/performance.md).

HDR highlights require an HDR display and compatible WebGPU support. SDR displays keep the real SVG Liquid Glass refraction without pretending to emit HDR. Previews are site-provided images, not full-page screenshots. The interface intentionally omits bottom navigation and keyboard-hint overlays; keyboard controls still work.

## Backgrounds and settings

Open the top-right settings button, then **Background → Choose photo or video**. A floating glass panel separates Appearance from Background with horizontal tabs and uncluttered groups. It is not a separate options page and does not take over Chrome's New Tab page. Card interiors have no opaque backing: the wallpaper remains visible through their glass windows, while preview images sit inset and labels retain a translucent contrast layer.

The interface automatically follows Chrome's UI language. Simplified Chinese, Traditional Chinese, Japanese and English are included; other languages fall back to English. In the development preview, the browser language is used instead. Settings, accessible labels, playback status, error messages and extension metadata share the same `_locales` catalogs. Bookmark titles and file names are never translated. Reopen the extension after changing Chrome's UI language.

![Floating settings with automatic Chinese localization and a local video wallpaper](docs/assets/settings.png)

Screenshots use an isolated Chrome profile with public bookmarks and MDN's CC0 flower video, never a personal bookmark library.

- Local photos and videos up to 512 MB are saved as original Blobs in IndexedDB, never uploaded or synchronized. Reopening the extension restores the selected file.
- Videos loop silently using the native video element. They pause while the tab is hidden; a manual pause is remembered. Reduced-motion users start new videos paused.
- HDR video bytes and color metadata are retained without transcoding or canvas processing. Actual HDR output requires a compatible file/codec, Chrome/system decoder, and HDR-enabled display. Unsupported files show an error without replacing the previous background.
- Photos support blur; both photos and videos support dimming. Video blur is intentionally unavailable to keep playback free of CSS filters. Use zero dimming for the unmodified video appearance.
- **Restore default background** removes only the stored wallpaper copy; original files, bookmarks and appearance preferences are untouched. Clearing extension data or uninstalling also removes the stored copy.

The media regression suite accepts `WALLPAPER_TEST_VIDEO=/absolute/path/to/video.webm npm run test:e2e`. This additional test checks real decoding, mute state, pause persistence and stable playback across settings tabs; it is skipped when no video fixture is supplied.

## Verified quality

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:extension
```

The isolated extension test seeds 15 public bookmarks plus a 5,000-item stress folder, verifies real preview retrieval, opens a bookmark, checks Recent, exercises view settings, and confirms DOM virtualization without reading the user's Chrome profile.

## Permissions and privacy

| Permission                  | Why it is needed                                                         |
| --------------------------- | ------------------------------------------------------------------------ |
| `bookmarks`                 | Read the bookmark tree displayed in Cover Flow                           |
| `storage`                   | Remember local view preferences and preview metadata                     |
| `favicon`                   | Resolve icons through Chrome's local favicon service                     |
| `http://*/*`, `https://*/*` | Fetch public page metadata without credentials for nearby cover previews |

Requests omit credentials, time out after eight seconds, and are limited to nearby covers. See the full [privacy policy](docs/privacy-policy.md).

## Roadmap

- **v0.1–v0.5 ✓** — architecture, bookmarks, motion, folders, search, sorting, performance, accessibility
- **v1.0 ✓** — stable APIs, packaging, documentation, and store-ready release
- **v1.1 ✓** — editorial cover system, fixed breadcrumb header, spatial graphite stage, redesigned view options
- **Unreleased · main** — Infinity Liquid Glass/HDR, transparent cards, continuous motion, local photo/video backgrounds and automatically localized floating settings; available from source, not yet tagged as a release

## Contributing

Issues and pull requests are welcome. See [Contributing](docs/contributing.md) and [Security](SECURITY.md).

## License

[MIT](LICENSE)
