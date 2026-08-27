# Motion design

The active bookmark is position `0`; side covers receive a pure transform derived from their fractional offset. Only `transform` and `opacity` change during navigation.

The engine solves a critically damped spring analytically (angular frequency 20/s). Position is measured in cards and velocity in cards/second. The analytic solution gives the same trajectory at 60 Hz, 120 Hz, or uneven frame intervals. Four-card navigation settles within 600 ms, with most displacement happening early and a quiet final tail. The spring frame loop stops at rest.

Rotation, depth, scale and horizontal spacing are continuous functions of fractional offset. There is no transform switch when a card crosses the center. Spacing follows the measured card width. Media windows have transparent backing; inset previews and translucent footer contrast preserve the image-first hierarchy while allowing wallpaper to remain visible.

Input events do not mutate cover DOM directly:

- wheel and trackpad deltas are normalized and applied as fractional movement once per animation frame, without a discrete minimum-distance threshold;
- the operating system's trackpad momentum tail is retained; after 160 ms without input, one snap runs (no second artificial fling);
- pointer drag scrubs the fractional position and projects velocity into the final snap;
- keyboard commands update the same target used by all other controllers;
- fast direction changes reuse current position and velocity rather than resetting animation.

A new pointer gesture interrupts the spring immediately. Drag velocity uses a 40 ms low-pass filter; holding for 80 ms before release cancels stale fling velocity. Gesture revisions prevent an old wheel timeout from overriding keyboard navigation or a new folder. Pointer cancellation never opens a bookmark.

Preview responses update media in place. Existing card buttons, focus and pointer capture survive. The virtual range is reconciled only when necessary, and folder navigation is not rebuilt for every image response.

With `prefers-reduced-motion`, target changes are immediate, side rotation is reduced, and reflections are disabled.

## Liquid Glass and HDR provenance

The optical algorithms are ported from the user-specified `infinity-newtab-extension` project: `liquid-optics.ts`, `liquid-glass.ts`, `liquid-controls.ts`, and `hdr-glass.ts`. Refraction index 1.5, 128 radial samples, the convex/lip profiles, 24 px precision magnification, saturation/specular composition, and the WGSL shader are retained. Integration changes add strict WebGPU types, correct SVG namespace construction, bounded map caching, and lifecycle cleanup.

One shared lens refracts actual rendered controls; it does not contain cloned text or screenshots. It operates on folder tabs, view options and the selected cover footer. The lens hides while a 3D card moves to avoid viewport/transform misalignment. Optical maps are generated at rest and reused; they are not regenerated on each animation frame.

The original HDR shader uses premultiplied `rgba16float`, extended tone mapping, white specular radiance above 1.0, pink/cyan dispersion and an inner caustic. It is enabled only on an HDR display with WebGPU; SDR keeps SVG refraction. A normal PNG screenshot cannot validate real HDR luminance.

Design references: [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Embla v8 gesture options](https://www.embla-carousel.com/docs/v8/api/options), [web.dev animation performance](https://web.dev/articles/animations-guide), and the Infinity optical implementation's source article, [Liquid Glass in the Browser](https://kube.io/blog/liquid-glass-css-svg/). No carousel or animation runtime dependency is added.

## Visual implementation decisions

- The pastel backdrop, pink accent, dark-blue text and rounded header follow Infinity's actual theme tokens; the dark variant preserves existing theme preferences.
- A fixed folder-back slot stays in the header because real bookmark hierarchies need back navigation. Folder depth does not move the brand or search field.
- Cards retain the concept's image-first hierarchy, rounded shell and compact footer. Real site-provided Open Graph images replace the concept's illustrative full-page screenshots; images are fitted without stretching or pretending to show page content that was not fetched.
- One shared optical lens adds the requested real refraction to controls and the active card footer. The concept image alone cannot demonstrate either dynamic refraction or HDR luminance.
- Floor reflections are deliberately faint and optional. The bottom arrow strip, scroll prompt and keyboard hints from the concept are omitted at the user's request; only bookmark metadata remains below the scene.
