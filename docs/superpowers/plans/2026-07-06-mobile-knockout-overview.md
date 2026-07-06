# Mobile Knockout Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-only toggle that switches the existing round detail bracket to a full-width, vertically scrolling tournament overview.

**Architecture:** Keep the existing detail renderer unchanged and introduce a pure overview geometry module plus a focused overview component. `KnockoutTab` owns only the view-mode state and toggle; overview geometry is memoized by rounds and viewport width and never updates during vertical scrolling.

**Tech Stack:** React 19, TypeScript, CSS, SVG, lucide-react, Vitest, Testing Library

---

### Task 1: Overview Geometry

**Files:**
- Create: `apps/web/src/components/home/knockoutOverviewLayout.ts`
- Create: `apps/web/src/components/home/knockoutOverviewLayout.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Test a complete multi-round fixture at widths 320, 375, 390, and 430. Assert `layout.width === viewportWidth`, every match satisfies `x >= 0` and `x + width <= viewportWidth`, the board height is positive, and connector paths exist. Test empty rounds and unknown-team matches without geometry collapse.

```ts
const layout = getKnockoutOverviewLayout(rounds, 320);
expect(layout.width).toBe(320);
expect(layout.matches.every((match) => match.x >= 0 && match.x + match.width <= 320)).toBe(true);
expect(layout.connectors.length).toBeGreaterThan(0);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm.cmd test -- knockoutOverviewLayout.test.ts`

Expected: FAIL because `getKnockoutOverviewLayout` does not exist.

- [ ] **Step 3: Implement the pure layout function**

Define and export `OverviewPositionedMatch`, `OverviewConnector`, `KnockoutOverviewLayout`, and:

```ts
export function getKnockoutOverviewLayout(
  rounds: KnockoutRound[],
  viewportWidth: number,
): KnockoutOverviewLayout
```

Clamp width to a safe positive value, derive responsive two-column card dimensions, split branch matches by existing `side` metadata, place the first branch above the center and the second below it, reserve center positions for Final/Bronze/champion, and generate orthogonal SVG paths from source card edges to target card edges. Return stable empty geometry for no rounds.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm.cmd test -- knockoutOverviewLayout.test.ts`

Expected: PASS.

### Task 2: Overview Renderer

**Files:**
- Create: `apps/web/src/components/home/KnockoutOverview.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: Write failing rendering tests**

Render the overview through `KnockoutTab`, activate the overview button, and assert the overview accessible label, completed scores, future date, placeholders, Final and Bronze-final labels, champion label, and faded loser class. Verify the round tablist is absent while overview is active.

```ts
fireEvent.click(screen.getByRole("button", { name: /show full bracket overview/i }));
expect(screen.getByLabelText("World Cup knockout overview")).toBeInTheDocument();
expect(screen.queryByRole("tablist", { name: "Knockout rounds" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused rendering tests and confirm RED**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "overview"`

Expected: FAIL because the overview and toggle do not exist.

- [ ] **Step 3: Implement the overview component**

Build `KnockoutOverview` with a `ResizeObserver`, memoized geometry, static SVG connectors, memoized match cards, shared score/date/loser semantics, and the existing vector trophy presentation. The scroll container uses native vertical scrolling and `data-tab-swipe-ignore="true"`.

- [ ] **Step 4: Add overview styling**

Add mobile-only `.knockout-overview-*` rules. Use viewport-derived dimensions, `touch-action: pan-y`, `overflow-x: hidden`, no filters, restrained shadows, SVG `vector-effect: non-scaling-stroke`, and safe text overflow. Preserve the existing theme variables and card colors.

- [ ] **Step 5: Run focused rendering tests and confirm GREEN**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "overview"`

Expected: PASS.

### Task 3: View Toggle And State Preservation

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Select a non-initial detail round, switch to overview, switch back, and assert the prior round remains selected. Assert the button labels describe the destination mode and overview touch/scroll does not invoke `onFastForwardSwipe`.

```ts
fireEvent.click(screen.getByRole("tab", { name: "Semi-finals" }));
fireEvent.click(screen.getByRole("button", { name: /show full bracket overview/i }));
fireEvent.click(screen.getByRole("button", { name: /show round detail/i }));
expect(screen.getByRole("tab", { name: "Semi-finals" })).toHaveAttribute("aria-selected", "true");
```

- [ ] **Step 2: Run interaction tests and confirm RED**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "overview|preserves the selected round"`

Expected: FAIL until mode switching is wired.

- [ ] **Step 3: Implement the toggle**

Add `mobileViewMode: "detail" | "overview"`, render exactly one mobile view at a time while retaining detail state in `KnockoutTab`, and use lucide `Combine`/`Rows3` icons. Include `aria-pressed`, destination-specific labels, title tooltips, and a fixed mobile-only button.

- [ ] **Step 4: Style safe fixed positioning**

Position the 56px circular button with `right: 20px` and `bottom: calc(20px + env(safe-area-inset-bottom))`; ensure a high local z-index and no desktop display.

- [ ] **Step 5: Run interaction tests and confirm GREEN**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "overview|preserves the selected round"`

Expected: PASS.

### Task 4: Regression And Visual Verification

**Files:**
- Modify if required: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify if required: `apps/web/src/styles.css`

- [ ] **Step 1: Run all knockout tests**

Run: `npm.cmd test -- KnockoutTab.test.tsx knockoutOverviewLayout.test.ts`

Expected: New overview tests pass. Record any pre-existing gesture-test failures separately and do not loosen assertions unrelated to overview.

- [ ] **Step 2: Run static verification**

Run: `npm.cmd run lint`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS, allowing only existing dependency warnings.

- [ ] **Step 3: Inspect responsive rendering**

At widths 320, 375, 390, and 430, verify the overview has no horizontal overflow, scrolls vertically, keeps the fixed button above the safe area, renders sharp SVG lines/trophy, and restores the prior detail round. Also inspect a desktop viewport and confirm no toggle or overview is visible.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and inspect only the intended Knockout files plus this plan. Confirm no API, data-model, desktop geometry, or theme changes were introduced.
