# Knockout Mobile Gesture Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile knockout bracket keep its current round during vertical scrolling, snap ordinary horizontal gestures exactly one round, re-anchor responsively, and send qualifying fast forward swipes from any round to Fixtures.

**Architecture:** Keep the existing `KnockoutTab` data and rendering structure. Strengthen its touch gesture state so each gesture owns one immutable round anchor and one immutable axis, then use the existing snap animator for horizontal completion. Replace window-only width tracking with a `ResizeObserver` attached to the bracket scroller and re-anchor the active round without resetting vertical scroll.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, browser-native touch and ResizeObserver APIs.

---

## File Map

- Modify: `apps/web/src/components/home/KnockoutTab.tsx`
  - Owns mobile bracket axis classification, locked round anchor, snapping, responsive measurement, and the fast-forward callback.
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
  - Adds regression coverage for diagonal vertical gestures, ordinary horizontal snaps, responsive re-anchoring, and fast forward from Finals.
- Verify only: `apps/web/src/components/layout/AppShell.tsx`
  - Already maps `onFastForwardSwipe` to Fixtures through `requestTabNavigation(1)`; no production change is expected.
- Verify only: `apps/web/src/styles.css`
  - Existing mobile bracket sizing and 8px inset remain unchanged.

### Task 1: Lock Vertical Gestures to the Starting Round

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:20-42,1085-1214`

- [ ] **Step 1: Write the failing diagonal-vertical regression test**

Add a test beside `does not snap back to the top after a vertical mobile bracket scroll`:

```tsx
test("keeps the active round anchored during a diagonal vertical gesture", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const bracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = bracket.querySelector<HTMLDivElement>(
    ".knockout-mobile-bracket-scroll",
  );
  let scrollLeft = 256;
  let scrollTop = 120;

  expect(scroller).toBeInstanceOf(HTMLDivElement);
  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = Number(value);
      },
    },
  });

  fireEvent.scroll(scroller!);
  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 180, clientY: 520 }],
  });
  scrollLeft = 272;
  scrollTop = 320;
  fireEvent.touchMove(scroller!, {
    touches: [{ clientX: 172, clientY: 390 }],
  });
  fireEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 172, clientY: 220 }],
  });

  expect(scrollLeft).toBe(256);
  expect(scrollTop).toBe(320);
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx -t "keeps the active round anchored during a diagonal vertical gesture"
```

Expected: FAIL because `scrollLeft` remains at the diagonal drift value instead of returning to `256`.

- [ ] **Step 3: Store the immutable locked round anchor**

Extend the existing gesture state:

```ts
type MobileTouchStart = {
  axis: "pending" | "horizontal" | "vertical";
  clientX: number;
  clientY?: number;
  lockedScrollLeft: number;
  roundIndex: number;
  scrollLeft: number;
  scrollTop: number;
  startedAt: number;
};
```

At touch start, prefer the selected round instead of the nearest transient position:

```ts
const selectedRoundIndex = Math.max(
  0,
  rounds.findIndex((round) => round.round === activeMobileRound),
);
const lockedScrollLeft = getMobileRoundScrollLeft(
  mobileLayout.roundOffsets,
  selectedRoundIndex,
);

mobileTouchStartRef.current = {
  axis: "pending",
  clientX: touch?.clientX ?? 0,
  clientY: touch?.clientY,
  lockedScrollLeft,
  roundIndex: selectedRoundIndex,
  scrollLeft,
  scrollTop: event.currentTarget.scrollTop,
  startedAt: event.timeStamp,
};
```

- [ ] **Step 4: Restore the horizontal anchor once the axis is vertical**

In `handleMobileBracketTouchMove`, after axis classification:

```ts
if (gestureStart.axis === "vertical") {
  if (event.currentTarget.scrollLeft !== gestureStart.lockedScrollLeft) {
    event.currentTarget.scrollLeft = gestureStart.lockedScrollLeft;
    latestMobileScrollLeftRef.current = gestureStart.lockedScrollLeft;
    setMobileScrollLeft(gestureStart.lockedScrollLeft);
  }
  return;
}
```

In the vertical branch of `finishMobileBracketGesture`, restore only the horizontal anchor and preserve `scrollTop`:

```ts
if (
  gestureStart.axis === "vertical" ||
  Math.abs(verticalDelta) > Math.abs(horizontalDelta)
) {
  event.currentTarget.scrollLeft = gestureStart.lockedScrollLeft;
  latestMobileScrollLeftRef.current = gestureStart.lockedScrollLeft;
  setMobileScrollLeft(gestureStart.lockedScrollLeft);
  settleMobileRound(gestureStart.roundIndex);
  return;
}
```

- [ ] **Step 5: Prevent scroll events from adopting vertical drift**

At the start of `handleMobileBracketScroll`:

```ts
const gesture = mobileTouchStartRef.current;

if (gesture?.axis === "vertical") {
  if (scroller.scrollLeft !== gesture.lockedScrollLeft) {
    scroller.scrollLeft = gesture.lockedScrollLeft;
  }
  return;
}
```

- [ ] **Step 6: Run focused Knockout tests and verify GREEN**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx
```

Expected: all `KnockoutTab` tests PASS, including the new diagonal vertical test and the existing vertical `scrollTop` test.

- [ ] **Step 7: Commit the vertical lock**

```powershell
git add apps/web/src/components/home/KnockoutTab.tsx apps/web/src/components/home/KnockoutTab.test.tsx
git commit -m "fix: lock knockout round during vertical scroll"
```

### Task 2: Keep Ordinary Horizontal Snaps Deterministic

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:1106-1214`

- [ ] **Step 1: Add a failing test for a gesture starting between anchors**

```tsx
test("snaps an ordinary swipe from the selected round instead of a transient offset", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const bracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = bracket.querySelector<HTMLDivElement>(
    ".knockout-mobile-bracket-scroll",
  );
  let scrollLeft = 276;

  expect(scroller).toBeInstanceOf(HTMLDivElement);
  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.click(screen.getByRole("tab", { name: "Round of 16" }));
  animationClock.finish();
  scrollLeft = 276;
  fireEvent.scroll(scroller!);
  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 260, clientY: 200 }],
  });
  fireEvent.touchMove(scroller!, {
    touches: [{ clientX: 210, clientY: 202 }],
  });
  fireEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 210, clientY: 202 }],
  });
  animationClock.finish();

  expect(scrollLeft).toBe(512);
  expect(screen.getByRole("tab", { name: "Quarter-finals" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx -t "snaps an ordinary swipe from the selected round instead of a transient offset"
```

Expected: FAIL if the gesture derives its source round from `scrollLeft = 276` instead of the selected Round of 16.

- [ ] **Step 3: Resolve ordinary swipe targets only from the locked round**

Keep the threshold calculation, but derive the target only from `gestureStart.roundIndex`:

```ts
let targetRoundIndex = gestureStart.roundIndex;

if (Math.abs(horizontalDelta) >= mobileRoundSnapThreshold) {
  targetRoundIndex += horizontalDelta > 0 ? 1 : -1;
}

const nextRoundIndex = Math.min(
  rounds.length - 1,
  Math.max(0, targetRoundIndex),
);
```

Before starting a new horizontal gesture, continue cancelling both stale frame types:

```ts
cancelMobileSnapAnimation();
cancelMobileScrollUpdate();
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx
```

Expected: all tests PASS; ordinary gestures change no more than one round and small drags return to the locked round.

- [ ] **Step 5: Commit deterministic snapping**

```powershell
git add apps/web/src/components/home/KnockoutTab.tsx apps/web/src/components/home/KnockoutTab.test.tsx
git commit -m "fix: snap knockout gestures from locked round"
```

### Task 3: Re-anchor the Active Round on Responsive Size Changes

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:905-916`

- [ ] **Step 1: Add a controllable ResizeObserver test double**

Add this helper near the animation-frame helper:

```ts
class ControlledResizeObserver implements ResizeObserver {
  static instances: ControlledResizeObserver[] = [];
  readonly observedTargets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    ControlledResizeObserver.instances.push(this);
  }

  disconnect = vi.fn(() => this.observedTargets.clear());
  observe = vi.fn((target: Element) => this.observedTargets.add(target));
  unobserve = vi.fn((target: Element) => this.observedTargets.delete(target));

  trigger(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this);
  }
}
```

Reset and install it in the test lifecycle:

```ts
beforeEach(() => {
  ControlledResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
});
```

- [ ] **Step 2: Write the failing responsive re-anchor test**

```tsx
test("re-anchors the selected round after the bracket viewport resizes", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const bracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = bracket.querySelector<HTMLDivElement>(
    ".knockout-mobile-bracket-scroll",
  );
  let scrollLeft = 256;
  let scrollTop = 280;
  let clientWidth = 390;

  expect(scroller).toBeInstanceOf(HTMLDivElement);
  Object.defineProperties(scroller!, {
    clientWidth: { configurable: true, get: () => clientWidth },
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = Number(value);
      },
    },
  });

  const initialObserver = ControlledResizeObserver.instances.find((instance) =>
    instance.observedTargets.has(scroller!),
  );
  act(() => initialObserver?.trigger(scroller!));
  fireEvent.click(screen.getByRole("tab", { name: "Round of 16" }));
  animationClock.finish();
  fireEvent.scroll(scroller!);
  scrollLeft = 291;
  clientWidth = 320;
  const observer = ControlledResizeObserver.instances.find((instance) =>
    instance.observedTargets.has(scroller!),
  );
  act(() => observer?.trigger(scroller!));

  expect(scrollLeft).toBe(256);
  expect(scrollTop).toBe(280);
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

- [ ] **Step 3: Run the responsive test and verify RED**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx -t "re-anchors the selected round after the bracket viewport resizes"
```

Expected: FAIL because the current code observes `window.resize` only and leaves `scrollLeft` at `291`.

- [ ] **Step 4: Replace window-only measurement with ResizeObserver**

Add a ref synchronized to the selected round:

```ts
const activeMobileRoundRef = useRef("");

useEffect(() => {
  activeMobileRoundRef.current = activeMobileRound;
}, [activeMobileRound]);
```

Replace the current width effect with an observer on `mobileBoardScrollRef.current`. Keep the cancellation inline so the effect does not depend on callback functions declared later in the component:

```ts
useEffect(() => {
  const scroller = mobileBoardScrollRef.current;

  if (!scroller) {
    return;
  }

  const updateMobileViewport = () => {
    const nextWidth = scroller.clientWidth;
    setMobileViewportWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );

    const selectedRoundIndex = Math.max(
      0,
      rounds.findIndex(
        (round) => round.round === activeMobileRoundRef.current,
      ),
    );
    const targetScrollLeft = getMobileRoundScrollLeft(
      getMobileRoundOffsets(rounds),
      selectedRoundIndex,
    );
    const preservedScrollTop = scroller.scrollTop;

    if (mobileSnapAnimationFrameRef.current !== null) {
      cancelAnimationFrame(mobileSnapAnimationFrameRef.current);
      mobileSnapAnimationFrameRef.current = null;
    }
    if (mobileScrollFrameRef.current !== null) {
      cancelAnimationFrame(mobileScrollFrameRef.current);
      mobileScrollFrameRef.current = null;
    }
    scroller.scrollLeft = targetScrollLeft;
    scroller.scrollTop = preservedScrollTop;
    latestMobileScrollLeftRef.current = targetScrollLeft;
    setMobileScrollLeft(targetScrollLeft);
  };

  updateMobileViewport();

  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", updateMobileViewport);
    return () => window.removeEventListener("resize", updateMobileViewport);
  }

  const observer = new ResizeObserver(updateMobileViewport);
  observer.observe(scroller);
  return () => observer.disconnect();
}, [rounds]);
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx
```

Expected: all tests PASS and vertical `scrollTop` remains preserved after resize.

- [ ] **Step 6: Commit responsive anchoring**

```powershell
git add apps/web/src/components/home/KnockoutTab.tsx apps/web/src/components/home/KnockoutTab.test.tsx
git commit -m "fix: re-anchor knockout round after resize"
```

### Task 4: Preserve Fast Forward to Fixtures from Every Round

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Verify: `apps/web/src/components/home/KnockoutTab.tsx:1184-1200`
- Verify: `apps/web/src/components/layout/AppShell.tsx:282-286`

- [ ] **Step 1: Add coverage for fast forward from Finals**

```tsx
test("hands a qualifying fast swipe from Finals to Fixtures", () => {
  const animationClock = installAnimationFrameClock();
  const onFastForwardSwipe = vi.fn();
  render(
    <KnockoutTab
      rounds={lateMobileRounds}
      teams={[]}
      onFastForwardSwipe={onFastForwardSwipe}
    />,
  );
  const bracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = bracket.querySelector<HTMLDivElement>(
    ".knockout-mobile-bracket-scroll",
  );
  let scrollLeft = 0;

  expect(scroller).toBeInstanceOf(HTMLDivElement);
  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.click(screen.getByRole("tab", { name: "Finals" }));
  animationClock.finish();
  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 300, clientY: 200 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);
  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 80, clientY: 202 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_100 });
  fireEvent(scroller!, touchEnd);

  expect(onFastForwardSwipe).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Add coverage that an ordinary Finals swipe stays in Knockout**

```tsx
test("keeps an ordinary swipe from Finals inside the knockout bracket", () => {
  const animationClock = installAnimationFrameClock();
  const onFastForwardSwipe = vi.fn();
  render(
    <KnockoutTab
      rounds={lateMobileRounds}
      teams={[]}
      onFastForwardSwipe={onFastForwardSwipe}
    />,
  );
  const scroller = screen
    .getByLabelText("World Cup knockout rounds")
    .querySelector<HTMLDivElement>(".knockout-mobile-bracket-scroll");

  expect(scroller).toBeInstanceOf(HTMLDivElement);
  fireEvent.click(screen.getByRole("tab", { name: "Finals" }));
  animationClock.finish();
  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 260, clientY: 200 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);
  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 150, clientY: 202 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_500 });
  fireEvent(scroller!, touchEnd);

  expect(onFastForwardSwipe).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run both tests and inspect their result**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx -t "from Finals"
```

Expected: both characterization tests PASS with the current fast-forward thresholds. If either fails, correct only the round anchoring or threshold ordering while preserving the contract that fast forward is available from every round.

- [ ] **Step 4: Keep the existing fast-forward contract explicit**

The implementation must retain this ordering before ordinary round snapping:

```ts
if (
  horizontalDelta >= mobileFastSwipeDistance &&
  horizontalVelocity >= mobileFastSwipeVelocity &&
  allowFastForward &&
  onFastForwardSwipe
) {
  mobileSnapTargetRef.current = null;
  onFastForwardSwipe();
  return;
}
```

Do not add a final-round condition. `AppShell` already maps this callback to Fixtures:

```tsx
<LazyKnockoutTab
  onFastForwardSwipe={() => requestTabNavigation(1)}
  rounds={queries.knockout.data}
  teams={queries.teams.data ?? []}
/>
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npx.cmd vitest run --configLoader runner --environment jsdom --globals src/components/home/KnockoutTab.test.tsx
```

Expected: all Knockout tests PASS, including the existing fast-forward test from the first round and the new Finals tests.

- [ ] **Step 6: Commit the fast-forward regression coverage**

```powershell
git add apps/web/src/components/home/KnockoutTab.test.tsx apps/web/src/components/home/KnockoutTab.tsx
git commit -m "test: cover knockout fast forward from finals"
```

### Task 5: Full Verification and Real-Device Handoff

**Files:**
- Verify: `apps/web/src/components/home/KnockoutTab.tsx`
- Verify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: Run the complete frontend test suite**

```powershell
npm.cmd test -- --reporter=dot
```

Working directory: `apps/web`

Expected: all test files and tests PASS with zero failures.

- [ ] **Step 2: Run TypeScript lint**

```powershell
npm.cmd run lint
```

Working directory: `apps/web`

Expected: `tsc --noEmit` exits with code `0`.

- [ ] **Step 3: Run the production build**

```powershell
npm.cmd run build
```

Working directory: `apps/web`

Expected: Vite finishes the production build with exit code `0`.

- [ ] **Step 4: Check patch hygiene**

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` prints no errors. Confirm unrelated pre-existing dirty files were neither reverted nor included accidentally.

- [ ] **Step 5: Validate responsive bracket behavior in Browser**

Use the in-app Browser at `http://127.0.0.1:5173/` with these viewport widths:

- `320 x 700`
- `390 x 844`
- `430 x 932`

For each viewport:

1. Open Knockout.
2. Move to Round of 16.
3. Scroll vertically with a slightly diagonal path and confirm Round of 16 remains selected.
4. Perform a small horizontal drag and confirm it returns to Round of 16.
5. Perform an accepted ordinary swipe and confirm it advances only to Quarter-finals.
6. Rotate or change viewport width and confirm the selected round remains 8px from the left edge.
7. Move to Finals and verify an ordinary swipe remains inside Knockout.
8. Perform a qualifying fast forward swipe and confirm Fixtures becomes selected.
9. Confirm console warnings/errors contain no relevant application failures.

- [ ] **Step 6: Request real-device verification**

Ask the user to repeat the same diagonal vertical, ordinary horizontal, fast forward, and orientation-change checks on:

- one iOS device;
- one Android device.

Do not claim the physical-device jitter is resolved until the user confirms both devices.

- [ ] **Step 7: Confirm the verified implementation is committed**

Run:

```powershell
git status --short
git log -4 --oneline
```

Expected: the task commits are visible in the log and no uncommitted changes from this implementation remain. Pre-existing unrelated dirty files may remain and must not be reverted.
