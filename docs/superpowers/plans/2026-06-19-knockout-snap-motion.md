# Knockout Snap Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile knockout swipes settle smoothly onto one adjacent column while round-chip colors track drag progress and the target column aligns at the existing 8px inset.

**Architecture:** Keep native horizontal scrolling and derive one fractional round position from `scrollLeft`. Use it for layout and chip visuals, lock one target during snap, and defer selected-round side effects until the destination settles.

**Tech Stack:** React, TypeScript, CSS custom properties, Vitest, Testing Library, Vite

---

## File Map

- Modify `apps/web/src/components/home/KnockoutTab.tsx`: pure motion helpers, frame-throttled scroll state, gesture classification, snap locking, and settled-round handling.
- Modify `apps/web/src/components/home/KnockoutTab.test.tsx`: progress, alignment, threshold, snap-lock, and vertical-gesture regression tests.
- Modify `apps/web/src/styles.css`: progress-driven round-chip colors.

### Task 1: Define One Fractional Motion Model

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:335-470`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: Write a failing drag-progress test**

```tsx
test("tracks chip progress without changing the settled round during drag", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const scroller = screen
    .getByLabelText("World Cup knockout rounds")
    .querySelector(".knockout-mobile-bracket-scroll");

  Object.defineProperty(scroller, "scrollLeft", { configurable: true, value: 128 });
  fireEvent.scroll(scroller!);

  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveStyle({
    "--round-selection-progress": "0.5",
  });
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveStyle({
    "--round-selection-progress": "0.5",
  });
  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm.cmd test --workspace web -- KnockoutTab.test.tsx -t "tracks chip progress"`

Expected: FAIL because chips do not expose progress and live scrolling currently changes `aria-selected`.

- [ ] **Step 3: Add pure progress helpers**

```ts
type MobileRoundMotion = {
  fromRoundIndex: number;
  progress: number;
  toRoundIndex: number;
};

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getMobileRoundMotion(roundOffsets: number[], viewportAnchor: number): MobileRoundMotion {
  const firstOffset = roundOffsets[0] ?? mobileBoard.left;
  const lastOffset = roundOffsets.at(-1) ?? firstOffset;
  const clampedAnchor = Math.min(lastOffset, Math.max(firstOffset, viewportAnchor));
  const fromRoundIndex = Math.max(
    0,
    roundOffsets.findIndex((offset, index) => {
      const nextOffset = roundOffsets[index + 1];
      return typeof nextOffset !== "number" || clampedAnchor <= nextOffset;
    }),
  );
  const toRoundIndex = Math.min(fromRoundIndex + 1, roundOffsets.length - 1);
  const fromOffset = roundOffsets[fromRoundIndex] ?? firstOffset;
  const toOffset = roundOffsets[toRoundIndex] ?? fromOffset;
  const progress = toOffset === fromOffset
    ? 0
    : clampUnit((clampedAnchor - fromOffset) / (toOffset - fromOffset));

  return { fromRoundIndex, progress, toRoundIndex };
}

function getRoundSelectionProgress(motion: MobileRoundMotion, roundIndex: number) {
  if (roundIndex === motion.fromRoundIndex) return 1 - motion.progress;
  if (roundIndex === motion.toRoundIndex) return motion.progress;
  return 0;
}
```

- [ ] **Step 4: Reuse the helper for cards and chip styles**

Replace duplicate offset/progress calculation in `getMobileBracketLayout`. Add this style to each round chip:

```tsx
style={
  {
    "--round-selection-progress": getRoundSelectionProgress(mobileRoundMotion, roundIndex),
  } as CSSProperties
}
```

The live scroll handler must only schedule `mobileScrollLeft`; it must not change `activeMobileRound`, reset `scrollTop`, or call `scrollIntoView`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm.cmd test --workspace web -- KnockoutTab.test.tsx -t "tracks chip progress"`

Expected: PASS.

### Task 2: Lock and Settle One Snap Target

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:640-755`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx:410-530`

- [ ] **Step 1: Write failing snap tests**

Cover these assertions using mutable real-scroller properties like the existing tests:

```tsx
expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", left: 0, top: 0 });
expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", left: 256, top: 0 });
```

Add separate tests for a 20px swipe returning to `0`, a 36px swipe moving to `256`, a large swipe still moving one round, and `aria-selected` changing only after the scroller reaches the target.

- [ ] **Step 2: Run snap tests and verify RED**

Run: `npm.cmd test --workspace web -- KnockoutTab.test.tsx -t "snap|threshold|adjacent"`

Expected: the settled-selection assertion fails because selection currently changes during live scroll.

- [ ] **Step 3: Add gesture and snap refs**

```ts
type MobileTouchStart = {
  clientX: number;
  clientY: number;
  roundIndex: number;
  scrollLeft: number;
  scrollTop: number;
};

const mobileTouchStartRef = useRef<MobileTouchStart | null>(null);
const mobileSnapTargetRef = useRef<number | null>(null);
const mobileScrollFrameRef = useRef<number | null>(null);
```

Record `clientX` and `clientY` from the first touch. On touch end, compare finger deltas; fall back to scroll deltas only when coordinates are unavailable.

- [ ] **Step 4: Throttle scroll state to one render per frame**

```ts
const scheduleMobileScrollUpdate = (scrollLeft: number) => {
  if (mobileScrollFrameRef.current !== null) {
    cancelAnimationFrame(mobileScrollFrameRef.current);
  }
  mobileScrollFrameRef.current = requestAnimationFrame(() => {
    setMobileScrollLeft(scrollLeft);
    mobileScrollFrameRef.current = null;
  });
};
```

Add unmount cleanup that cancels a pending frame.

- [ ] **Step 5: Snap once and settle at the exact destination**

`snapToMobileRound` stores the target index and calls `scrollTo` once. Live scroll checks whether the actual position is within `1px` of the target. Only then does it set `activeMobileRound`, clear the snap target, reset vertical position when changing rounds, and center the selected chip once.

```ts
const isAtSnapTarget = Math.abs(scrollLeft - targetScrollLeft) <= 1;
const targetScrollLeft = Math.max(
  0,
  (mobileLayout.roundOffsets[targetRoundIndex] ?? 0) - mobileBoard.left,
);
```

Current exact destinations are `0`, `256`, `512`, `768`, and `1024`.

- [ ] **Step 6: Run KnockoutTab tests and verify GREEN**

Run: `npm.cmd test --workspace web -- KnockoutTab.test.tsx`

Expected: all tests pass without warnings.

### Task 3: Blend Chip Colors from Progress

**Files:**
- Modify: `apps/web/src/styles.css:1252-1276`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: Write a failing CSS-source test**

```tsx
test("blends knockout round chip colors from drag progress", () => {
  const styles = readFileSync("src/styles.css", "utf8");
  expect(styles).toMatch(
    /\.knockout-round-chip\s*\{[^}]*--round-selection-progress:\s*0;[^}]*color-mix/s,
  );
});
```

- [ ] **Step 2: Run the style test and verify RED**

Run: `npm.cmd test --workspace web -- KnockoutTab.test.tsx -t "blends knockout round chip colors"`

Expected: FAIL because colors currently switch only through `aria-selected`.

- [ ] **Step 3: Use the progress property in CSS**

```css
.knockout-round-chip {
  --round-selection-progress: 0;
  border-color: color-mix(in srgb, #313131 calc((1 - var(--round-selection-progress)) * 100%), #fff);
  background: color-mix(in srgb, #343434 calc((1 - var(--round-selection-progress)) * 100%), #fff);
  color: color-mix(in srgb, #f2f5f8 calc((1 - var(--round-selection-progress)) * 100%), #171717);
}
```

Remove the hard color switch from `.knockout-round-chip[aria-selected="true"]`. Do not add a color transition while dragging because progress already animates every frame.

- [ ] **Step 4: Run the component suite and verify GREEN**

Run: `npm.cmd test --workspace web -- KnockoutTab.test.tsx`

Expected: all KnockoutTab tests pass.

### Task 4: Mobile QA and Full Verification

**Files:**
- Verify: `apps/web/src/components/home/KnockoutTab.tsx`
- Verify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: Run static verification**

Run `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build`.

Expected: TypeScript, all web/API tests, and production builds exit with code 0.

- [ ] **Step 2: Verify mobile rendering at `http://127.0.0.1:5173/`**

Check Round of 32 initial alignment, partial drag color blending, Round of 16 settled at the 8px inset, sub-threshold return, reverse snap, vertical scrolling, blue connectors, board-height stability, and console health.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check`

Then inspect only `KnockoutTab.tsx`, `KnockoutTab.test.tsx`, and `styles.css`. Expected: no whitespace errors and no unrelated changes.

