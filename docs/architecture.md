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

The UI never calls `chrome.bookmarks` directly. In a normal browser development session, the repository supplies a small local demo collection; when loaded as an extension it reads the user's real bookmarks.

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

## Privacy boundary

Bookmarks remain inside Chrome. The project has no network client, backend, analytics, account, or telemetry. Favicon URLs are served by Chrome's local `_favicon` endpoint.
