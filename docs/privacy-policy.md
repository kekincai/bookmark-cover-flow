# Privacy Policy

Last updated: August 23, 2026

Bookmark Cover Flow is local-first. It has no user account, analytics, advertising, telemetry, or project-operated backend.

## Data used

- Chrome bookmarks are read locally to render folders and covers.
- View preferences, recently opened bookmarks, and resolved preview-image URLs are stored in Chrome extension storage on the user's device.
- “Recently opened” includes only bookmarks opened through this extension. Chrome browsing history is not requested or read.

## Network requests

To display webpage cover images, the extension may request nearby bookmarked HTTP(S) pages and their declared Open Graph or Twitter image. Page requests omit credentials, time out after eight seconds, and are not sent through any Bookmark Cover Flow server. The destination website and its infrastructure may observe the request under their own privacy policy.

## Data sharing and retention

Bookmark Cover Flow does not sell, upload, or share bookmark data. Local preview results expire automatically; preferences and recent entries remain until the extension data is cleared or the extension is removed.

## Permissions

- `bookmarks`: read the bookmark hierarchy displayed by the extension.
- `storage`: save local preferences, recent entries, and preview cache records.
- `favicon`: display Chrome's locally provided favicon fallback.
- `http://*/*`, `https://*/*`: request bookmarked pages and their preview images.

Questions and security reports can be filed through the project's GitHub repository.
