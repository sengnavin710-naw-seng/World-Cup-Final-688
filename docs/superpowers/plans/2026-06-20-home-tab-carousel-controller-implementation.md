# Home Tab Carousel Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Home tabs move like one horizontal picture carousel, with the tab underline following the finger and click navigation using the same 300ms slide motion.

**Architecture:** Keep the existing React state ownership in `AppShell`, but move Home tab motion into an extended `useTabSwipe` controller that exposes `visualIndex`, `pendingIndex`, and an imperative `settleToIndex` command. `TabCarousel` remains the content track owner, while `AppShell` owns the visible tab strip and shared underline.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS transitions.

---

## File Structure

- Modify `apps/web/src/hooks/useTabSwipe.ts`: extend the swipe hook into a Home tab carousel controller, while keeping the existing pointer handlers and threshold helpers.
- Modify `apps/web/src/hooks/useTabSwipe.test.ts`: cover fractional visual index, click settle, reduced motion, and ignore-zone behavior.
- Modify `apps/web/src/components/layout/TabCarousel.tsx`: accept tab navigation requests, report motion state upward, and mount active, adjacent, target, and target-neighbor slides.
- Modify `apps/web/src/components/layout/TabCarousel.test.tsx`: cover far-tab navigation and slide mounting during a pending settle.
- Modify `apps/web/src/components/layout/AppShell.tsx`: replace immediate tab clicks with carousel navigation requests, add shared underline geometry, and route Knockout strong escape through the same carousel path.
- Modify `apps/web/src/components/home/KnockoutTab.tsx`: keep bracket round gestures independent while marking the bracket surface as a strong escape zone for documentation and future parent gesture handling.
- Modify `apps/web/src/components/home/KnockoutTab.test.tsx`: update the attribute expectation for the mobile bracket scroller.
- Modify `apps/web/src/styles.css`: replace per-button underline pseudo-element with a shared `.tab-indicator`, add hover styling, and keep carousel track transition controlled from JS.
- Modify `apps/web/src/components/home/AppShell.test.tsx`: verify click navigation uses a carousel request, underline exists, and fast Knockout escape still reaches Fixtures.

---

### Task 1: Extend `useTabSwipe` Motion State

**Files:**
- Modify: `apps/web/src/hooks/useTabSwipe.ts`
- Modify: `apps/web/src/hooks/useTabSwipe.test.ts`

- [ ] **Step 1: Add failing tests for visual index and imperative settle**

Add these tests inside `describe("useTabSwipe", () => { ... })` in `apps/web/src/hooks/useTabSwipe.test.ts`:

```tsx
function MotionStateHarness({
  onIndexChange,
  reducedMotion = false,
}: {
  onIndexChange: (nextIndex: number) => void;
  reducedMotion?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(1);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: (nextIndex) => {
      onIndexChange(nextIndex);
      setActiveIndex(nextIndex);
    },
    reducedMotion,
    tabCount: 4,
  });

  const setViewportRef = (node: HTMLDivElement | null) => {
    if (node) {
      setViewportWidth(node, 400);
    }

    (swipe.viewportRef as MutableRefObject<HTMLDivElement | null>).current =
      node;
  };

  return createElement(
    "div",
    {},
    createElement("output", { "data-testid": "visual-index" }, String(swipe.visualIndex)),
    createElement("output", { "data-testid": "pending-index" }, String(swipe.pendingIndex)),
    createElement(
      "button",
      {
        onClick: () => swipe.settleToIndex(3),
      },
      "Go to News",
    ),
    createElement(
      "div",
      {
        "data-testid": "swipe-viewport",
        onPointerCancel: swipe.onPointerCancel,
        onPointerDown: swipe.onPointerDown,
        onPointerMove: swipe.onPointerMove,
        onPointerUp: swipe.onPointerUp,
        ref: setViewportRef,
      },
      createElement("div", {
        "data-testid": "swipe-track",
        ref: swipe.trackRef,
      }),
    ),
  );
}

test("reports fractional visual index while dragging", () => {
  const frameClock = installAnimationFrameClock();
  const onIndexChange = vi.fn();
  render(createElement(MotionStateHarness, { onIndexChange }));
  const viewport = screen.getByTestId("swipe-viewport");
  const track = screen.getByTestId("swipe-track");

  setNonCapturingPointerApi(viewport);

  firePointerEvent(viewport, "pointerdown", {
    clientX: 300,
    clientY: 120,
    pointerId: 21,
  });
  firePointerEvent(viewport, "pointermove", {
    clientX: 200,
    clientY: 122,
    pointerId: 21,
  });

  frameClock.advance(16);

  expect(screen.getByTestId("visual-index")).toHaveTextContent("1.25");
  expect(track.style.transform).toBe("translate3d(-500px, 0, 0)");
  expect(onIndexChange).not.toHaveBeenCalled();
});

test("settles to a far clicked tab before committing active index", () => {
  const onIndexChange = vi.fn();
  render(createElement(MotionStateHarness, { onIndexChange }));
  const track = screen.getByTestId("swipe-track");

  fireEvent.click(screen.getByRole("button", { name: "Go to News" }));

  expect(screen.getByTestId("visual-index")).toHaveTextContent("3");
  expect(screen.getByTestId("pending-index")).toHaveTextContent("3");
  expect(track.style.transform).toBe("translate3d(-1200px, 0, 0)");
  expect(track.style.transition).toBe(
    "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  );
  expect(onIndexChange).not.toHaveBeenCalled();

  fireTransitionEndEvent(track, "transform");

  expect(onIndexChange).toHaveBeenCalledWith(3);
  expect(screen.getByTestId("pending-index")).toHaveTextContent("null");
});

test("commits a far clicked tab immediately with reduced motion", () => {
  const onIndexChange = vi.fn();
  render(
    createElement(MotionStateHarness, {
      onIndexChange,
      reducedMotion: true,
    }),
  );
  const track = screen.getByTestId("swipe-track");

  fireEvent.click(screen.getByRole("button", { name: "Go to News" }));

  expect(onIndexChange).toHaveBeenCalledWith(3);
  expect(screen.getByTestId("visual-index")).toHaveTextContent("3");
  expect(track.style.transition).toBe("none");
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
npm.cmd test -- src/hooks/useTabSwipe.test.ts
```

Expected: the new tests fail because `useTabSwipe` does not return `visualIndex`, `pendingIndex`, or `settleToIndex`.

- [ ] **Step 3: Extend the hook return value**

In `apps/web/src/hooks/useTabSwipe.ts`, add `useState` to the React import:

```ts
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
```

Add the exported motion type below `UseTabSwipeOptions`:

```ts
export type TabSwipePhase = "idle" | "dragging" | "settling";
```

Inside `useTabSwipe`, after `observedViewportWidthRef`, add:

```ts
const visualIndexRef = useRef(activeIndex);
const [visualIndex, setVisualIndex] = useState(activeIndex);
const [pendingIndex, setPendingIndex] = useState<number | null>(null);
const [phase, setPhase] = useState<TabSwipePhase>("idle");
```

Add this helper before `setTransform`:

```ts
const publishVisualIndex = useCallback((nextVisualIndex: number) => {
  visualIndexRef.current = nextVisualIndex;
  setVisualIndex(nextVisualIndex);
}, []);
```

Replace `setTransform` with:

```ts
const setTransform = useCallback(
  (index: number, dragOffset = 0, animated = false) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;

    if (!viewport || !track) {
      return;
    }

    const width = viewport.clientWidth || 1;
    const nextVisualIndex = index - dragOffset / width;

    track.style.transition =
      animated && !reducedMotion ? SETTLE_TRANSITION : "none";
    track.style.transform = `translate3d(${
      -nextVisualIndex * width
    }px, 0, 0)`;
    publishVisualIndex(nextVisualIndex);
  },
  [publishVisualIndex, reducedMotion],
);
```

In `clearPendingSettle`, before clearing the transition refs, add:

```ts
setPendingIndex(null);
setPhase("idle");
```

In `startTargetSettle`, add `setPendingIndex(targetIndex); setPhase("settling");` immediately after `clearPendingSettle();`.

In the reduced-motion branch of `startTargetSettle`, add:

```ts
publishVisualIndex(targetIndex);
setPendingIndex(null);
setPhase("idle");
```

In `onPointerMove`, when horizontal intent is active, add:

```ts
setPhase("dragging");
```

In the return object, add:

```ts
pendingIndex,
phase,
settleToIndex: startTargetSettle,
visualIndex,
```

- [ ] **Step 4: Run focused tests and confirm they pass**

Run:

```bash
npm.cmd test -- src/hooks/useTabSwipe.test.ts
```

Expected: all `useTabSwipe` tests pass.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add apps/web/src/hooks/useTabSwipe.ts apps/web/src/hooks/useTabSwipe.test.ts
git commit -m "feat: expose tab carousel motion state"
```

---

### Task 2: Let `TabCarousel` Receive Navigation Requests

**Files:**
- Modify: `apps/web/src/components/layout/TabCarousel.tsx`
- Modify: `apps/web/src/components/layout/TabCarousel.test.tsx`

- [ ] **Step 1: Add failing tests for far navigation and mounted slides**

In `apps/web/src/components/layout/TabCarousel.test.tsx`, add:

```tsx
function RequestHarness() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [requestId, setRequestId] = useState(0);
  const [motionText, setMotionText] = useState("0:null:idle");

  return (
    <>
      <button
        type="button"
        onClick={() => setRequestId((current) => current + 1)}
      >
        Request News
      </button>
      <output data-testid="motion-state">{motionText}</output>
      <TabCarousel
        activeIndex={activeIndex}
        navigationRequest={
          requestId > 0 ? { id: requestId, index: 3 } : null
        }
        onActiveIndexChange={setActiveIndex}
        onMotionStateChange={(state) =>
          setMotionText(`${state.visualIndex}:${state.pendingIndex}:${state.phase}`)
        }
        reducedMotion={false}
        renderTab={(tab: HomeTab) => <div>{`${tab} content`}</div>}
        tabs={tabs}
      />
    </>
  );
}

test("animates a far navigation request without committing early", () => {
  render(<RequestHarness />);
  const viewport = screen.getByLabelText("Tournament tabs");
  const track = screen.getByTestId("tab-carousel-track");
  setViewportWidth(viewport, 390);

  fireEvent.click(screen.getByRole("button", { name: "Request News" }));

  expect(track.style.transform).toBe("translate3d(-1170px, 0, 0)");
  expect(track.style.transition).toBe(
    "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  );
  expect(screen.getByTestId("motion-state")).toHaveTextContent("3:3:settling");
  expect(screen.getByTestId("tab-slide-Knockout")).not.toHaveAttribute(
    "aria-hidden",
  );

  fireTransitionEndEvent(track, "transform");

  expect(screen.getByTestId("tab-slide-News")).not.toHaveAttribute(
    "aria-hidden",
  );
});

test("mounts source, target, and target neighbor slides while settling", () => {
  render(<RequestHarness />);
  const viewport = screen.getByLabelText("Tournament tabs");
  setViewportWidth(viewport, 390);

  fireEvent.click(screen.getByRole("button", { name: "Request News" }));

  expect(screen.getByText("Knockout content")).toBeInTheDocument();
  expect(screen.getByText("Fixtures content")).toBeInTheDocument();
  expect(screen.getByText("Table content")).toBeInTheDocument();
  expect(screen.getByText("News content")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
npm.cmd test -- src/components/layout/TabCarousel.test.tsx
```

Expected: the new tests fail because `TabCarousel` has no `navigationRequest` or `onMotionStateChange` props.

- [ ] **Step 3: Extend `TabCarousel` props and wire the hook**

In `apps/web/src/components/layout/TabCarousel.tsx`, replace the import with:

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  useTabSwipe,
  type TabSwipePhase,
} from "../../hooks/useTabSwipe";
import type { HomeTab } from "../../lib/tournamentQueries";
```

Add these types above `TabCarouselProps`:

```tsx
export type TabNavigationRequest = {
  id: number;
  index: number;
};

export type TabCarouselMotionState = {
  pendingIndex: number | null;
  phase: TabSwipePhase;
  visualIndex: number;
};
```

Update `TabCarouselProps`:

```tsx
type TabCarouselProps = {
  activeIndex: number;
  navigationRequest?: TabNavigationRequest | null;
  onActiveIndexChange: (index: number) => void;
  onMotionStateChange?: (state: TabCarouselMotionState) => void;
  reducedMotion: boolean;
  renderTab: (tab: HomeTab) => ReactNode;
  tabs: readonly HomeTab[];
};
```

Destructure the new props:

```tsx
export function TabCarousel({
  activeIndex,
  navigationRequest = null,
  onActiveIndexChange,
  onMotionStateChange,
  reducedMotion,
  renderTab,
  tabs,
}: TabCarouselProps) {
```

After the `useTabSwipe` call, add:

```tsx
useEffect(() => {
  onMotionStateChange?.({
    pendingIndex: swipe.pendingIndex,
    phase: swipe.phase,
    visualIndex: swipe.visualIndex,
  });
}, [onMotionStateChange, swipe.pendingIndex, swipe.phase, swipe.visualIndex]);

useEffect(() => {
  if (!navigationRequest) {
    return;
  }

  swipe.settleToIndex(navigationRequest.index);
}, [navigationRequest, swipe]);

const mountedIndexes = useMemo(() => {
  const indexes = new Set<number>();
  const addWithNeighbors = (index: number | null) => {
    if (index === null) {
      return;
    }

    indexes.add(index);
    indexes.add(index - 1);
    indexes.add(index + 1);
  };

  addWithNeighbors(activeIndex);
  addWithNeighbors(swipe.pendingIndex);

  return indexes;
}, [activeIndex, swipe.pendingIndex]);
```

Replace `const shouldMount = Math.abs(index - activeIndex) <= 1;` with:

```tsx
const shouldMount = mountedIndexes.has(index);
```

- [ ] **Step 4: Keep `swipe` stable for the navigation effect**

If the full `swipe` object changes on each render, destructure the stable method before the effect:

```tsx
const { settleToIndex } = swipe;
```

Then use:

```tsx
useEffect(() => {
  if (!navigationRequest) {
    return;
  }

  settleToIndex(navigationRequest.index);
}, [navigationRequest, settleToIndex]);
```

- [ ] **Step 5: Run focused tests and confirm they pass**

Run:

```bash
npm.cmd test -- src/components/layout/TabCarousel.test.tsx
```

Expected: all `TabCarousel` tests pass.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add apps/web/src/components/layout/TabCarousel.tsx apps/web/src/components/layout/TabCarousel.test.tsx
git commit -m "feat: animate requested home tab navigation"
```

---

### Task 3: Add Shared Tab Indicator In `AppShell`

**Files:**
- Modify: `apps/web/src/components/layout/AppShell.tsx`
- Modify: `apps/web/src/components/home/AppShell.test.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Add failing tests for shared indicator and click request**

In `apps/web/src/components/home/AppShell.test.tsx`, add:

```tsx
test("renders one shared tab indicator instead of per-button underlines", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const tabsNav = screen.getByLabelText("Home tabs");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(tabsNav.querySelector(".tab-indicator")).toBeInTheDocument();
  expect(applicationStyles).toContain(".tab-indicator");
  expect(applicationStyles).not.toContain(".tab-button::after");
});

test("clicking a far tab keeps the current tab selected until carousel settle ends", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  const track = screen.getByTestId("tab-carousel-track");
  const viewport = screen.getByLabelText("Tournament tabs");
  Object.defineProperty(viewport, "clientWidth", {
    configurable: true,
    value: 390,
  });

  fireEvent.click(screen.getByRole("tab", { name: "News" }));

  expect(track.style.transform).toBe("translate3d(-1170px, 0, 0)");
  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  fireTransitionEndEvent(track, "transform");

  expect(screen.getByRole("tab", { name: "News" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

Add this helper near the existing `createEvent` helper usage if it is absent:

```tsx
function fireTransitionEndEvent(target: HTMLElement, propertyName: string) {
  const event = new Event("transitionend", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "propertyName", { value: propertyName });
  fireEvent(target, event);
}
```

- [ ] **Step 2: Run focused tests and confirm they fail**

Run:

```bash
npm.cmd test -- src/components/home/AppShell.test.tsx
```

Expected: the indicator and click-settle tests fail.

- [ ] **Step 3: Add motion state and navigation request state**

In `apps/web/src/components/layout/AppShell.tsx`, update the `TabCarousel` import:

```tsx
import {
  TabCarousel,
  type TabCarouselMotionState,
  type TabNavigationRequest,
} from "./TabCarousel";
```

After `tabRefs`, add:

```tsx
const tabsRef = useRef<HTMLElement | null>(null);
const [tabNavigationRequest, setTabNavigationRequest] =
  useState<TabNavigationRequest | null>(null);
const [tabMotion, setTabMotion] = useState<TabCarouselMotionState>({
  pendingIndex: null,
  phase: "idle",
  visualIndex: 0,
});
const [tabIndicatorStyle, setTabIndicatorStyle] =
  useState<React.CSSProperties>({
    transform: "translate3d(0px, 0, 0)",
    width: "0px",
  });
```

Update the React import to include `type CSSProperties`:

```tsx
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
```

Then use `CSSProperties` in the state type:

```tsx
const [tabIndicatorStyle, setTabIndicatorStyle] = useState<CSSProperties>({
```

Add a navigation helper:

```tsx
const requestTabNavigation = useCallback(
  (index: number) => {
    const targetTab = tabs[index];

    if (!targetTab || index === activeIndex) {
      return;
    }

    prefetchTab(targetTab);
    setTabNavigationRequest((current) => ({
      id: (current ? current.id : 0) + 1,
      index,
    }));
  },
  [activeIndex, prefetchTab],
);
```

- [ ] **Step 4: Calculate the moving underline**

Add this layout effect below the existing active tab `scrollIntoView` effect:

```tsx
useLayoutEffect(() => {
  const visualIndex = Math.min(
    Math.max(tabMotion.visualIndex, 0),
    tabs.length - 1,
  );
  const lowerIndex = Math.floor(visualIndex);
  const upperIndex = Math.min(lowerIndex + 1, tabs.length - 1);
  const progress = visualIndex - lowerIndex;
  const lowerButton = tabRefs.current[lowerIndex];
  const upperButton = tabRefs.current[upperIndex] || lowerButton;

  if (!lowerButton || !upperButton) {
    return;
  }

  const left =
    lowerButton.offsetLeft +
    (upperButton.offsetLeft - lowerButton.offsetLeft) * progress;
  const width =
    lowerButton.offsetWidth +
    (upperButton.offsetWidth - lowerButton.offsetWidth) * progress;

  setTabIndicatorStyle({
    transform: `translate3d(${left}px, 0, 0)`,
    transition:
      tabMotion.phase === "dragging"
        ? "none"
        : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    width: `${width}px`,
  });
}, [tabMotion.phase, tabMotion.visualIndex]);
```

- [ ] **Step 5: Wire clicks, strong Knockout escape, and indicator markup**

Replace:

```tsx
<LazyKnockoutTab
  onFastForwardSwipe={() => setActiveIndex(1)}
  rounds={queries.knockout.data}
  teams={queries.teams.data || []}
/>
```

with:

```tsx
<LazyKnockoutTab
  onFastForwardSwipe={() => requestTabNavigation(1)}
  rounds={queries.knockout.data}
  teams={queries.teams.data || []}
/>
```

Set the nav ref:

```tsx
<nav aria-label="Home tabs" className="tabs" ref={tabsRef}>
```

Replace tab button click:

```tsx
onClick={() => setActiveIndex(index)}
```

with:

```tsx
onClick={() => requestTabNavigation(index)}
```

Add the shared indicator after the tab buttons inside the nav:

```tsx
<span
  aria-hidden="true"
  className="tab-indicator"
  style={tabIndicatorStyle}
/>
```

Pass new props into `TabCarousel`:

```tsx
<TabCarousel
  activeIndex={activeIndex}
  navigationRequest={tabNavigationRequest}
  onActiveIndexChange={setActiveIndex}
  onMotionStateChange={setTabMotion}
  reducedMotion={prefersReducedMotion}
  renderTab={(tab) => (
```

- [ ] **Step 6: Update tab CSS**

In `apps/web/src/styles.css`, replace the `.tabs`, `.tab-button`, and `.tab-button::after` block with:

```css
.tabs {
  display: flex;
  gap: 24px;
  min-width: 0;
  overflow-x: auto;
  padding: 0 20px;
  position: relative;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab-button {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: #55718f;
  cursor: pointer;
  flex: 0 0 auto;
  font: inherit;
  font-weight: 700;
  padding: 14px 0 15px;
  position: relative;
  transition:
    background-color 160ms ease,
    color 160ms ease;
  z-index: 1;
}

.tab-button:hover {
  background: rgba(0, 171, 255, 0.1);
  color: #102a43;
}

.tab-button[aria-selected="true"] {
  color: #102a43;
}

.tab-indicator {
  background: #00abff;
  border-radius: 999px 999px 0 0;
  bottom: 0;
  height: 3px;
  left: 0;
  pointer-events: none;
  position: absolute;
  will-change: transform, width;
  z-index: 0;
}
```

- [ ] **Step 7: Run focused tests and confirm they pass**

Run:

```bash
npm.cmd test -- src/components/home/AppShell.test.tsx
```

Expected: all `AppShell` tests pass.

- [ ] **Step 8: Commit Task 3**

Run:

```bash
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/AppShell.test.tsx apps/web/src/styles.css
git commit -m "feat: add moving home tab indicator"
```

---

### Task 4: Preserve Knockout Bracket Gesture Ownership

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/hooks/useTabSwipe.ts`
- Modify: `apps/web/src/hooks/useTabSwipe.test.ts`

- [ ] **Step 1: Add failing tests for strong escape markers**

In `apps/web/src/components/home/KnockoutTab.test.tsx`, update the test named `marks the mobile bracket scroller as independent from parent tab swipes` to:

```tsx
test("marks the mobile bracket scroller as a strong home-tab escape zone", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);

  const scroller = screen
    .getByLabelText("World Cup knockout rounds")
    .querySelector(".knockout-mobile-bracket-scroll");

  expect(scroller).toHaveAttribute("data-tab-swipe-ignore", "true");
  expect(scroller).toHaveAttribute("data-tab-swipe-escape", "strong");
});
```

In `apps/web/src/hooks/useTabSwipe.test.ts`, add a nested strong escape element to `SwipeHarness`:

```tsx
createElement(
  "div",
  {
    "data-tab-swipe-escape": "strong",
    "data-tab-swipe-ignore": "true",
    "data-testid": "strong-escape-area",
  },
  "Strong escape area",
),
```

Then add:

```tsx
test("still ignores strong escape areas at the parent pointer layer", () => {
  const onIndexChange = vi.fn();
  render(createElement(SwipeHarness, { onIndexChange }));
  const strongEscapeArea = screen.getByTestId("strong-escape-area");

  firePointerEvent(strongEscapeArea, "pointerdown", {
    clientX: 300,
    clientY: 200,
    pointerId: 22,
  });
  firePointerEvent(strongEscapeArea, "pointermove", {
    clientX: 20,
    clientY: 202,
    pointerId: 22,
  });
  firePointerEvent(strongEscapeArea, "pointerup", {
    clientX: 20,
    clientY: 202,
    pointerId: 22,
  });

  expect(onIndexChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run focused tests and confirm the Knockout marker test fails**

Run:

```bash
npm.cmd test -- src/components/home/KnockoutTab.test.tsx src/hooks/useTabSwipe.test.ts
```

Expected: the Knockout marker test fails until the attribute is added.

- [ ] **Step 3: Add the escape marker to the mobile bracket scroller**

In `apps/web/src/components/home/KnockoutTab.tsx`, find the element with class `knockout-mobile-bracket-scroll` and keep the existing ignore marker while adding:

```tsx
data-tab-swipe-escape="strong"
```

The resulting opening element must include both attributes:

```tsx
<div
  className="knockout-mobile-bracket-scroll"
  data-tab-swipe-escape="strong"
  data-tab-swipe-ignore="true"
  ref={mobileBoardScrollRef}
  onScroll={(event) => handleMobileBracketScroll(event.currentTarget.scrollLeft)}
  onTouchEnd={(event) => event.stopPropagation()}
  onTouchStart={(event) => event.stopPropagation()}
>
```

- [ ] **Step 4: Run focused tests and confirm they pass**

Run:

```bash
npm.cmd test -- src/components/home/KnockoutTab.test.tsx src/hooks/useTabSwipe.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add apps/web/src/components/home/KnockoutTab.tsx apps/web/src/components/home/KnockoutTab.test.tsx apps/web/src/hooks/useTabSwipe.test.ts
git commit -m "chore: mark knockout bracket escape gesture zone"
```

---

### Task 5: Verify End-To-End Behavior

**Files:**
- Read: `apps/web/package.json`
- Run: test, lint, build commands

- [ ] **Step 1: Run all frontend tests**

Run from `apps/web`:

```bash
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run from `apps/web`:

```bash
npm.cmd run lint
```

Expected: lint passes.

- [ ] **Step 3: Run production build**

Run from `apps/web`:

```bash
npm.cmd run build
```

Expected: build passes. Existing React Query dependency warnings are acceptable only if they match the previous warning shape.

- [ ] **Step 4: Start Wi-Fi preview**

Run from `apps/web`:

```bash
npm.cmd run dev:host
```

Expected: Vite prints a local URL and a network URL such as `http://192.168.110.119:5173/`.

- [ ] **Step 5: Manual QA checklist**

Check these on the phone:

- Swipe `Knockout -> Fixtures -> Table -> News`; the page surface follows the finger.
- Slowly drag halfway and release; it returns with a 300ms settle.
- Tap `News` from `Knockout`; it slides across all pages in one movement.
- Blue underline follows the finger during drag and follows the page during click settle.
- Hover on desktop changes text color and soft background only.
- Normal Knockout round swipes still control the Knockout bracket.
- Very fast strong Knockout escape swipe moves to Fixtures through the Home carousel.
- Table short cards allow main tab swipe from card surfaces.

- [ ] **Step 6: Commit verification notes if code changes were required during QA**

If QA fixes were made, commit only the files changed for those fixes:

```bash
git add apps/web/src
git commit -m "fix: polish home tab carousel gestures"
```

If no QA fixes were made, skip this commit.

---

## Self-Review

### Spec Coverage

- Swipe between Home tabs: Tasks 1, 2, and 5.
- Blue underline follows finger: Tasks 1 and 3.
- Click far tab slides across in one movement: Tasks 2 and 3.
- Hover styling without moving underline: Task 3.
- Knockout bracket ownership: Task 4.
- Reduced motion: Task 1.
- Mounted source and destination slides during animation: Task 2.
- Test, lint, and build verification: Task 5.

### Red Flag Scan

The plan uses concrete file paths, test names, code snippets, commands, and expected results. It avoids deferred work language.

### Type Consistency

The new exported types are `TabSwipePhase`, `TabNavigationRequest`, and `TabCarouselMotionState`. The same names are used in `useTabSwipe.ts`, `TabCarousel.tsx`, and `AppShell.tsx`.
