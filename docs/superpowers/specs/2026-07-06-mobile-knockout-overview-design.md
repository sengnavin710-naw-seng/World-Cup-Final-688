# Mobile Knockout Overview Design

## Goal

Add a second mobile-only knockout view that presents the entire tournament bracket as a vertically scrolling overview, matching the supplied reference. The existing round-by-round mobile view and the desktop bracket remain unchanged.

## User Experience

The mobile knockout screen has two view modes:

- `detail`: the existing round selector and horizontally swiped round view.
- `overview`: the complete bracket fitted to the viewport width and scrolled only vertically.

A fixed circular button near the lower-right corner switches between the modes. It respects the device safe area and remains visible while the bracket scrolls. Pressing it again returns to detail mode with the previously selected round and scroll position preserved.

The overview hides the round selector. It retains the current visual theme and uses the same flags, team labels, scores, dates, loser treatment, Final and Bronze-final badges, and champion trophy as the existing knockout UI.

## Overview Layout

The overview uses a dedicated narrow-screen layout instead of scaling the desktop canvas.

- The first tournament branch begins at the top and converges downward through its rounds toward the semi-final and Final.
- The Final, Bronze-final, and champion presentation occupy the center portion of the vertical bracket.
- The second tournament branch continues below the center and expands downward in the opposite direction.
- Match cards are sized from the available viewport width. Their text remains readable at supported widths and no card or connector extends beyond the horizontal viewport.
- Cards show two teams, flags, abbreviated labels, and either completed scores or the scheduled date.
- Losing teams remain visually subdued without changing a completed card to white.
- Connector lines are rendered as a static SVG layer with no scroll-time animation or expensive filters.

The overview has no horizontal scrolling, horizontal swipe navigation, round snapping, or position interpolation. Vertical touch gestures remain local to the overview and must not trigger the parent tab carousel.

## Component Design

`KnockoutTab` owns a mobile view-mode state with `detail` as the initial value. The existing detail state and layout calculations stay mounted or otherwise retain their state so switching views does not reset the selected round.

The overview is implemented as an isolated mobile component with three responsibilities:

1. Convert the existing `KnockoutRound[]` data into deterministic overview match positions.
2. Generate connector paths from those positions.
3. Render memoized overview cards and the champion node.

The layout function is pure and accepts rounds plus viewport width. Its result contains board height, positioned matches, connector paths, and champion placement. Computation is memoized by rounds and width. It does not run in response to vertical scroll.

The view-toggle button uses the project's existing icon library, has an accessible label describing the destination view, and is only visible at the mobile breakpoint. Desktop rendering and geometry are not modified.

## Data And Empty States

Both views consume the same `rounds` and `teams` props. No API or schema changes are required.

Unknown teams continue to use the existing placeholder presentation. Missing or partially populated rounds must not collapse the board geometry. If no rounds exist, the overview renders an empty stable container and the toggle remains safe to use.

## Performance

- Overview geometry is calculated only when tournament data or viewport width changes.
- Cards are memoized and connector paths are static during scrolling.
- No CSS blur, SVG filter, large shadow, or scroll-linked React state is used in overview mode.
- The overview uses native vertical scrolling with `touch-action: pan-y`.
- The existing detail-mode performance optimizations remain intact.

## Accessibility

- The toggle is a real button with a destination-specific `aria-label` and pressed state.
- The overview section has a descriptive accessible label.
- Decorative connectors and trophy details are hidden from assistive technology where appropriate.
- Match information remains available as semantic text inside each card.

## Verification

Automated tests cover:

- Switching between detail and overview.
- Hiding and restoring the round selector.
- Preserving the selected detail round across mode switches.
- Producing overview geometry without horizontal overflow at 320, 375, 390, and 430 pixel viewport widths.
- Rendering completed scores, penalties where applicable, future dates, placeholders, Final, Bronze-final, loser styling, and champion presentation.
- Preventing overview gestures from invoking round navigation or the parent tab swipe.

Run the focused component tests, lint, and production build. Perform screenshot and interaction checks at representative mobile widths, including vertical scrolling and safe-area spacing for the floating button. Confirm that desktop layout and behavior are unchanged.

## Out Of Scope

- API or knockout data-model changes.
- Pinch-to-zoom.
- Horizontal panning in overview mode.
- Changes to the desktop bracket.
- Theme or color redesign.
