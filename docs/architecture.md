# Architecture

Bookmark Cover Flow uses a lightweight Clean Architecture and a Functional Core / Imperative Shell.

```text
Domain → Application → Infrastructure → UI
```

- `src/domain` contains immutable bookmark, cover, navigation, and motion types.
- `src/application` contains pure search, selection, cover layout, resolution, and motion functions.
- `src/infrastructure` is the only layer that calls Chrome APIs or browser storage.
- `src/ui` owns DOM components, input controllers, the observable store, and CSS.
- `src/app/bootstrap.ts` is the composition root. It wires ports to adapters and translates events into commands.

The supported v1 port and persistence contracts are documented in [Stable application APIs](api.md).

The UI never calls `chrome.bookmarks` directly. In a normal browser development session, the repository supplies a small local demo collection; when loaded as an extension it reads the user's real, nested bookmark tree.

## Data flow

```text
keyboard / wheel / pointer / scrubber / list / search
               ↓
       NavigationCommand
               ↓
       motion + app store
               ↓
  virtualized Cover Flow · list · full screen
```

Motion uses a fractional `position` and a discrete `targetPosition`. A `requestAnimationFrame` loop advances velocity damping plus target attraction and stops entirely after settling.

Only the selected cover plus seven neighbors on either side can enter the DOM; the list under the stage renders only the rows in its scroll viewport. Generated cover art is built lazily, the first time a cover is actually rendered. Sorting and searching operate on immutable arrays, and each bookmark's normalized search text is cached. The sidebar folder tree updates incrementally instead of being rebuilt. Preview requests are bounded to the selected cover ±8 (or the visible grid tiles) with four workers and generation cancellation; the selected cover is sent with `high` fetch priority and its neighbours with `low`.

Settings and full-screen Cover Flow are native modal `<dialog>` elements. Screen-reader announcements go through one shared live region (`src/ui/dom/announcer.ts`), and every HTML string reaches the DOM through the literal-only Trusted Types policy in `src/ui/dom/markup.ts`.

## Privacy boundary

Bookmarks remain inside Chrome and are never uploaded to a project backend. The project has no backend, analytics, account, or telemetry.

Website access is an optional host permission (`optional_host_permissions`), requested through `src/infrastructure/chrome/preview-access.ts` from the **Prefer website preview images** switch and released when the switch is turned off. Previews are off by default; while they are off, every cover is generated locally, colored from the dominant color of Chrome's local `_favicon` image, and no page is fetched.

With previews on, the Manifest V3 background worker is the network boundary:

- it accepts preview messages only from this extension's own pages;
- `isPreviewableUrl` (`src/shared/preview-message.ts`) admits only public `http(s)` hosts, refusing loopback, private-network, link-local, `.local`/`.internal`-style and single-label intranet hosts; the check runs again on the final URL after redirects, before the body is read;
- the fetch omits cookies and the referrer, times out after 8 s, and reads the response only up to `</head>` (at most 512,000 characters);
- it extracts Open Graph/Twitter image metadata and `theme-color`, and caches the page URL, resolved image URL and color in `chrome.storage.local` under a hash key that is verified against the stored URL.

Cache entries live 7 days on success and 12 hours on failure. A daily `chrome.alarms` sweep (plus one on install or update) deletes expired and malformed entries and caps the cache at 3,000. Preview images are then loaded by the extension page as ordinary `https` images with no referrer; unlike the page fetch, these image loads follow Chrome's normal cookie rules.

See [SECURITY.md](../SECURITY.md) for the Content Security Policy and the full fetch rules.
