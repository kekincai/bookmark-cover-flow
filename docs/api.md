# Stable application APIs

Bookmark Cover Flow v1.0 keeps browser-specific behavior behind typed ports. UI components depend on these contracts rather than Chrome globals.

## Bookmark repository

`BookmarkRepository.getTree()` returns the immutable bookmark-folder hierarchy. The Chrome adapter is the only production module that reads `chrome.bookmarks`.

## Tab service

`TabService.open(url)` opens a validated HTTP(S) bookmark. URL validation remains in the application layer so alternate adapters receive the same behavior.

## Preview provider

`PreviewProvider.resolve(url)` returns an optional HTTP(S) preview-image URL. The background implementation applies timeouts, credential omission, metadata parsing, and local caching.

## Preferences

`Preferences` is the persisted v1 view contract:

- `activeFolderId?: string`
- `sortMode: bookmark | title | domain | recent`
- `theme: system | light | dark`
- `showReflection: boolean`

Unknown or malformed values are ignored and replaced with conservative defaults. New optional fields may be added in minor releases; existing meanings will not change before v2.

## Recent bookmarks

Recent entries are local records containing bookmark ID, title, URL, and `openedAt`. The list is deduplicated, ordered newest first, and capped at 50 entries. It records only bookmarks opened from Bookmark Cover Flow and never reads Chrome browsing history.
