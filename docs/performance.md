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
