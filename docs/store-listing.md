# Chrome Web Store listing

The complete, current listing (short and detailed description, permission justifications, data-use disclosure, assets and pre-publish checklist) lives in [`CHROMEWEBSTORE.md`](../CHROMEWEBSTORE.md) at the repository root. Edit that file, not this one; this page is kept as a short summary for reviewers and contributors.

## Name

Bookmark Shelf

The extension was renamed from "Bookmark Cover Flow" so the name no longer uses "Cover Flow", a name Apple has used for its own feature.

## Short description

Browse your Chrome bookmarks as flipping covers, a grid or a list, with instant search. No account, no tracking, no uploads.

## Category

Productivity

## Languages

English (primary); the extension interface is also available in Simplified Chinese, Traditional Chinese and Japanese.

## Required assets

- 128 × 128 store icon: `public/icons/icon-128.png`
- 1280 × 800 screenshot: `docs/assets/store-screenshot-1280x800.png` (must be retaken: the UI changed)
- Privacy policy: `docs/privacy-policy.md`, published at <https://github.com/kekincai/bookmark-cover-flow/blob/main/docs/privacy-policy.md>

## Reviewer notes

Click the extension toolbar action to open `index.html` in a normal tab. The extension has no content script and never reads or modifies the tabs the user has open.

Website access (`https://*/*`, `http://*/*`) is an optional host permission. Nothing is granted at install, and the extension makes no network requests until the user turns on **Prefer website preview images** in Settings, which shows Chrome's permission prompt. With access granted, the extension requests only public bookmarked pages, without cookies or a referrer, reads the start of the page to find its declared preview image and theme color, and caches the result locally. Turning the setting off releases the access.

The `alarms` permission runs a daily cleanup of expired preview-cache entries.
