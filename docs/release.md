# Release process

1. Confirm the version matches in `package.json`, `package-lock.json`, and `public/manifest.json`.
2. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`.
3. Run `npm run package:extension` and load the resulting ZIP into a clean Chrome profile.
4. Check toolbar launch, nested folders, previews, recent items, sorting, themes, reduced motion, and keyboard-only navigation.
5. Retake the store and README screenshots with `npm run screenshots` (English UI, headless). On a macOS system set to another language, the bookmark root folders follow the test browser's language: run `defaults write com.google.chrome.for.testing AppleLanguages -array en-US` first and `defaults delete com.google.chrome.for.testing AppleLanguages` afterwards (this only affects Playwright's Chrome for Testing).
6. Review `CHROMEWEBSTORE.md` (permission justifications, data-use disclosure, version history, pre-publish checklist) and `docs/privacy-policy.md` against the submitted manifest permissions.
7. Tag the matching semantic version (for example, `v1.1.0`). The release workflow rebuilds and attaches `bookmark-cover-flow.zip` to the GitHub Release.

Do not submit source maps, local test profiles, private bookmarks, or temporary QA screenshots to the Chrome Web Store.
