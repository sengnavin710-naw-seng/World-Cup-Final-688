# Home Tab Carousel Controller Design

## Goal

Make the Home tabs (`Knockout`, `Fixtures`, `Table`, `News`) feel like one horizontal image carousel. Swiping should move the page surface and the blue tab indicator together in real time. Clicking a tab should animate the same carousel track instead of instantly cutting to the target tab.

The change must preserve the existing Knockout bracket interaction. The bracket should keep handling normal horizontal round swipes; only a clearly strong horizontal escape gesture inside the Knockout surface may switch the main Home tab.

## Current Problem

The current `useTabSwipe` implementation can delay active tab changes until a transform settle finishes, but the visible experience still feels close to the old behavior because:

- The tab button click path calls `setActiveIndex(index)` immediately.
- The blue underline is attached to active tab styling instead of being a shared moving indicator.
- The carousel does not expose live drag progress to the tab strip.
- Nested Knockout gestures and main tab gestures need different thresholds.

## User-Visible Behavior

### Swipe Between Home Tabs

- Dragging left or right on the main Home tab surface moves the content track with the finger.
- While dragging, the blue underline moves between tab buttons in real time.
- Releasing past the tab threshold settles to the adjacent tab with a `300ms` animation.
- Releasing below the tab threshold settles back to the current tab with a `300ms` animation.
- The active tab value changes only after the settle animation completes.

### Click A Tab Button

- Clicking any tab animates the content track directly to that tab, even when the target is several tabs away.
- Example: clicking `News` from `Knockout` slides the track in one continuous movement from index `0` to index `3`.
- The blue underline moves with the same progress as the page track.
- The active tab value changes only after the click animation completes.

### Tab Button Hover

- Desktop hover makes the button text darker and adds a soft blue background.
- Hover must not move the blue underline.
- The underline represents only active, dragging, or settling state.

### Knockout Gesture Protection

- Normal swipes inside the Knockout bracket continue to control the bracket rounds.
- A main tab swipe may start inside the Knockout bracket only when it becomes a strong horizontal escape gesture.
- Initial escape threshold:
  - horizontal distance at least `45%` of the Home tab viewport width, or
  - horizontal distance at least `140px` with velocity at least `1.8px/ms`.
- Vertical movement still cancels main tab intent.
- Buttons, filters, inputs, menus, and table controls remain excluded from main tab swipes.

## Architecture

### Carousel Motion State

Introduce a single controller for the Home tab carousel motion. It owns:

- `activeIndex`: committed tab index.
- `visualIndex`: fractional index used for live track and underline position.
- `pendingIndex`: target index while settling, or `null`.
- `gestureState`: idle, dragging, or settling.
- `interactionSource`: pointer, click, or programmatic.

`visualIndex` is the key value. Examples:

- `0` means fully on `Knockout`.
- `0.5` means halfway between `Knockout` and `Fixtures`.
- `3` means fully on `News`.

### Content Track

`TabCarousel` uses `visualIndex` to compute the track offset in React and apply a direct transform string:

```css
transform: translate3d(-<visualIndex * viewportWidth>px, 0, 0);
```

During a pointer drag, transition is disabled. During settle or click navigation, transition is:

```css
transform 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

The existing lazy mounting behavior stays: active tab and adjacent tabs should be mounted. During long click navigation, the source tab, target tab, and immediate neighbors should be mounted so the slide does not show blank content.

### Tab Indicator

The tab strip gets one shared underline element instead of per-button underline styling.

The controller calculates the underline from `visualIndex` by interpolating between measured button rectangles:

- `left`
- `width`

For example, when `visualIndex` is `0.4`, the underline is 40% of the way from the `Knockout` button geometry to the `Fixtures` button geometry.

The tab strip scrolls the active/target button into view with `behavior: "auto"` during dragging and settling to avoid lag.

### Click Navigation

Clicking a tab calls `startTabSettle(targetIndex)` instead of `setActiveIndex(targetIndex)`.

If reduced motion is enabled:

- commit immediately,
- set `visualIndex` to the target,
- do not animate.

### Pointer Navigation

The pointer flow is:

1. `pointerdown` records the start point and the start `visualIndex`.
2. `pointermove` decides intent after the slop threshold.
3. When horizontal intent is active, update `visualIndex` continuously.
4. `pointerup` resolves the target:
   - adjacent tab only for swipe gestures,
   - no multi-tab jumps from one finger swipe.
5. Settle to target or current tab.
6. Commit `activeIndex` after transition end or fallback timeout.

### Knockout Escape Zones

Use explicit attributes to keep intent readable:

- `data-tab-swipe-ignore="true"`: never starts a main tab swipe.
- `data-tab-swipe-escape="strong"`: allows main tab swipe only after the strong escape threshold.

The Knockout bracket surface should use the escape attribute. Interactive controls inside it keep the ignore attribute.

## Non-Goals

- Do not redesign the Knockout bracket layout.
- Do not change Knockout round snapping behavior except to let very strong horizontal gestures escape to the main tab carousel.
- Do not change data loading, Supabase/API behavior, or tournament data structures.
- Do not add new libraries for animation.
- Do not create visual mockup files or comparison HTML.

## Testing Plan

### Unit / Component Tests

- Dragging main tab content updates track transform during the drag.
- Dragging main tab content updates the underline position during the drag.
- Releasing past threshold settles to adjacent tab and commits after transition end.
- Releasing below threshold settles back and does not commit.
- Clicking a far tab animates directly to the target tab and commits after transition end.
- Reduced motion commits immediately and disables animated transitions.
- Hover styling does not move the underline.
- Normal Knockout bracket swipe does not change the main tab.
- Strong Knockout escape swipe changes the main tab.
- Interactive controls marked ignore never trigger a main tab swipe.

### Manual QA

- On phone, swipe `Knockout -> Fixtures -> Table -> News` and back.
- On phone, slowly drag halfway and release; verify it returns smoothly.
- On phone, click `News` from `Knockout`; verify the page slides across in one continuous movement.
- On phone, swipe Knockout rounds normally; verify the bracket still works.
- On phone, strong-swipe from Knockout bracket to another Home tab; verify it escapes only when deliberate.
- On desktop, hover tabs; verify soft hover state without moving underline.

## Acceptance Criteria

- Home tab swiping feels like a picture carousel.
- Blue underline follows finger movement during drag.
- Clicking tabs uses the same slide motion as swiping.
- Animation duration is `300ms`.
- Active tab/content state does not cut early before settle completes.
- Knockout bracket round swiping still works.
- Strong Knockout escape gestures can switch the main tab.
- Tests, typecheck, and production build pass.
