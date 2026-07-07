# Knockout Swipe Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a forward swipe from settled Finals to open Fixtures and allow Overview horizontal swipes to use AppShell tab navigation.

**Architecture:** Keep Detail-mode round gestures local to `KnockoutTab`, handing off only at the forward boundary. Remove the Overview swipe-ignore marker so the existing `useTabSwipe` pointer handler owns horizontal gestures while native vertical scrolling remains untouched.

**Tech Stack:** React, TypeScript, Testing Library, Vitest, Vite

---

### Task 1: Finals boundary handoff

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`

- [ ] **Step 1: Write the failing test**

Render `KnockoutTab` with `onFastForwardSwipe`, select Finals, complete the snap clock, perform a normal forward touch swipe, and assert the callback fires once while the native scroller remains at zero.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "hands a forward swipe from Finals to Fixtures"`
Expected: FAIL because the current normal swipe clamps back to Finals.

- [ ] **Step 3: Implement the boundary condition**

In `finishMobileBracketGesture`, after vertical rejection and before the generic fast-forward condition, call `onFastForwardSwipe` when the gesture is forward, exceeds `mobileRoundSnapThreshold`, starts on the final round, and `allowFastForward` is true.

- [ ] **Step 4: Run the focused test**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "hands a forward swipe from Finals to Fixtures"`
Expected: PASS.

### Task 2: Overview AppShell swipe ownership

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`

- [ ] **Step 1: Write the failing marker test**

Switch to Overview and assert `World Cup knockout overview` does not have `data-tab-swipe-ignore`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "lets AppShell own horizontal swipes in overview"`
Expected: FAIL because Overview currently sets the marker to `true`.

- [ ] **Step 3: Remove the marker**

Delete `data-tab-swipe-ignore="true"` from `KnockoutOverview`; do not add local touch handlers.

- [ ] **Step 4: Run the focused test**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "lets AppShell own horizontal swipes in overview"`
Expected: PASS.

### Task 3: Shared tab swipe sensitivity

**Files:**
- Modify: `apps/web/src/hooks/useTabSwipe.test.ts`
- Modify: `apps/web/src/hooks/useTabSwipe.ts`

- [ ] **Step 1: Write boundary tests**

Add slow-swipe resolver cases for a 1000px viewport: 170px returns zero and 180px advances one tab.

- [ ] **Step 2: Run tests to verify the 18% case fails**

Run: `npm.cmd test -- useTabSwipe.test.ts -t "18 percent"`
Expected: FAIL because the current distance threshold is 28%.

- [ ] **Step 3: Set the distance threshold to 18%**

Change `DISTANCE_THRESHOLD_RATIO` from `0.28` to `0.18`; retain the velocity and intent thresholds.

- [ ] **Step 4: Run the boundary tests**

Run: `npm.cmd test -- useTabSwipe.test.ts -t "percent"`
Expected: both 17% and 18% cases pass.

### Task 4: Regression verification

**Files:**
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Test: `apps/web/src/hooks/useTabSwipe.test.ts`

- [ ] **Step 1: Run component and shared gesture suites**

Run: `npm.cmd test -- KnockoutTab.test.tsx useTabSwipe.test.ts`
Expected: all tests pass with no skipped tests.

- [ ] **Step 2: Build production frontend**

Run: `npm.cmd run build`
Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Commit implementation**

```bash
git add apps/web/src/components/home/KnockoutTab.tsx apps/web/src/components/home/KnockoutTab.test.tsx docs/superpowers/plans/2026-07-07-knockout-swipe-navigation.md
git commit -m "feat: navigate beyond knockout finals"
```
