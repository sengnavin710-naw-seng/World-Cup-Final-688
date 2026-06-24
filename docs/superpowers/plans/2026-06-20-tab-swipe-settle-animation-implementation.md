# Tab Swipe Settle Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make accepted Home-tab swipes animate continuously into the adjacent tab before committing active-tab state.

**Architecture:** Keep swipe threshold decisions unchanged and add a small settle lifecycle inside `useTabSwipe`. The hook animates the existing track to the target index, commits through `transitionend` with a timer fallback, and preserves immediate commits for reduced motion.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS transforms

---

## File Map

- Modify `apps/web/src/hooks/useTabSwipe.ts`: own settle state, transition completion, timeout fallback, cleanup, and the ease-in-out transition.
- Modify `apps/web/src/hooks/useTabSwipe.test.ts`: prove delayed commit, transition completion, fallback, rejected swipe, and reduced-motion behavior.
- Do not modify `resolveSwipeDelta`, API code, tab data modules, page components, or Knockout round-snap logic.

### Task 1: Prove Accepted Swipe Settling

**Files:**
- Modify: `apps/web/src/hooks/useTabSwipe.test.ts`
- Modify: `apps/web/src/hooks/useTabSwipe.ts`

- [ ] **Step 1: Extend the hook harness for animated assertions**

Change the existing harness signature and track element so tests can opt into animation and inspect the transform:

```tsx
function SwipeHarness({
  onIndexChange,
  reducedMotion = true,
}: {
  onIndexChange: (nextIndex: number) => void;
  reducedMotion?: boolean;
}) {
  const swipe = useTabSwipe({
    activeIndex: 1,
    onIndexChange,
    reducedMotion,
    tabCount: 4,
  });

  return createElement(
    "div",
    {
      "data-testid": "swipe-viewport",
      onPointerCancel: swipe.onPointerCancel,
      onPointerDown: swipe.onPointerDown,
      onPointerMove: swipe.onPointerMove,
      onPointerUp: swipe.onPointerUp,
      ref: swipe.viewportRef,
    },
    createElement("div", {
      "data-testid": "swipe-track",
      ref: swipe.trackRef,
    }),
    createElement(
      "div",
      {
        "data-tab-swipe-ignore": "true",
        "data-testid": "nested-scroll-area",
      },
      "Nested scroll area",
    ),
  );
}
```

- [ ] **Step 2: Write the failing accepted-swipe test**

Add a helper for pointer capture and a test that requires the target transform to finish before state commits:

```tsx
function installPointerCapture(viewport: HTMLElement) {
  Object.assign(viewport, {
    hasPointerCapture: () => false,
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  });
}

test("settles an accepted swipe before committing the adjacent tab", () => {
  const onIndexChange = vi.fn();
  render(
    createElement(SwipeHarness, {
      onIndexChange,
      reducedMotion: false,
    }),
  );
  const viewport = screen.getByTestId("swipe-viewport");
  const track = screen.getByTestId("swipe-track");
  setViewportWidth(viewport, 390);
  installPointerCapture(viewport);

  firePointerEvent(viewport, "pointerdown", {
    clientX: 300,
    clientY: 200,
    pointerId: 20,
  });
  firePointerEvent(viewport, "pointermove", {
    clientX: 120,
    clientY: 202,
    pointerId: 20,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 120,
    clientY: 202,
    pointerId: 20,
  });

  expect(onIndexChange).not.toHaveBeenCalled();
  expect(track.style.transition).toBe(
    "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  );
  expect(track.style.transform).toBe("translate3d(-780px, 0, 0)");

  fireEvent.transitionEnd(track, { propertyName: "transform" });

  expect(onIndexChange).toHaveBeenCalledTimes(1);
  expect(onIndexChange).toHaveBeenCalledWith(2);
});
```

- [ ] **Step 3: Run the focused test and confirm RED**

Run:

```bash
npm test -- src/hooks/useTabSwipe.test.ts
```

Expected: FAIL because `onIndexChange` is called immediately and the current transition curve is `cubic-bezier(0.22, 1, 0.36, 1)`.

- [ ] **Step 4: Add the minimal settle lifecycle**

In `useTabSwipe.ts`, change the transition constant and add lifecycle refs:

```ts
const SETTLE_DURATION_MS = 300;
const SETTLE_FALLBACK_MS = SETTLE_DURATION_MS + 80;
const SETTLE_TRANSITION =
  `transform ${SETTLE_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;

const settlingTargetIndexRef = useRef<number | null>(null);
const settleTimeoutRef = useRef<number | null>(null);
const settleTransitionEndRef = useRef<
  ((event: TransitionEvent) => void) | null
>(null);
```

Add cleanup and completion callbacks after `cancelFrame`:

```ts
const clearPendingSettle = useCallback(() => {
  const track = trackRef.current;
  const transitionEnd = settleTransitionEndRef.current;

  if (track && transitionEnd) {
    track.removeEventListener("transitionend", transitionEnd);
  }
  if (settleTimeoutRef.current !== null) {
    window.clearTimeout(settleTimeoutRef.current);
  }

  settleTransitionEndRef.current = null;
  settleTimeoutRef.current = null;
  settlingTargetIndexRef.current = null;
}, []);

const finishPendingSettle = useCallback(() => {
  const targetIndex = settlingTargetIndexRef.current;

  if (targetIndex === null) {
    return;
  }

  clearPendingSettle();
  onIndexChange(targetIndex);
}, [clearPendingSettle, onIndexChange]);
```

Add `startTargetSettle` after `setTransform`:

```ts
const startTargetSettle = useCallback(
  (targetIndex: number) => {
    const track = trackRef.current;

    if (reducedMotion || !track) {
      clearPendingSettle();
      setTransform(targetIndex, 0, false);
      onIndexChange(targetIndex);
      return;
    }

    clearPendingSettle();
    settlingTargetIndexRef.current = targetIndex;

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === track && event.propertyName === "transform") {
        finishPendingSettle();
      }
    };

    settleTransitionEndRef.current = handleTransitionEnd;
    track.addEventListener("transitionend", handleTransitionEnd);
    settleTimeoutRef.current = window.setTimeout(
      finishPendingSettle,
      SETTLE_FALLBACK_MS,
    );
    setTransform(targetIndex, 0, true);
  },
  [
    clearPendingSettle,
    finishPendingSettle,
    onIndexChange,
    reducedMotion,
    setTransform,
  ],
);
```

In `onPointerDown`, ignore a new gesture while settling:

```ts
if (settlingTargetIndexRef.current !== null) {
  return;
}
```

In `onPointerUp`, replace the accepted-swipe state commit:

```ts
if (delta === 0) {
  settle();
  return;
}

startTargetSettle(activeIndex + delta);
```

Include `startTargetSettle` in the callback dependencies.

- [ ] **Step 5: Normalize external index changes and cleanup**

Update the active-index layout effect so a tab-button click cancels stale settle work before positioning the active slide:

```ts
useLayoutEffect(() => {
  clearPendingSettle();
  settle();
}, [activeIndex, clearPendingSettle, reducedMotion, settle]);
```

Update unmount cleanup:

```ts
useLayoutEffect(
  () => () => {
    cancelFrame();
    clearPendingSettle();
  },
  [cancelFrame, clearPendingSettle],
);
```

- [ ] **Step 6: Run the focused test and confirm GREEN**

Run:

```bash
npm test -- src/hooks/useTabSwipe.test.ts
```

Expected: all hook tests pass and the accepted swipe commits once after `transitionend`.

- [ ] **Step 7: Commit Task 1**

```bash
git add apps/web/src/hooks/useTabSwipe.ts apps/web/src/hooks/useTabSwipe.test.ts
git commit -m "fix: settle tab swipes before navigation"
```

### Task 2: Cover Fallback And Motion Preferences

**Files:**
- Modify: `apps/web/src/hooks/useTabSwipe.test.ts`
- Modify only if tests reveal a defect: `apps/web/src/hooks/useTabSwipe.ts`

- [ ] **Step 1: Write the failing timeout fallback test**

```tsx
test("commits an accepted swipe through the settle timeout fallback", () => {
  vi.useFakeTimers();
  const onIndexChange = vi.fn();
  render(
    createElement(SwipeHarness, {
      onIndexChange,
      reducedMotion: false,
    }),
  );
  const viewport = screen.getByTestId("swipe-viewport");
  setViewportWidth(viewport, 390);
  installPointerCapture(viewport);

  firePointerEvent(viewport, "pointerdown", {
    clientX: 300,
    clientY: 200,
    pointerId: 21,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 120,
    clientY: 202,
    pointerId: 21,
  });

  expect(onIndexChange).not.toHaveBeenCalled();
  vi.advanceTimersByTime(380);
  expect(onIndexChange).toHaveBeenCalledWith(2);
  vi.useRealTimers();
});
```

- [ ] **Step 2: Add rejected-swipe and reduced-motion assertions**

```tsx
test("animates a rejected swipe back to the active tab", () => {
  const onIndexChange = vi.fn();
  render(
    createElement(SwipeHarness, {
      onIndexChange,
      reducedMotion: false,
    }),
  );
  const viewport = screen.getByTestId("swipe-viewport");
  const track = screen.getByTestId("swipe-track");
  setViewportWidth(viewport, 390);
  installPointerCapture(viewport);

  firePointerEvent(viewport, "pointerdown", {
    clientX: 200,
    clientY: 200,
    pointerId: 22,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 170,
    clientY: 202,
    pointerId: 22,
  });

  expect(onIndexChange).not.toHaveBeenCalled();
  expect(track.style.transition).toContain("300ms cubic-bezier(0.4, 0, 0.2, 1)");
  expect(track.style.transform).toBe("translate3d(-390px, 0, 0)");
});

test("commits an accepted swipe immediately for reduced motion", () => {
  const onIndexChange = vi.fn();
  render(createElement(SwipeHarness, { onIndexChange }));
  const viewport = screen.getByTestId("swipe-viewport");
  setViewportWidth(viewport, 390);
  installPointerCapture(viewport);

  firePointerEvent(viewport, "pointerdown", {
    clientX: 300,
    clientY: 200,
    pointerId: 23,
  });
  firePointerEvent(viewport, "pointerup", {
    clientX: 120,
    clientY: 202,
    pointerId: 23,
  });

  expect(onIndexChange).toHaveBeenCalledWith(2);
});
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- src/hooks/useTabSwipe.test.ts
```

Expected: all fallback, rejected-swipe, reduced-motion, and existing swipe tests pass.

- [ ] **Step 4: Commit Task 2**

```bash
git add apps/web/src/hooks/useTabSwipe.test.ts apps/web/src/hooks/useTabSwipe.ts
git commit -m "test: cover tab swipe settle fallbacks"
```

### Task 3: Full Verification And Mobile QA

**Files:**
- Verify: `apps/web/src/hooks/useTabSwipe.ts`
- Verify: `apps/web/src/hooks/useTabSwipe.test.ts`

- [ ] **Step 1: Run the complete frontend test suite**

```bash
npm test
```

Run from `apps/web`. Expected: all test files pass with no failures.

- [ ] **Step 2: Run TypeScript lint**

```bash
npm run lint
```

Run from `apps/web`. Expected: `tsc --noEmit` exits with code 0.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Run from `apps/web`. Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Check whitespace and scope**

```bash
git diff --check
git diff -- apps/web/src/hooks/useTabSwipe.ts apps/web/src/hooks/useTabSwipe.test.ts
```

Expected: no whitespace errors and no production changes outside the swipe hook.

- [ ] **Step 5: Verify the touch interaction**

At a mobile viewport on `http://127.0.0.1:5173/`:

1. Open Home on Knockout.
2. Drag toward Fixtures past the threshold and release.
3. Confirm the page continues from the release position into Fixtures over 300 ms.
4. Confirm the active underline changes only when the page reaches Fixtures.
5. Drag below threshold and confirm the page returns smoothly.
6. Swipe quickly across Table and confirm navigation remains limited to one adjacent tab.
7. Vertically scroll each tab and confirm no horizontal navigation occurs.

- [ ] **Step 6: Record final status without committing unrelated work**

Report test, lint, build, browser evidence, and any Browser-tool limitation. Do not stage the pending Table gesture fix, color-comparison mockup, or other unrelated working-tree files as part of this feature.
