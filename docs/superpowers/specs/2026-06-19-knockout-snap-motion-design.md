# Knockout Snap Motion Design

## Goal

Make horizontal round navigation feel continuous and predictable on mobile. A short horizontal swipe should settle the bracket onto the adjacent round without a visible jump, while outgoing and incoming round controls blend between inactive and active colors.

## Confirmed Behavior

- Round of 32 is the initial settled round.
- While dragging toward Round of 16, the outgoing control gradually darkens and the incoming control gradually becomes active.
- Releasing after a short intentional horizontal swipe advances exactly one round.
- Releasing an insufficient swipe returns to the starting round.
- A backward swipe follows the same behavior in reverse.
- The target card column settles at the same left position as Round of 32, using the existing `8px` board inset.
- A vertical gesture never triggers horizontal snap or resets vertical scroll.
- One gesture cannot skip more than one round.
- Existing card layout, connectors, board height, data, and API calls remain unchanged.

## Approaches Considered

### Native CSS scroll snap only

This is small, but browser momentum decides whether a short swipe advances. It cannot reliably enforce the required intentional-swipe threshold, and JavaScript would still be needed for live color progress.

### Controlled native scroll with progress tracking (selected)

Keep native touch scrolling, calculate a fractional round position from `scrollLeft`, and use it for both card interpolation and round-control colors. On release, lock one adjacent target and perform one smooth snap. This keeps touch behavior natural while making alignment deterministic.

### Fully custom transform and spring physics

This provides complete control but replaces native scrolling, increases browser and accessibility risk, and duplicates platform behavior.

## Architecture

`KnockoutTab` will use one horizontal motion model:

1. `scrollLeft` produces a fractional position between two round offsets.
2. The fractional position drives the existing card-layout interpolation.
3. The same position produces a visual progress value from `0` to `1` for each round chip.
4. Touch start records the settled round, finger coordinates, horizontal position, and vertical position.
5. Touch end classifies the gesture as vertical, insufficient horizontal, forward, or backward.
6. One snap target is locked until the scroller reaches it.
7. Selected-round side effects run only after settling, not while crossing the midpoint.

Scroll updates will be coalesced through `requestAnimationFrame`. This prevents native momentum, React state, `scrollIntoView`, and `scrollTo` from competing during one gesture.

## Visual States

Each round chip receives `--round-selection-progress` between `0` and `1`.

- `0`: inactive dark gray background, light text, gray border.
- `1`: active white background, dark text, white border.
- Between `0` and `1`: colors interpolate continuously.

Only the two rounds surrounding the viewport anchor transition. `aria-selected` represents the settled round, not the temporary drag position.

## Snap Rules

- Keep the existing `32px` horizontal threshold.
- Horizontal distance must be greater than vertical distance.
- Forward threshold swipe targets `startRound + 1`.
- Backward threshold swipe targets `startRound - 1`.
- Below threshold targets `startRound`.
- Clamp the target to the first and last rounds.
- Destination is `roundOffsets[targetIndex] - mobileBoard.left`, preserving the `8px` inset.
- During snap, scroll events update progress but cannot choose another target.

## Side Effects

- Remove `scrollTop = 0` from the live `onScroll` path.
- Do not call `scrollIntoView` while dragging.
- Center the settled chip once after snap completion.
- Keep vertical position when returning to the same round.
- Reset vertical position only after a completed snap changes rounds.

## Testing

Component tests will cover fractional progress, exact forward and backward destinations, sub-threshold return, one-round locking, vertical gestures, settled `aria-selected`, and progress-driven CSS. Mobile QA will check drag colors, exact 8px alignment, reverse swipe, vertical scrolling, connector visibility, layout stability, and console health.

