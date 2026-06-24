# Compact Home Tabs And Knockout Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all four mobile Home tabs a consistent 8px content gap, restyle the mobile Knockout bracket as one white container with dark cards, and fade connector lines in sync with their related cards.

**Architecture:** Keep the existing `AppShell`, `TabCarousel`, and `KnockoutTab` ownership boundaries. Use scoped mobile CSS for shared spacing and surface colors, add a News panel class only for precise mobile targeting, and enrich mobile connector paths with round metadata and computed opacity while leaving geometry and gesture code unchanged.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Vite

**Dirty-worktree note:** `AppShell.tsx`, `KnockoutTab.tsx`, their tests, and `styles.css` already contain uncommitted work. Do not automatically stage or commit implementation files; review the final diff with the user first so unrelated existing edits are not captured.

---

### Task 1: Normalize the first-content gap across Home tabs

**Files:**
- Modify: `apps/web/src/components/home/AppShell.test.tsx`
- Modify: `apps/web/src/components/layout/AppShell.tsx:329-340`
- Modify: `apps/web/src/styles.css:346-354`
- Modify: `apps/web/src/styles.css:1748-1775`

- [ ] **Step 1: Write the failing layout contract test**

Add a test to `AppShell.test.tsx` that reads `styles.css`, renders the tabs, and proves each slide has the correct panel class plus the shared mobile gap rule:

```tsx
test("uses one 8px mobile content gap across every Home tab", async () => {
  render(<App />);
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.home-chrome\s*\{[^}]*margin-bottom:\s*8px;/,
  );
  expect(applicationStyles).toMatch(
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.tab-panel-knockout\s*\{[^}]*margin-top:\s*0;/,
  );

  fireEvent.click(screen.getByRole("tab", { name: "News" }));
  const newsPanel = screen.getByTestId("tab-slide-News").querySelector(".tab-panel");
  expect(newsPanel).toHaveClass("tab-panel-news");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `apps/web`:

```powershell
npm.cmd test -- src/components/home/AppShell.test.tsx
```

Expected: FAIL because the mobile `home-chrome` gap is still 18px, Knockout still has a negative top margin, and News has no dedicated panel class.

- [ ] **Step 3: Add a News panel class**

Extend the class list inside `renderTabPanel` in `AppShell.tsx`:

```tsx
tab === "News" ? "tab-panel-news" : "",
```

Do not add wrappers or move tab toolbars.

- [ ] **Step 4: Implement the shared 8px mobile gap**

Inside `@media (max-width: 760px)` in `styles.css`, add:

```css
.home-chrome {
  margin-bottom: 8px;
}

.tab-panel-knockout {
  margin-top: 0;
}

.tab-panel-news {
  padding-top: 0;
}
```

Keep Fixtures and Table toolbars in their existing positions. Their first visible controls naturally begin after the shared `home-chrome` gap.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
npm.cmd test -- src/components/home/AppShell.test.tsx
```

Expected: all AppShell tests pass.

### Task 2: Restyle the mobile Knockout surface without changing card geometry

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx:1158-1188`
- Modify: `apps/web/src/styles.css:1200-1332`

- [ ] **Step 1: Replace the old black-surface test with a failing white-container test**

Update the existing mobile surface test to assert the approved colors and retained dark cards:

```tsx
test("uses one white mobile Knockout container with dark match cards", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.knockout-mobile\s*\{[^}]*border:\s*1px solid var\(--line\);[^}]*border-radius:\s*10px;[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-status-filter\s*\{[^}]*padding:\s*8px;[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-round-strip\s*\{[^}]*padding:\s*8px;[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-scroll\s*\{[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-card\s*\{[^}]*background:\s*#202020;/s,
  );
});
```

Add selected-control assertions:

```tsx
expect(applicationStyles).toMatch(
  /\.knockout-status-chip\[aria-pressed="true"\]\s*\{[^}]*background:\s*#00abff;[^}]*color:\s*#ffffff;/s,
);
```

- [ ] **Step 2: Run the focused Knockout test and verify RED**

Run:

```powershell
npm.cmd test -- src/components/home/KnockoutTab.test.tsx
```

Expected: FAIL because the mobile surface and strips still use `#050505`, the container has no frame, and selected controls are white.

- [ ] **Step 3: Implement the white unified surface**

Update only the mobile Knockout selectors in `styles.css`:

```css
.knockout-mobile {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
  color: var(--text);
  box-shadow: none;
}

.knockout-status-filter,
.knockout-round-strip,
.knockout-mobile-bracket-scroll {
  background: #ffffff;
}

.knockout-status-chip[aria-pressed="true"] {
  border-color: #00abff;
  background: #00abff;
  color: #ffffff;
}

.knockout-round-chip {
  border-color: color-mix(
    in srgb,
    var(--line),
    #00abff var(--round-selection-percent)
  );
  background: color-mix(
    in srgb,
    var(--surface-alt),
    #00abff var(--round-selection-percent)
  );
  color: color-mix(
    in srgb,
    var(--text),
    #ffffff var(--round-selection-percent)
  );
}
```

Adjust the unselected status controls to use a pale-blue/white background, dark text, and `var(--line)` borders. Preserve all control heights, card dimensions, connector color, scroll behavior, and hidden-scrollbar rules. Replace the current radial dark scroller background with plain white.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm.cmd test -- src/components/home/KnockoutTab.test.tsx
```

Expected: all Knockout tests pass.

### Task 3: Fade mobile connectors with their related cards

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx:1040-1080`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:9-16`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:467-504`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:577-630`
- Modify: `apps/web/src/components/home/KnockoutTab.tsx:1288-1305`
- Modify: `apps/web/src/styles.css:1316-1332`

- [ ] **Step 1: Write the failing connector-opacity test**

Extend the existing outgoing-card fade test:

```tsx
test("fades outgoing connector lines with their source cards", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  let scrollLeft = 128;

  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.scroll(scroller!);

  const outgoingCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-round-index="0"]',
  );
  const outgoingConnector = mobileBracket.querySelector(
    '.knockout-mobile-connectors path[data-source-round-index="0"]',
  );

  expect(outgoingCard).toHaveStyle({ opacity: "0.5" });
  expect(outgoingConnector).toHaveStyle({ opacity: "0.5" });

  scrollLeft = 256;
  fireEvent.scroll(scroller!);
  expect(outgoingConnector).toHaveStyle({ opacity: "0" });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- src/components/home/KnockoutTab.test.tsx
```

Expected: FAIL because connector paths have no round metadata or opacity style.

- [ ] **Step 3: Define connector metadata**

Add near the mobile layout types in `KnockoutTab.tsx`:

```ts
type MobileConnectorPath = {
  d: string;
  opacity: number;
  sourceRoundIndex: number;
  targetRoundIndex: number;
};
```

- [ ] **Step 4: Return connector records from `getMobileConnectorPaths`**

Replace `string[]` with `MobileConnectorPath[]`. For every generated path, return:

```ts
{
  d: makeMobilePairPath(sourceA, sourceB, target),
  opacity: Math.min(sourceA.opacity, sourceB.opacity, target.opacity),
  sourceRoundIndex: roundIndex,
  targetRoundIndex: roundIndex + 1,
}
```

Use the same record shape for the Final connector. Do not change source-pair selection or path geometry.

- [ ] **Step 5: Render connector opacity and metadata**

Update the mobile SVG mapping:

```tsx
{mobileLayout.connectorPaths.map((connector, index) => (
  <path
    data-source-round-index={connector.sourceRoundIndex}
    data-target-round-index={connector.targetRoundIndex}
    key={`${connector.d}-${index}`}
    d={connector.d}
    style={{ opacity: connector.opacity }}
  />
))}
```

Add `will-change: opacity;` to `.knockout-mobile-connectors path`. Do not add a CSS transition because opacity must follow finger position directly.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```powershell
npm.cmd test -- src/components/home/KnockoutTab.test.tsx
```

Expected: all Knockout tests pass, including existing geometry and snap tests.

### Task 4: Full verification and mobile visual QA

**Files:**
- Verify: `apps/web/src/components/home/AppShell.test.tsx`
- Verify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Verify: `apps/web/src/components/layout/AppShell.tsx`
- Verify: `apps/web/src/components/home/KnockoutTab.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: Run all web tests**

Run from `apps/web`:

```powershell
npm.cmd test
```

Expected: every Vitest file passes with zero failed tests.

- [ ] **Step 2: Run TypeScript checks**

Run:

```powershell
npm.cmd run lint
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: Vite completes the production bundle with exit code 0.

- [ ] **Step 4: Inspect the implementation diff**

Run from the worktree root:

```powershell
git diff --check
git diff -- apps/web/src/components/home/AppShell.test.tsx apps/web/src/components/home/KnockoutTab.test.tsx apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/KnockoutTab.tsx apps/web/src/styles.css
```

Expected: no whitespace errors; changes remain limited to spacing, mobile Knockout presentation, connector metadata, and tests.

- [ ] **Step 5: Verify the phone viewport**

Using the existing Vite preview at `http://127.0.0.1:5173/`, verify at approximately 390px width:

1. Knockout, Fixtures, Table, and News each begin 8px below the Home tab navigation.
2. The mobile Knockout controls and bracket share one white bordered container.
3. Match cards remain dark and readable.
4. Horizontal Round swiping still snaps to one adjacent round.
5. Outgoing connector lines fade with outgoing cards during drag.
6. Vertical bracket scrolling remains in place after touch release.
7. No visible horizontal scrollbar, clipping, overlap, or console error appears.

- [ ] **Step 6: Preserve the dirty worktree for user review**

Do not stage or commit implementation files automatically. Report the exact modified files and verification results so the user can test before choosing whether to commit and push.
