# Bookmark Cover Flow

![Bookmark Cover Flow running in dark mode](docs/assets/screenshot.png)

[Watch the interaction demo](docs/assets/demo.gif)

A quiet, spatial Chrome bookmark browser inspired by the browsing rhythm of classic Cover Flow. It opens as a regular extension tab only when you click its toolbar button, so it never replaces Chrome's New Tab page.

The active bookmark stays clear and centered while neighboring covers recede into a continuous 3D scene. Trackpad, mouse, keyboard, search, and folder navigation all feed the same motion model.

## Features

- toolbar button that opens a normal, bookmarkable/pinnable extension tab
- real Chrome bookmark hierarchy with nested-folder navigation and breadcrumbs
- continuous fractional-position motion with inertia, velocity damping, and snap
- trackpad, wheel, pointer drag, click, and keyboard navigation
- instant title, hostname, and URL search without leaving Cover Flow
- a local Recent collection plus bookmark-order, title, website, and recently-opened sorting
- webpage Open Graph/Twitter preview images, cached locally, with favicon and generated fallbacks
- DOM virtualization (`selectedIndex ± 7`) for large libraries
- system/light/dark themes, optional reflection, `prefers-reduced-motion`, and forced-colors support
- local-first operation with no account, backend, analytics, or bookmark uploads

## Design philosophy

Quiet, refined, editorial, spatial, premium, and minimal. The cover is the interface: navigation and metadata stay deliberately low-key, gradients and reflections are restrained, and the scene avoids card-grid dashboard chrome.

## Architecture

The project uses native TypeScript and Web APIs with a lightweight Clean Architecture:

```text
Domain → Application → Infrastructure → UI
```

Pure functions own search, sorting, transform calculation, bookmark mapping, selection, and motion physics. Chrome APIs, storage, events, animation frames, and DOM rendering remain at the edge. See [Architecture](docs/architecture.md), [Stable APIs](docs/api.md), [Motion design](docs/motion-design.md), and [Performance validation](docs/performance.md).

## Getting started

Requirements: Node.js 22 or newer and Chrome 120 or newer.

```bash
npm install
npm run dev
```

Outside an extension context, development mode provides a small demo library so the full interface and tests work without exposing personal bookmarks.

## Development

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run package:extension
```

## Build

```bash
npm run build
```

The unpacked extension is written to `dist/`.

## Install the extension

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the generated `dist` folder.
5. Pin **Bookmark Cover Flow** from Chrome's Extensions menu if desired.
6. Click its toolbar button. Cover Flow opens in a normal new tab; Chrome's New Tab page is unchanged.

## Keyboard

| Key                   | Action                   |
| --------------------- | ------------------------ |
| `←` / `→`             | Previous / next bookmark |
| `Enter`               | Open the active bookmark |
| `/` or `⌘K`           | Focus search             |
| `Esc`                 | Clear and leave search   |
| `Home` / `End`        | First / last bookmark    |
| `PageUp` / `PageDown` | Move five bookmarks      |

## Permissions and privacy

- `bookmarks`: read the bookmark tree shown in Cover Flow.
- `storage`: remember local interface preferences.
- `favicon`: ask Chrome's local favicon service for bookmark icons.
- `http://*/*` and `https://*/*`: fetch bookmarked pages without cookies to read their Open Graph/Twitter preview-image metadata, then display that image in the cover.

Preview metadata and its resolved image URL are cached in Chrome's local extension storage for performance. The extension has no analytics, user account, bookmark upload, or backend. Opening the Cover Flow may contact bookmarked websites to obtain previews; requests omit credentials, time out after 8 seconds, and are limited to nearby covers rather than the entire library at once.

## Roadmap — complete

- **v0.1 ✓** — architecture, Chrome bookmarks, static Cover Flow, keyboard
- **v0.2 ✓** — continuous motion, trackpad/wheel, inertia, snap
- **v0.3 ✓** — favicon covers, reflection, folder navigation, themes
- **v0.4 ✓** — search, recent items, custom sorting
- **v0.5 ✓** — virtualization, performance tuning, accessibility, E2E tests
- **v1.0 ✓** — polished motion, stable APIs, documentation, demo, store-ready release

See the [Chrome Web Store listing copy](docs/store-listing.md), [privacy policy](docs/privacy-policy.md), [release checklist](docs/release.md), and [changelog](CHANGELOG.md).

## Contributing

See [Contributing](docs/contributing.md). Pull requests should explain What, Why, How, Test, and include visual evidence where relevant.

## License

[MIT](LICENSE)
