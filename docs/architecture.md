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
keyboard / wheel / pointer / search
               ↓
       NavigationCommand
               ↓
       motion + app store
               ↓
    virtualized Cover Flow view
```

Motion uses a fractional `position` and a discrete `targetPosition`. A `requestAnimationFrame` loop advances velocity damping plus target attraction and stops entirely after settling.

Only the selected cover plus seven neighbors on either side can enter the DOM. Sorting and searching operate on immutable arrays; preview requests are bounded to the visible neighborhood with four workers and generation cancellation.

## Privacy boundary

Bookmarks remain inside Chrome and are never uploaded to a project backend. A Manifest V3 background worker fetches nearby bookmarked pages without credentials, extracts Open Graph/Twitter image metadata, and caches only the resolved image URL in `chrome.storage.local`. Failed lookups fall back to Chrome's local `_favicon` endpoint or a generated cover. The project has no backend, analytics, account, or telemetry.
