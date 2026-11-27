# Privacy Policy for Bookmark Shelf

Last updated: November 27, 2026

Bookmark Shelf is a Chrome extension that shows your existing Chrome bookmarks as covers, a grid and a list. It has no user account, analytics, advertising, telemetry or server run by the developer. Nothing the extension reads or stores is sent to the developer.

## What data the extension uses

- **Bookmarks.** Your bookmark titles, addresses and folders are read from Chrome on your device to draw the covers, grid and list. The extension does not create, change or delete bookmarks.
- **Preferences.** Your view settings (theme, sort order, view, cover angle, reflection, reduced flip animation, single-key shortcuts, website previews on or off, and the last folder you had open) are saved in the extension's local storage.
- **Recently Opened.** When you open a bookmark from Bookmark Shelf, the extension records that bookmark's ID, title, address and the time you opened it. The list holds at most 50 entries, newest first. Only bookmarks opened from this extension are recorded; Chrome's browsing history is not requested or read.
- **Preview cache.** If you turn on website previews, the extension stores, for each page it checked, the page address, the preview image address the page declared (if any, and only if shorter than about 2 KB) and the page's theme color.
- **Background photo or video.** If you choose a photo or video for the stage background, only the file you pick in the system file picker is read. An unchanged copy is stored in the extension's local database (IndexedDB) on this device. It is never uploaded, sent to any website or synchronized.
- **Site icons.** Bookmark icons come from Chrome's own local icon cache; showing them does not contact any website.

## How data is stored

Everything above is stored only on your device, in this Chrome profile: preferences, Recently Opened and the preview cache in the extension's local storage, and the background file in the extension's local database. The extension does not use Chrome sync storage, so none of this data is synchronized to your Google account or to other devices.

## Website previews and network requests

Website previews are **off by default**. While they are off, the extension makes no network requests at all, and every cover is generated on your device from the site's name, icon and colors.

When you turn on **Prefer website preview images** in Settings, Chrome asks you to allow the extension to access websites. That access is optional: if you decline, previews stay off. When you later turn the setting off, the extension gives the access back to Chrome. You can also remove it at any time from `chrome://extensions`.

With previews on and access granted:

- **Which pages.** The extension requests only the bookmarks you are looking at: the selected cover and up to eight on either side, or the tiles visible in the grid. The selected cover is requested first. While a page's result is in the local cache, the page is not requested again.
- **Which addresses are skipped.** Only `http` and `https` addresses on public hosts are requested. The extension does not start requests to `localhost`, loopback, private-network or link-local IP addresses, names ending in `.local`, `.internal`, `.lan`, `.home.arpa` or `.intranet`, single-label intranet names, addresses that include a user name or password, or addresses longer than 2,048 characters. If a public page redirects to a private-network address, the response is discarded before its content is read.
- **What is sent.** The request goes directly to the bookmarked website, not through any server run by the developer. It is sent **without cookies** and **without a referrer**. The website receives the bookmark's address and the information any web request carries, such as your IP address and browser user agent. Chrome may also add an `Origin: chrome-extension://<extension ID>` header, which can reveal to that website that Bookmark Shelf is installed.
- **What is read.** The extension reads only the beginning of the page, up to the end of its `<head>` section and never more than about 512 KB, to find the page's declared preview image (Open Graph or Twitter card image) and its `theme-color`. The rest of the page is not downloaded. Requests time out after 8 seconds.
- **Preview images.** The preview image is then shown as an ordinary image inside the extension, loaded over `https` (a plain `http` image address is upgraded to `https`) and without a referrer. The image may be hosted on a different server chosen by the website, such as a content delivery network. Unlike the page request, image loads follow Chrome's normal cookie rules, so the image server may receive its own cookies depending on your third-party cookie settings.

The websites and image servers you contact this way handle those requests under their own privacy policies.

The preview process accepts requests only from the extension's own pages; websites cannot ask it to fetch anything.

## How data is used

The data is used only to show your bookmarks: to draw covers and lists, to sort by recent use, to remember your settings, and to avoid checking the same page repeatedly. It is not used for advertising, profiling, credit or lending decisions, or any purpose unrelated to the extension.

## Third-party services

The extension does not use any third-party services, analytics or software development kits. The only outside parties it can contact are the bookmarked websites and their image servers, and only when you have turned on website previews.

## Data sharing

The developer receives no data from the extension and does not sell, rent, share or transfer user data to anyone.

## Data retention and deletion

- **Preview cache.** A successful preview result is reused for up to 7 days; a page that had no preview, or could not be reached, is retried after 12 hours. Expired entries are deleted automatically by a daily cleanup and whenever the extension is installed or updated. The cache is limited to 3,000 entries; beyond that, the oldest are deleted.
- **Recently Opened** and **preferences** remain until you clear them, clear the extension's data, or remove the extension.
- **Background file** remains until you choose another background, choose **Restore default background**, clear the extension's data, or remove the extension. Restoring the default deletes only the extension's copy; your original file is not touched.

To delete data:

- **Settings > Privacy** has buttons to clear the preview cache and the Recently Opened list.
- Turning off **Prefer website preview images** stops all website requests and removes the website access.
- Removing the extension from `chrome://extensions` deletes all of its stored data, including the background file.

None of these actions changes your Chrome bookmarks.

## Permissions

- `bookmarks`: read the bookmark folders and bookmarks the extension displays.
- `storage`: save preferences, the Recently Opened list and the preview cache on this device.
- `favicon`: show site icons from Chrome's local icon cache.
- `alarms`: run the daily cleanup that deletes expired preview-cache entries.
- `https://*/*`, `http://*/*` (optional, not granted at install): requested only when you turn on website previews, to read each bookmarked public page's preview image and theme color as described above. Released when you turn previews off.

## Changes to this policy

If the extension's data practices change, this policy will be updated before the change is released, the date at the top will change, and the change will be noted in the project's [changelog](../CHANGELOG.md).

## Contact

Privacy questions: [me@kejincai.dev](mailto:me@kejincai.dev)

You can also open an issue at <https://github.com/kekincai/bookmark-cover-flow/issues>. Please report security vulnerabilities privately as described in [SECURITY.md](../SECURITY.md).
