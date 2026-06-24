# Knockout Mobile Gesture Lock Design

## Goal

Make the mobile knockout bracket predictable on iOS and Android without changing its visual design. Vertical browsing must keep the selected round locked, ordinary horizontal gestures must snap exactly one round, and a deliberate fast forward swipe from any round must open Fixtures.

## Current Problem

The knockout scroller decides the gesture axis after movement begins. On a slightly diagonal vertical gesture, iOS may change `scrollLeft` before the gesture is classified. The gesture then exits without restoring the horizontal position, leaving the bracket between round anchors. Later scroll events may select a different round or fail to settle, which appears as shaking and intermittent snapping.

The bracket also performs React state updates while scrolling and snapping. This work can amplify visible jitter, especially when cards and connector paths are being interpolated. Responsive width changes update the final-card width but do not explicitly re-anchor the current round.

## Interaction Contract

### Vertical Gesture

- The round at touch start becomes the locked round for the gesture.
- Once the gesture is classified as vertical, horizontal movement is ignored.
- `scrollLeft` remains at the locked round anchor while `scrollTop` follows the user's vertical movement.
- Releasing a vertical gesture never changes the active round and never resets vertical scroll position.

### Ordinary Horizontal Gesture

- Once classified as horizontal, the gesture controls only horizontal bracket movement.
- Releasing below the round-change threshold returns to the locked round.
- Releasing beyond the threshold advances or returns by exactly one round.
- The result always settles with the round column aligned to the left inset of 8px.

### Fast Forward Gesture

- A leftward gesture that satisfies both the existing fast-swipe distance and velocity thresholds opens Fixtures.
- Fast forward is available from every knockout round, including Finals.
- A normal-speed gesture never opens Fixtures.
- Backward horizontal gestures remain inside the knockout bracket.

### Responsive Behavior

- Measure the actual bracket viewport with `ResizeObserver`, not only the window resize event.
- After a viewport-width change, preserve the active round and re-anchor it to the 8px left inset.
- Preserve vertical scroll position during a responsive re-anchor.
- Final and bronze-final card widths continue to adapt to the available viewport.

## Technical Direction

Keep the existing knockout component and data model. Do not rewrite the bracket or change the main Home tab carousel.

Strengthen the existing gesture controller:

1. Store a stable locked round index and its exact horizontal anchor at touch start.
2. Resolve the gesture axis once and do not allow it to change during that gesture.
3. Restore the locked horizontal anchor when the gesture resolves as vertical.
4. Snap ordinary horizontal gestures from the locked round rather than from the nearest transient scroll position.
5. Send only qualifying fast forward gestures to the existing `onFastForwardSwipe` callback.
6. Re-anchor the active round after responsive size changes.

Avoid introducing a carousel dependency or replacing the bracket with CSS scroll snap in this change. The current interpolated card and connector motion remains intact.

## Performance Guardrails

- Keep DOM scroll writes inside animation frames.
- Do not add synchronous layout reads inside the animation loop.
- Do not add new React state updates for every touch event.
- Cancel stale scroll and snap animation frames when a new gesture starts.
- Preserve existing card and connector fade behavior.

## Accessibility

- Round buttons remain keyboard-operable tabs.
- Existing reduced-motion behavior remains unchanged.
- No new flashing or blinking effects are added.

## Tests

Add regression coverage for:

- a diagonal vertical gesture preserving the current round and horizontal anchor;
- vertical scrolling preserving `scrollTop` without round changes;
- a small horizontal drag returning to the same round;
- an accepted ordinary swipe moving exactly one round;
- a fast forward swipe from Round of 32 opening Fixtures;
- a fast forward swipe from Finals opening Fixtures;
- a normal swipe from Finals staying inside the bracket;
- a viewport resize preserving the active round at the 8px inset;
- stale animation frames being cancelled when a new gesture begins.

Run the focused Knockout tests, the complete frontend test suite, TypeScript lint, production build, and rendered mobile checks before completion. Real-device verification remains required on at least one iOS and one Android device.

## Out of Scope

- Changing the main Home tab swipe animation.
- Changing knockout card sizes, colors, spacing, or data.
- Adding Round-button tap animations.
- Replacing the bracket implementation or adding a new carousel library.
