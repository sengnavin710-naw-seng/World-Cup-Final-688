# Knockout Status Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `As it stands` and `Confirmed` views to the mobile knockout bracket so only API-confirmed teams appear in Confirmed mode while unresolved slots retain placeholders.

**Architecture:** Extend the shared knockout match payload with optional per-slot confirmation metadata. Keep the existing bracket geometry and swipe implementation unchanged, and derive display-only rounds inside `KnockoutTab` according to the selected status view. The API defaults existing fixture labels to unconfirmed placeholders, avoiding false claims that a team has qualified.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Express fixture data, CSS

---

### Task 1: Extend the knockout data contract

**Files:**
- Modify: `apps/api/src/types.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/api/src/data/knockout.ts`
- Test: `apps/api/src/routes/tournament.test.ts`

- [ ] **Step 1: Write the failing API contract test**

Add an assertion that a returned knockout slot contains `homeTeamConfirmed`, `awayTeamConfirmed`, `homeTeamPlaceholder`, and `awayTeamPlaceholder`, with the current fixture labels retained as placeholders and confirmation values set to `false`.

- [ ] **Step 2: Run the focused API test and verify RED**

Run: `npm test -- src/routes/tournament.test.ts`

Expected: FAIL because confirmation metadata is not present in the payload.

- [ ] **Step 3: Add optional slot metadata to both TypeScript contracts**

Add these fields to each match object:

```ts
homeTeamConfirmed?: boolean;
awayTeamConfirmed?: boolean;
homeTeamPlaceholder?: string;
awayTeamPlaceholder?: string;
```

- [ ] **Step 4: Populate safe defaults in `makeKnockoutMatch`**

Return the existing `homeTeam` and `awayTeam` labels as placeholders and set both confirmation flags to `false`. Future real data may override these fields without changing the UI contract.

- [ ] **Step 5: Run the focused API test and verify GREEN**

Run: `npm test -- src/routes/tournament.test.ts`

Expected: PASS.

### Task 2: Add the status filter behavior

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`

- [ ] **Step 1: Write failing component tests**

Add tests that verify:

```tsx
expect(screen.getByRole("button", { name: "As it stands" })).toHaveAttribute("aria-pressed", "true");
expect(screen.getByRole("button", { name: "Confirmed" })).toHaveAttribute("aria-pressed", "false");
```

Use a match with one confirmed slot and one unconfirmed slot. After clicking `Confirmed`, assert the confirmed team remains visible and the unconfirmed projected team is replaced by its explicit placeholder. Add a second match without a placeholder and assert `TBD` is rendered.

- [ ] **Step 2: Run the focused web test and verify RED**

Run: `npm test -- src/components/home/KnockoutTab.test.tsx`

Expected: FAIL because the status controls and projection logic do not exist.

- [ ] **Step 3: Implement minimal local state and derived rounds**

Add a local `KnockoutStatusView` state defaulting to `as-it-stands`. Derive rounds with `useMemo`; in Confirmed mode keep `homeTeam` or `awayTeam` only when the matching confirmation flag is true, otherwise use the explicit placeholder or `TBD`. Feed the derived rounds into existing desktop/mobile rendering without altering swipe geometry.

- [ ] **Step 4: Render the mobile segmented control**

Render `As it stands` and `Confirmed` buttons above `.knockout-round-strip`, using `aria-pressed` to expose selection and preserving the current round and scroll state when toggled.

- [ ] **Step 5: Run the focused web test and verify GREEN**

Run: `npm test -- src/components/home/KnockoutTab.test.tsx`

Expected: PASS.

### Task 3: Unframe and style the mobile knockout surface

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Write the failing CSS contract test**

Read `styles.css` and assert that `.knockout-mobile` keeps its black background while using no border, radius, or shadow; assert that `.knockout-status-filter` has 8px side spacing and compact pill buttons.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/home/KnockoutTab.test.tsx`

Expected: FAIL because the unframed styling and status filter styles do not exist.

- [ ] **Step 3: Apply scoped mobile styles**

Remove only the visual frame from `.knockout-mobile`, retain its black background, and style `.knockout-status-filter` plus `.knockout-status-chip` to match the existing round pills with 8px outer spacing.

- [ ] **Step 4: Run verification**

Run:

```powershell
npm test -- src/components/home/KnockoutTab.test.tsx
npm test
npm run lint
npm run build
```

Run the API focused test and API build as well. Expected: all commands pass without TypeScript errors.
