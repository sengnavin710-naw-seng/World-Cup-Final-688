# Knockout Swipe Navigation Design

## Goal

Make horizontal navigation predictable at the edge of the Knockout bracket and in Overview mode without interfering with native vertical scrolling.

## Detail mode

- A horizontal swipe toward the next tab continues to advance one knockout round at a time.
- When Finals is already selected, the next qualifying forward swipe requests navigation to Fixtures.
- A backward swipe returns to the previous knockout round.
- Vertical and predominantly vertical gestures only scroll the bracket and never change round or tab.
- The bracket keeps native DOM `scrollLeft` at zero; round movement remains driven by logical state and board transform.

## Overview mode

- The overview remains a native vertical scroll surface.
- It no longer opts out of AppShell tab swipe handling.
- A qualifying forward horizontal swipe requests Fixtures through the existing AppShell navigation flow.
- A backward swipe is accepted by the shared tab gesture system but has no visible effect because Knockout is the first tab.
- Predominantly vertical gestures remain native scrolling and do not change tab.

## Integration

`KnockoutTab` continues to use `onFastForwardSwipe` for the Detail-mode boundary handoff. Overview mode delegates horizontal gestures to `useTabSwipe` by removing its swipe-ignore marker and avoiding local horizontal touch interception.

## Shared tab swipe sensitivity

- A slow horizontal gesture commits tab navigation after crossing 18% of the viewport width, reduced from 28%.
- A gesture below 18% settles back unless it independently satisfies the existing fast-swipe velocity rule.
- The existing horizontal-intent ratio remains unchanged so diagonal and vertical gestures do not become easier to misclassify.
- The threshold applies consistently to every AppShell tab, including Knockout Overview.

## Tests

- Detail mode calls the tab-navigation callback after a forward swipe from settled Finals.
- Detail mode still advances exactly one round before Finals.
- Overview does not carry the swipe-ignore marker.
- Shared tab-swipe tests verify horizontal navigation from Overview and vertical gesture rejection.
- Shared resolver boundary tests verify that a slow 17% swipe settles back and a slow 18% swipe changes tab.
- Existing axis-lock, mode restore, and production build checks remain green.
