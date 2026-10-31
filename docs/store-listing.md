# Chrome Web Store listing

## Name

Bookmark Cover Flow

## Summary

Browse your Chrome bookmarks as a fast, private, spatial Cover Flow.

## Detailed description

Bookmark Cover Flow turns your existing Chrome bookmark folders into a focused visual browser. Each bookmark becomes an album-style cover, using the site's preview image or a locally generated cover in the site's colors, on a calm Apple-style stage with mirror reflections.

Click the toolbar icon to open a normal tab. Browse with a trackpad, mouse, drag gesture, or keyboard; search instantly; pick any folder from the sidebar; switch to full-screen Cover Flow; revisit recently opened bookmarks; and sort by bookmark order, title, website, or recent use.

Webpage preview images are resolved directly from bookmarked sites and cached locally; turn them off to keep every cover generated on your computer. A list under the stage shows each bookmark's website, folder, date added and last opened time. Light, dark, reduced-motion, keyboard, and high-contrast experiences are included.

The extension does not replace Chrome's New Tab page. It has no account, analytics, advertising, telemetry, bookmark upload, or project-operated backend.

## Category

Productivity

## Language

English

## Required assets

- 128 × 128 store icon: `public/icons/icon-128.png`
- 1280 × 800 screenshot: `docs/assets/store-screenshot-1280x800.png`
- Demo animation: `docs/assets/demo.gif`
- Privacy policy: `docs/privacy-policy.md`

## Reviewer notes

Click the extension toolbar action to open `index.html` in a normal tab. The broad HTTP(S) host permission is used only to fetch bookmarked pages without credentials and extract their declared preview image. The extension has no content script and does not modify visited pages.
