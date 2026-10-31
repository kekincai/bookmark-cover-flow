# Stable application APIs

Bookmark Cover Flow v1.0 keeps browser-specific behavior behind typed ports. UI components depend on these contracts rather than Chrome globals.

## Bookmark repository

`BookmarkRepository.getTree()` returns the immutable bookmark-folder hierarchy. The Chrome adapter is the only production module that reads `chrome.bookmarks`.

## Tab service

`TabService.open(url, { background? })` opens a validated HTTP(S) bookmark, optionally without switching to the new tab (⌘Enter). URL validation remains in the application layer so alternate adapters receive the same behavior.

## Preview provider

`PreviewProvider.resolve(url)` returns `{ imageUrl?, themeColor? }`: an optional HTTP(S) preview-image URL and the page's validated `theme-color`. The background implementation applies timeouts, credential omission, metadata parsing, and local caching. It is never called when **Prefer website preview images** is off.

## Preferences

`Preferences` is the persisted v1 view contract:

- `activeFolderId?: string`
- `sortMode: bookmark | title | domain | recent`
- `theme: system | light | dark`
- `showReflection: boolean`
- `preferPreviewImages: boolean` (default `true`)
- `coverAngle: number` (45–80, default 70)
- `reduceFlipMotion: boolean` (default `false`)

Unknown or malformed values are ignored and replaced with conservative defaults. New optional fields may be added in minor releases; existing meanings will not change before v2.

Besides folder IDs, `activeFolderId` may hold one of the library collections: All Bookmarks, Recently Opened or Recently Added (`src/domain/collection.ts`).

## Generated covers

`createCoverArt(title, hostname, baseColor?)` is deterministic: the template is `hash(hostname) mod 4` (`mono`, `type`, `circle`, `bands`), the base color is the site's theme color, else its favicon's dominant color, else a palette entry chosen by the same hash. Text is black or white by contrast; `circle` uses the complementary accent.

## Recent bookmarks

Recent entries are local records containing bookmark ID, title, URL, and `openedAt`. The list is deduplicated, ordered newest first, and capped at 50 entries. It records only bookmarks opened from Bookmark Cover Flow and never reads Chrome browsing history.

The Privacy tab can clear this list and the preview cache; neither touches Chrome bookmarks.
