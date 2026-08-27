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
