# Tab Swipe Settle Animation Design

## Problem

When a horizontal Home-tab swipe crosses the navigation threshold, the active tab changes before the carousel visibly completes its movement. On touch devices this reads as an abrupt page replacement rather than a continuous swipe and makes the interface feel jerky.

Changing only the CSS easing curve would soften the motion but would not correct the ordering problem. The carousel must finish moving to its target position before committing the active tab state.

## Goals

- Continue the carousel from the user's release position to the adjacent tab.
- Use a 300 ms ease-in-out settle animation.
- Commit the active tab only after the settle animation completes.
- Animate back to the current tab when the gesture does not cross the threshold.
- Preserve the existing distance, velocity, direction, and edge thresholds.
- Preserve vertical page scrolling, nested-scroll exclusions, reduced-motion behavior, lazy tab mounting, and tab data prefetching.

## Interaction Design

### Successful swipe

1. The user drags the carousel horizontally.
2. The existing swipe decision function selects at most one adjacent tab.
3. On release, the track animates from its current drag position to the exact adjacent-tab position.
4. The animation uses `300ms cubic-bezier(0.4, 0, 0.2, 1)`.
5. The active tab state and navigation indicator update after the track reaches the target.
6. The track is normalized to the committed active index without a visible jump.

### Rejected swipe

If the gesture remains below both existing thresholds, the track animates back to the current tab with the same duration and easing.

### Reduced motion

When reduced motion is enabled, the carousel skips the settle animation and commits the selected tab immediately.

## Technical Design

The change stays inside `useTabSwipe` and its tests.

- Keep the existing `resolveSwipeDelta` logic unchanged.
- Track whether a settle animation is currently running.
- On an accepted swipe, call the existing transform writer with the target index before calling `onIndexChange`.
- Listen for the track's `transitionend` event and commit the target index exactly once when the transform transition completes.
- Add a timeout slightly longer than 300 ms as a fallback for browsers that do not dispatch `transitionend`.
- Ignore new pointer gestures while the track is settling so a second gesture cannot corrupt the pending target.
- Clear transition listeners, animation frames, and fallback timers on completion and unmount.
- After the active index commits, normalize the transform to the committed index without replaying the animation.

The adjacent slide is already mounted by `TabCarousel`, so the target content remains visible throughout the settle motion. No API, query, data, or tab component changes are required.

## Error And Edge Handling

- A transition event for a CSS property other than `transform` does not commit navigation.
- Duplicate `transitionend` events cannot commit twice.
- A missing transition event is recovered by the fallback timer.
- Pointer cancellation returns to the current tab and clears the gesture.
- Swipes beyond the first or last tab retain the existing edge resistance and settle back behavior.
- Unmounting during a settle clears all pending work.

## Testing

Add focused hook tests that verify:

- An accepted swipe starts a 300 ms target transform without immediately calling `onIndexChange`.
- A `transform` transition completion commits the adjacent tab once.
- A below-threshold swipe animates back and does not change tabs.
- Reduced motion commits immediately.
- The timeout fallback commits when `transitionend` is absent.
- Existing vertical intent, nested-scroll exclusion, threshold, edge, and resize tests remain green.

Run the complete frontend test suite, TypeScript lint, production build, and a mobile touch check in the in-app browser when available.

## Acceptance Criteria

- Releasing an accepted swipe produces one continuous motion into the next tab.
- The target page does not replace the current page before the track reaches its snap point.
- The settle duration is 300 ms with ease-in-out timing.
- Rejected swipes return smoothly to the current tab.
- Tab navigation remains limited to one adjacent tab per gesture.
- Vertical scrolling and interactive nested scroll areas continue to work.
- No changes occur to API calls, business data, Knockout round snapping, or page layouts.
