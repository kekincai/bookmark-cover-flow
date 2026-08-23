# Motion design

The active bookmark is position `0`; side covers receive a pure transform derived from their fractional offset. Only `transform` and `opacity` change during navigation.

The engine combines target attraction with velocity damping. It is intentionally critically calm: it should feel continuous without advertising a spring model. Motion state is updated only while moving, so idle CPU use is near zero.

Input events do not mutate cover DOM directly:

- wheel and trackpad deltas are accumulated, normalized, and emitted at animation-frame cadence;
- pointer drag scrubs the fractional position and projects velocity into the final snap;
- keyboard commands update the same target used by all other controllers;
- fast direction changes reuse current position and velocity rather than resetting animation.

With `prefers-reduced-motion`, target changes are immediate, side rotation is reduced, and reflections are disabled.
