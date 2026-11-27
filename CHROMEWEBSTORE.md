# Chrome Web Store Listing — Bookmark Cover Flow

> Last Updated: 2026-11-27

This file is the single source of truth for the Chrome Web Store dashboard: listing copy, permission justifications, the data-use disclosure, and publishing readiness. It is not shipped in the extension package (`npm run package:extension` zips only `dist/`).

## Store Listing

**Extension Name** [REQUIRED]

Bookmark Cover Flow

(Matches `extensionName` in `public/_locales/*/messages.json`, which `manifest.json` uses through `__MSG_extensionName__`.)

**Short Description** [REQUIRED] — 124 of 132 characters

```text
Browse your Chrome bookmarks as flipping covers, a grid or a list, with instant search. No account, no tracking, no uploads.
```

The manifest description (`extensionDescription`, shown in `chrome://extensions`) is "Browse Chrome bookmarks in a quiet, spatial Cover Flow." It does not have to match word for word, but keep the two consistent in meaning.

**Detailed Description** [REQUIRED]

Paste as plain text; the store strips Markdown.

```text
Bookmark Cover Flow shows the bookmarks you already have in Chrome as a row of covers you can flip through, so finding a saved page feels like browsing a record shelf instead of scrolling a long list.

FEATURES
• Your real bookmark folders in a sidebar, plus All Bookmarks, Recently Opened and Recently Added
• Three views that share one selection: flipping covers with a list underneath, a grid of covers, and a detailed list with website, folder, date added and last opened
• Instant search across titles, websites, addresses and folder names, with matches highlighted
• A generated cover for every bookmark, colored from the site's own colors and icon
• Optional website preview images, off until you turn them on
• Full-screen cover view, adjustable cover angle and an optional mirror reflection
• Light and dark themes and a choice of stage backgrounds, including your own photo or video
• Sort by bookmark order, title, website or recent use
• Full keyboard control, screen-reader labels, high-contrast support and a reduced-motion option; single-key shortcuts can be turned off for speech input
• English, Simplified Chinese, Traditional Chinese and Japanese

HOW TO USE
1. Click the Bookmark Cover Flow icon in the toolbar. It opens in a normal tab and does not replace your New Tab page.
2. Pick a folder in the sidebar, or type to search.
3. Flip with a trackpad, mouse wheel, drag or the arrow keys. Press Enter to open the bookmark in the middle.
4. Open Settings from the gear at the bottom of the sidebar to change the view, theme or background.

PRIVACY
Your bookmarks stay on your computer. There is no account, no analytics, no advertising and no server run by the developer, and nothing is sent to the developer.
Preferences, the Recently Opened list and any background photo or video you choose are stored only in this browser.
Website preview images are off by default. If you turn them on, Chrome asks you to allow website access. The extension then visits the public websites of the bookmarks you are looking at, without sending your cookies, reads only the start of each page to find its declared preview image and theme color, and keeps the result on your computer for up to a week. Bookmarks that point to private, local-network or intranet addresses are skipped. Turning the setting off stops all website visits and gives the access back to Chrome.
Settings > Privacy has buttons to clear the preview cache and the Recently Opened list at any time.

PERMISSIONS
• Read and change your bookmarks: needed to show your bookmark folders as covers. Bookmark Cover Flow does not add, edit or delete bookmarks.
• Read and change all your data on all websites (only if you turn on website previews): needed to read each bookmarked page's public preview image. It is requested only when you turn on the setting and released when you turn it off.

SUPPORT
Questions or bug reports: https://github.com/kekincai/bookmark-cover-flow/issues
```

> Before submission, confirm the installed permission warning wording in Chrome. The current manifest has no install-time host access; the "all websites" warning appears only in the runtime prompt when the user turns on previews. Chrome's `bookmarks` warning text is "Read and change your bookmarks".

**Category** [REQUIRED]

Productivity

**Single Purpose** [REQUIRED]

```text
Displays the user's existing Chrome bookmarks as a browsable cover view, grid and list in an extension tab.
```

**Primary Language** [REQUIRED]

English. The listing can also be localized in Simplified Chinese (`zh_CN`), Traditional Chinese (`zh_TW`) and Japanese (`ja`), the locales shipped in `public/_locales`; the extension name and manifest description are already translated there. Translated store descriptions have not been written yet.

## Graphics & Assets

| Asset                          | Dimensions          | Status          | Filename                                                                                                |
| ------------------------------ | ------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| Store Icon [REQUIRED]          | 128×128 PNG         | ✅ Ready        | `public/icons/icon-128.png`                                                                             |
| Toolbar/extension icons        | 16, 32, 48 PNG      | ✅ Ready        | `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`                                                |
| Screenshot 1 [REQUIRED]        | 1280×800            | 🟡 Needs update | `docs/assets/store-screenshot-1280x800.png`                                                             |
| Screenshot 2 [RECOMMENDED]     | 1280×800            | 🟡 Needs update | `docs/assets/settings.png` (Settings; must now show "Single-key shortcuts" and previews off by default) |
| Screenshot 3 [RECOMMENDED]     | 1280×800 or 640×400 | ⬜ Not created  | Grid or List view                                                                                       |
| Screenshot 4                   | 1280×800 or 640×400 | ⬜ Not created  | Full-screen cover view                                                                                  |
| Screenshot 5                   | 1280×800 or 640×400 | ⬜ Not created  | Search with highlighted matches                                                                         |
| Small Promo Tile [RECOMMENDED] | 440×280             | ⬜ Not created  |                                                                                                         |
| Marquee Promo Tile             | 1400×560            | ⬜ Not created  |                                                                                                         |

`docs/assets/screenshot.png` is 1440×900 and is used by the README only; it is not a valid store size.

### Screenshot Notes

All existing screenshots predate this refactor. The Settings dialog, focus rings, theme colors and the preview default changed, so every screenshot must be retaken before submission. Capture them from an isolated Chrome profile seeded with public bookmarks (`npm run test:extension` or `scripts/capture-demo.mjs`), never a personal bookmark library. If previews appear in a screenshot, the profile must have granted website access in Settings first.

1. Cover view with a folder selected in the sidebar and the list under the stage.
2. Settings, Appearance tab.
3. Grid or List view.
4. Full-screen cover view.
5. A search with highlighted matches.

## Permissions Justification

| Permission    | Type                      | Justification                                                                                                                                                                                                                                                                                                                                                                      |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bookmarks`   | permissions               | Reads the user's bookmark tree so each bookmark can be shown as a cover, grid tile or list row inside the extension tab, grouped by its real folder. The extension never creates, edits, moves or deletes bookmarks.                                                                                                                                                               |
| `storage`     | permissions               | Saves the user's view settings (theme, sort order, view, cover angle, shortcuts), the local Recently Opened list (up to 50 bookmarks opened from this extension) and the local preview cache, all in local extension storage on this device. Nothing is synchronized.                                                                                                              |
| `favicon`     | permissions               | Shows each bookmark's site icon from Chrome's own local favicon cache and uses its main color for the generated cover, so no website has to be contacted to draw a cover.                                                                                                                                                                                                          |
| `alarms`      | permissions               | Runs a once-a-day cleanup that deletes expired preview-cache entries (and trims the cache to 3,000 entries), so cached data is removed on schedule even if the user does not open the extension.                                                                                                                                                                                   |
| `https://*/*` | optional_host_permissions | Not granted at install. Requested only when the user turns on "Prefer website preview images" in Settings, and released when they turn it off. Used to read the public page of a bookmark the user is viewing, without cookies, to find the page's declared preview image and theme color. Bookmarks can point to any site, so the access cannot be narrowed to a list of domains. |
| `http://*/*`  | optional_host_permissions | Same as above for bookmarks saved with a plain `http://` address. Only bookmarks on public hosts are requested; local-network, loopback, link-local and intranet addresses are skipped, and a public page that redirects into a private network is discarded before its content is read.                                                                                           |

Reviewer note for the dashboard: there are no content scripts, the extension never reads or modifies the tabs the user has open, and it makes no network requests at all until the user opts in to previews.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No, in the sense of the dashboard form: no user data is sent to the developer or to any server the developer controls, and nothing is sold or shared.

What the extension handles locally and what leaves the device:

| Data                                       | Handled locally?                                       | Leaves the device?                                                                                                                                     | Purpose                             |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Bookmarks (titles, URLs, folders)          | Yes, read from Chrome                                  | Only if previews are on: a bookmark's own URL is requested from that bookmark's public website (no cookies, no referrer). Never sent to the developer. | Display; optional preview image     |
| Recently Opened (bookmark, time)           | Yes, local extension storage, max 50                   | No                                                                                                                                                     | Recently Opened collection and sort |
| Preview cache (page URL, image URL, color) | Yes, local extension storage, expires in 7 days / 12 h | No (the cached image is loaded from the website's image server when shown)                                                                             | Avoid refetching pages              |
| Preferences                                | Yes, local extension storage                           | No                                                                                                                                                     | Remember settings                   |
| Background photo or video                  | Yes, local database, only the file the user picks      | No                                                                                                                                                     | Stage background                    |

Suggested answers for the dashboard's data-type checklist (owner to confirm): Personally identifiable info, Health, Financial, Authentication, Personal communications, Location, User activity, Website content: **not collected**. Web history: **not collected** by the developer. Bookmark URLs are read locally and, with previews on, requested only from the bookmarked site itself. If the owner prefers the conservative reading, declare "Web history" with purpose "App functionality", not transmitted to the developer, not sold or shared.

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

### Disclosures reviewers may check

- Preview page requests are sent straight to the bookmarked website, with no cookies, no referrer, an 8-second timeout, and only the start of the page (up to the end of `<head>`) read. Chrome may add an `Origin: chrome-extension://<id>` header, which can tell the website that Bookmark Cover Flow is installed.
- Preview images are shown as ordinary images (no referrer). They can come from a different server chosen by the website, such as a content delivery network, and that server may receive its own cookies, depending on the user's third-party cookie settings.
- No remote code is loaded. All scripts are bundled; the page security policy allows scripts only from the extension itself.

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://github.com/kekincai/bookmark-cover-flow/blob/main/docs/privacy-policy.md

The repository must be public and the file must be on `main` for this URL to load. Open it in a signed-out browser before submitting.

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]: kekincai (confirm the name shown on the developer account)

**Contact Email** [REQUIRED]: TODO: contact email

**Support URL** [RECOMMENDED]: https://github.com/kekincai/bookmark-cover-flow/issues

**Homepage URL** [RECOMMENDED]: https://github.com/kekincai/bookmark-cover-flow

## Version History

| Version    | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                          | Status |
| ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Unreleased | —          | Website access becomes optional and opt-in (previews off by default; access released when turned off); new `alarms` permission for a daily cache cleanup; minimum Chrome 135; stricter preview fetching (public hosts only, no cookies, no referrer); stricter page security policy; Settings and full screen as native dialogs; single-key shortcuts toggle; accessibility and performance work. Version number not yet bumped. | Draft  |
| 1.2.0      | 2026-10-31 | Redesign with sidebar library, cover / grid / list views, generated covers, full screen, stage backgrounds, settings tabs, four languages, new icon.                                                                                                                                                                                                                                                                             | Draft  |

Update the Status column when a version is submitted or published. The next upload must use a version higher than any version already uploaded.

## Review Notes

### Known Issues / Limitations

- **Trademark risk — "Cover Flow".** "Cover Flow" is a name Apple has used for its own product feature. The extension name is unchanged in this revision, but store reviewers can reject listings that use another company's product names. The owner should confirm the trademark status of "Cover Flow" (and decide whether to rename) before submission. Store copy no longer describes the design as "Apple-style" or refers to Apple products.
- Upgrade path from 1.2.0 needs a manual check: 1.2.0 granted website access at install and stored previews as on by default. Verify in a profile upgraded from 1.2.0 whether Chrome keeps the earlier access and whether previews stay on, and make sure the Settings switch reflects the real state.
- Preview availability depends on each website; many sites do not declare a preview image, and those bookmarks keep their generated cover.
- Screenshots predate the current UI (see Graphics & Assets).

### Pre-Publish Checklist Status

| Item                                               | Status                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `manifest_version` is 3                            | ✅                                                                                       |
| Version bumped above the last uploaded version     | ⬜ Manifest still says 1.2.0                                                             |
| Name matches this file                             | ✅ "Bookmark Cover Flow"                                                                 |
| Manifest description ≤ 132 characters              | ✅ (English: 55 characters)                                                              |
| ZIP excludes dev files                             | ✅ Only `dist/` is zipped; source maps are disabled in `vite.config.ts`                  |
| Minimum permissions; no unused permissions         | ✅ Host access is optional; verify `alarms` stays in use if the cleanup changes          |
| Every permission justified                         | ✅ See table above                                                                       |
| Single purpose is narrow                           | ✅                                                                                       |
| No trademark problems in name, copy or screenshots | 🟡 "Cover Flow" in the name needs owner confirmation; Apple references removed from copy |
| Contact email valid and monitored                  | ⬜ `TODO: contact email`                                                                 |
| At least one current 1280×800 screenshot           | 🟡 Exists but must be retaken                                                            |
| Privacy policy URL live                            | ⬜ Verify after the policy update is merged to `main`                                    |
| Privacy policy matches the data-use form           | ✅ Policy rewritten for opt-in previews; re-check after final wording of the form        |
| No remote code, no obfuscation                     | ✅ Bundled scripts only; `script-src 'self'`                                             |
| Extension tested unpacked in a clean profile       | ⬜ Re-run `npm run test:extension` and a manual pass after the refactor lands            |

### Rejection History

None yet.
