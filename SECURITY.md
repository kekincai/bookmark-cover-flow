# Security

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub Security Advisories for `kekincai/bookmark-cover-flow`. For anything that cannot go through GitHub, write to [me@kejincai.dev](mailto:me@kejincai.dev).

Do not include personal bookmark exports, browsing data, authentication cookies, or session tokens in a report. Bookmark Shelf does not require an account or project-operated server.

## Security model

### Permissions

The extension requests `bookmarks`, `storage`, `favicon` and `alarms` at install. It has no content scripts and never reads or modifies the tabs you have open.

Website access (`https://*/*`, `http://*/*`) is an **optional** host permission. It is not granted at install. It is requested at runtime only when the user turns on **Prefer website preview images** in Settings, and released when the user turns the setting off. Without it the extension makes no network requests.

### Preview fetching

Preview pages are fetched only by the background service worker, which enforces these rules regardless of what the UI asks for:

- Messages are accepted only from this extension's own pages (matching extension ID and origin); websites and other extensions cannot trigger a fetch.
- Only `http:` and `https:` URLs on public hosts are fetched. Loopback, private-network (RFC 1918, CGNAT, unique-local IPv6), link-local, `localhost`, `.local`, `.internal`, `.lan`, `.home.arpa`, `.intranet` and single-label intranet hosts are refused, as are URLs with embedded credentials or longer than 2,048 characters.
- Redirects are followed, but if the final URL is not a public host, or the response is not HTML, the body is discarded unread. The redirecting request itself has already been made by Chrome at that point.
- Requests use `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, an 8-second timeout, and `priority: 'high'` for the selected cover or `'low'` for its neighbours.
- Only the document up to `</head>` (at most 512,000 characters) is read; the stream is then cancelled. Only the declared preview image and `theme-color` are extracted, with no script execution or DOM parsing of remote HTML.
- Chrome may add an `Origin: chrome-extension://<id>` header to these requests, which can reveal to the site that the extension is installed.

Preview images are displayed by the extension page as ordinary `<img>` elements with `referrerPolicy="no-referrer"`. They are **not** credential-less: the image host may receive its own cookies, subject to the user's third-party cookie settings. Image URLs are restricted to `https:` (plain `http:` image URLs are upgraded).

### Preview cache

Results are stored in `chrome.storage.local` under a hash of the page URL; each entry also stores the full URL and is ignored if it does not match, so a hash collision reads as a miss. Successful entries expire after 7 days and failures after 12 hours. A daily `chrome.alarms` sweep (and a sweep on install or update) deletes expired and malformed entries and caps the cache at 3,000 entries. Image URLs longer than 2,048 characters are not stored.

### Content Security Policy

Extension pages run under:

```text
default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none';
form-action 'none'; frame-ancestors 'none';
img-src 'self' https: data: blob:; media-src 'self' blob:;
connect-src 'self' https: http:;
require-trusted-types-for 'script'; trusted-types static-markup;
```

No remote code is loaded and there is no `eval`. `require-trusted-types-for 'script'` blocks string assignment to DOM injection sinks such as `innerHTML`; the only allowed policy, `static-markup`, accepts literal markup authored in the extension's source. Bookmark titles, URLs and other untrusted strings are inserted as text, never as HTML.

### Local data

Preferences, the Recently Opened list (up to 50 entries) and the preview cache are stored in `chrome.storage.local`. A user-selected background photo or video is stored in the extension's IndexedDB. Nothing is synchronized, uploaded or sent to the developer. See the [privacy policy](docs/privacy-policy.md).
