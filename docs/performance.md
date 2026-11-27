# Performance validation

The repeatable local extension check is `npm run test:extension`. It creates a temporary Chromium profile, seeds only public test bookmarks, loads the production extension, and removes the profile afterward.

## v1.0 validation — August 23, 2026

Environment: Apple Silicon Mac, Chromium supplied by Playwright, 1280 × 800 viewport.

| Scenario                                            | Result |
| --------------------------------------------------- | -----: |
| Public bookmarks with real webpage previews         |     15 |
| Initial extension/folder render                     | 348 ms |
| 5,000-bookmark folder render                        |  39 ms |
| Covers in DOM at the start of the 5,000-item folder |      8 |
| Maximum virtual window                              |     15 |
| Console errors                                      |      0 |

These figures are a local regression baseline, not a guarantee for every machine or network. Preview resolution is asynchronous and does not block the first cover render. Motion stops its `requestAnimationFrame` loop after settling.

## Infinity glass / continuous-motion baseline

The new regression suite also checks fractional wheel movement, keyboard interruption of pending wheel snaps, held drag release, pointer cancellation, SVG filter namespace and parameters, lip-profile controls, and DOM identity during preview updates. Numerical tests compare 60/120 Hz and uneven frame schedules; optical samples and the HDR WGSL checksum match the reference project.

The isolated extension check now records animation-frame intervals during real browser wheel input, confirms that Enter opens the selected item, and reports display capabilities. In the local run, 15 public bookmarks were seeded, 3 of the active folder's 5 sites supplied loaded preview images, initial render took 387 ms, and the 5,000-item folder rendered 8 live cards in 79 ms. There were no console errors. Sites without an available preview use the fallback; 15 seeded bookmarks does not imply 15 successful previews.

The 1.4-second wheel sample recorded 111 intervals: median 8.4 ms, p95 25 ms, maximum 25.1 ms. These observed intervals include browser/OS scheduling and are not a claim of locked 120 fps. Physical trackpad feel was not human-tested. The test display reported SDR with WebGPU available: SDR fallback was verified, but true HDR luminance still requires an HDR-capable screen.

At that earlier checkpoint, 32 unit tests and 14 browser interaction tests passed, along with typechecking, lint, formatting, build and ZIP integrity checks. The optional GPU shader test skipped in headless Chromium because no adapter was exposed; rerunning it with `--headed --workers=1` passed on a real WebGPU device with no shader compilation errors. That compilation test does not validate HDR display luminance.

## Wallpaper and floating settings validation — August 28, 2026

The current revision passed 41 unit tests and 27 headed browser tests, including the GPU shader test and real-video tests. The media fixture was a decoded 10-bit BT.2020/PQ video. Tests cover silent playback, persistent pause, corrupt-file and storage-failure recovery, four translated locales plus unsupported-language fallback, horizontal keyboard tabs, and stable settings layout in light and dark themes.

The transparency regression captures the same empty patch inside a stationary card at two decoded video timestamps and verifies that the rendered pixels change. A separate isolated Chrome extension run used six public bookmarks and MDN's CC0 flower video; four sites supplied loaded previews. Native playback remained muted with zero volume and no CSS filter, and no application errors were observed. The local screenshots use this isolated profile, not the user's bookmarks. Hardware HDR luminance and physical trackpad feel remain outside these automated checks.

## 1.2.0 redesign — October 31, 2026

Environment: Apple Silicon Mac (120 Hz display), headed Chromium supplied by Playwright, 1280 × 800 viewport, production build loaded from `dist`. `npm run test:extension` seeds 15 public bookmarks, then adds a 5,000-bookmark stress folder after the screenshots are taken. The Liquid Glass/WebGPU/HDR renderer no longer exists, so its shader and display-capability checks were removed.

| Scenario                                                        |                                Result |
| --------------------------------------------------------------- | ------------------------------------: |
| Initial render (All Bookmarks, 15 public bookmarks)             |                                305 ms |
| Reload with All Bookmarks holding 5,015 bookmarks               |                                278 ms |
| Switching to the 5,000-bookmark folder                          |                                203 ms |
| Covers in the DOM (5,000-item folder, at the start and end)     |                              8 (≤ 15) |
| List rows in the DOM for 5,000 bookmarks (`aria-rowcount` 5001) |                                    17 |
| Frame interval during wheel input over the 5,000-item stage     | p50 8.5 ms · p95 17.2 ms (124 frames) |
| Frame interval while dragging the scrubber end to end           | p50 16.6 ms · p95 17.5 ms (97 frames) |
| Nearby covers resolved (site preview or generated art)          |                                8 of 8 |
| Console errors                                                  |                                     0 |

Across repeated runs the render times varied by roughly ±100 ms and the wheel p95 stayed between 16.8 and 17.2 ms. Preview availability depends on the network and the sites themselves; the run only requires that at least one public site supplies a loaded preview image and that every nearby cover leaves the `pending` state.

Two rendering regressions were found and fixed while measuring:

- The loading shimmer animated forever on every cover, even after its placeholder had faded out. With eight reflected covers on screen this restyled and repainted the stage every frame while idle. The animation now runs only while the placeholder is visible; an idle page records no style recalculations.
- Dragging the scrubber across 5,000 bookmarks replaced the whole ±7 window every frame, and creating new `-webkit-box-reflect` covers made pre-paint cost about 16 ms per frame (p50 33 ms, about 30 fps). Covers leaving the window are now recycled instead of recreated, bringing the drag to p50 16.6 ms (60 fps).

Test counts at this checkpoint: 71 unit tests in 17 files, and 38 browser tests (37 passed, 1 skipped: the native-video wallpaper test runs only when `WALLPAPER_TEST_VIDEO` points at a decodable video). The browser suite covers sidebar collections and counts, search titles and highlighting, the no-results, empty and error/retry states, list ↔ stage selection, keyboard focus zones and the 90 ms key-repeat limit, full screen, the settings dialog (tabs, focus trap, Escape), persistence of theme, cover angle, reflection, sort and preview preferences, reduced motion, Mist/Night/photo backgrounds, a 390 px viewport, and four locales plus English fallback. Physical trackpad feel and screen-reader output were not tested automatically.

## Unreleased refactor — measured 2026-11-27

Measured with `npm run test:extension:headless` (Chrome's new headless mode, which loads the unpacked extension, 1280 × 800) on the same machine for the 1.2.0 build and the refactored build. The verification copy of the build grants the optional website access up front and turns previews on, so the preview path is exercised as before. Headless frame timing differs from the headed numbers above, so compare rows within this table only.

| Measurement (headless, same machine)                     |          1.2.0 |       Refactor |
| -------------------------------------------------------- | -------------: | -------------: |
| Switching to the 5,000-bookmark folder                   |          94 ms |       77–94 ms |
| Wheel frame interval over the 5,000-item stage (p50/p95) |   8.3 / 9.2 ms |   8.3 / 9.3 ms |
| Scrubber drag end to end (p50/p95)                       | 16.5 / 24.2 ms | 16.7 / 25.1 ms |
| Console errors with the extension CSP + Trusted Types    |              0 |              0 |

Initial and All-Bookmarks render times stayed within the ±100 ms run-to-run spread noted above (194–344 ms and 232–417 ms across runs, partly with two browsers running at once), so no change is claimed for them. Lazy cover art and the cached search text did not produce a measurable difference in these scenarios; they reduce work that grows with library size, and the gain should be re-checked on a slower machine.

One regression was found and fixed during the refactor: the first version of the `.truncate` reveal ran a scroll-timeline animation on every truncated cell at rest, which raised the scrubber p50 to 24.9 ms. The animation now runs only while a title is hovered or focused, which brought the drag back to 16.7 ms (`e2e/truncation.spec.ts` guards the behaviour).

Not yet measured: the daily preview-cache sweep on a full 3,000-entry cache, and time to the selected cover's preview with the new fetch priorities.
