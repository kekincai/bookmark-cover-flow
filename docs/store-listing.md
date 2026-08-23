# Chrome Web Store listing

## Name

Bookmark Cover Flow

## Summary

Browse your Chrome bookmarks as a fast, private, spatial Cover Flow.

## Detailed description

Bookmark Cover Flow turns your existing Chrome bookmark folders into a focused visual browser. Each bookmark becomes a large editorial cover with a real webpage preview, favicon, or locally generated fallback on a quiet graphite stage.

Click the toolbar icon to open a normal tab. Browse with a trackpad, mouse, drag gesture, or keyboard; search instantly; enter nested folders; revisit recently opened bookmarks; and sort by bookmark order, title, website, or recent use.

Webpage preview images are resolved directly from bookmarked sites and cached locally, with favicon and generated-cover fallbacks. A stable breadcrumb header keeps deeply nested folders easy to understand without shifting the interface. Light, dark, reduced-motion, keyboard, and high-contrast experiences are included.

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
