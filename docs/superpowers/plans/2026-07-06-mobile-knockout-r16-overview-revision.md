# Mobile Knockout R16 Overview Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise mobile overview to show only Round of 16 through Finals, with four R16 cards across the top and four across the bottom, and keep the mode toggle above mobile browser controls.

**Architecture:** Replace the current two-column overview geometry with a four-column folded bracket while retaining the existing pure layout API and static rendering. CSS uses compact four-column cards and a browser-toolbar offset for the fixed toggle, with a standalone-display override.

**Tech Stack:** React 19, TypeScript, CSS, SVG, Vitest, Testing Library

---

### Task 1: Four-Column Folded Geometry

**Files:**
- Modify: `apps/web/src/components/home/knockoutOverviewLayout.test.ts`
- Modify: `apps/web/src/components/home/knockoutOverviewLayout.ts`

- [ ] **Step 1: Write failing layout assertions**

For widths 320, 375, 390, and 430, assert that overview contains no `bracketColumn === 1` matches, contains eight R16 matches (`bracketColumn === 2`), and that the first four share one `y` coordinate while the final four share another `y` coordinate below the Final.

```ts
const r16 = layout.matches.filter((match) => match.bracketColumn === 2);
expect(layout.matches.some((match) => match.bracketColumn === 1)).toBe(false);
expect(new Set(r16.slice(0, 4).map((match) => match.y))).toHaveLength(1);
expect(new Set(r16.slice(4).map((match) => match.y))).toHaveLength(1);
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm.cmd test -- knockoutOverviewLayout.test.ts`

Expected: FAIL because the current overview includes Round of 32 and stacks R16 in two columns.

- [ ] **Step 3: Implement folded geometry**

Filter overview input to `bracketColumn >= 2` plus center matches. Compute four equal card columns from viewport width. Place left-side R16 at the top, its two QF cards below, and its Semi-final centered below them. Place Final and Bronze-final in the center section. Place the right Semi-final below center, its QF cards below, and its four R16 cards in the bottom row. Generate static orthogonal paths between each adjacent stage.

- [ ] **Step 4: Run geometry tests and confirm GREEN**

Run: `npm.cmd test -- knockoutOverviewLayout.test.ts`

Expected: PASS at all four widths.

### Task 2: Compact Cards And Browser-Bar Clearance

**Files:**
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: Write failing CSS contract tests**

Assert compact overview crests/text and a toggle bottom offset containing both `env(safe-area-inset-bottom)` and a browser-toolbar clearance. Assert a standalone media query reduces the offset.

```ts
expect(styles).toMatch(/\.knockout-mobile-view-toggle[\s\S]*bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
expect(styles).toMatch(/@media \(display-mode: standalone\)[\s\S]*bottom:\s*calc\(20px \+ env\(safe-area-inset-bottom\)\)/);
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "browser bottom controls|full mobile overview"`

Expected: FAIL until CSS is revised.

- [ ] **Step 3: Implement compact responsive styling**

Reduce overview card padding, crest size, text size, and gaps for four-column cards. Set the toggle to `bottom: calc(72px + env(safe-area-inset-bottom))` in browser mode and restore `20px` clearance under `@media (display-mode: standalone)`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "browser bottom controls|full mobile overview"`

Expected: PASS.

### Task 3: Verification

**Files:**
- Verify: `apps/web/src/components/home/knockoutOverviewLayout.ts`
- Verify: `apps/web/src/components/home/KnockoutTab.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: Run focused regression tests**

Run: `npm.cmd test -- knockoutOverviewLayout.test.ts`

Run: `npm.cmd test -- KnockoutTab.test.tsx -t "full mobile overview|finished knockout|Final and Bronze-final geometry"`

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: both commands exit zero; existing TanStack Query build warnings are acceptable.

- [ ] **Step 3: Render mobile QA**

At 320, 390, and 430 pixels, verify four R16 cards share the top row, four share the bottom row, no R32 cards render, no horizontal overflow exists, and the fixed toggle remains visibly above browser controls.
