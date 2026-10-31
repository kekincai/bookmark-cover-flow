# Motion design

The active bookmark is position `0`; every other cover gets a pure transform from its fractional offset. Only `transform` and `opacity` change during navigation.

## Geometry

The geometry is specified for a 240 px cover and scales linearly with the real cover size (340 px in full screen). With `a = |offset|`, `s = sign(offset)` and `t = min(a, 1)`:

```text
x       = a < 1 ? offset × 178 : s × (178 + (a − 1) × 60)   px
z       = 40 − 160 × t                                     center +40, sides −120
rotateY = s × angle × t                                    angle 70° by default, 45–80° in Settings
opacity = 1 up to 7 positions away, smoothstep fade to 0 at 8
```

Right-hand covers turn by `+angle`: their outer edge recedes and the edge nearest the center comes forward. The stage uses `perspective: 1100px` (1500 px in full screen) with the origin at 50% 55%. There is no `preserve-3d`; covers are stacked with `z-index = 100 − distance`. Every value is continuous through the center and the snap points, so there is no transform switch when a cover crosses the middle.

Side covers carry a gradient shade that is darker on the outer edge (2–16 % in light mode, 10–50 % in dark), halved on hover. The mirror reflection is `-webkit-box-reflect` and can be turned off in Settings.

## Spring

The engine solves a critically damped spring analytically (angular frequency 15/s). Position is measured in covers and velocity in covers per second, so the trajectory is identical at 60 Hz, 120 Hz or uneven frame intervals. A single flip covers about 90 % of its distance in 260 ms and settles by roughly 620 ms, matching `cubic-bezier(.22,.8,.24,1)` without overshoot. The frame loop stops at rest.

Input events never mutate cover DOM directly:

- wheel and trackpad deltas apply fractional movement once per frame at 60 px per cover; the OS momentum tail is kept and one snap runs after 160 ms without input;
- pointer drag scrubs at 60 px per cover; release velocity is projected with a friction of 0.92 per frame (about 0.19 s of travel) and then snaps to the nearest cover;
- holding an arrow key advances one cover every 90 ms whatever the OS repeat rate;
- the scrubber, the list and the keyboard all set the same target.

A new pointer gesture interrupts the spring immediately. Drag velocity uses a 40 ms low-pass filter; holding for 80 ms before release cancels a stale fling. Gesture revisions stop an old wheel timeout from overriding keyboard navigation or a new folder. Pointer cancellation never opens a bookmark.

Preview responses update media in place: card buttons, focus and pointer capture survive, and updates arriving in the same frame are batched into one store change.

## Reduced motion

With the system's Reduce Motion setting, or **Reduce flip animation** in Settings, target changes jump straight to the new cover and the stage cross-fades in 150 ms; covers never rotate in an animation. Shimmer and spinner animations stop.

## Opening

Hovering the centered cover shows an “Open ↗” pill. Clicking presses the cover to 0.97 in 100 ms before it springs back, and the pill reads “Opening…” while the tab opens.
