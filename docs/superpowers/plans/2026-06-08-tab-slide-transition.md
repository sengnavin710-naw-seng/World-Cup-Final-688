# Tab Slide Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate dashboard tab changes so the current screen slides out while the destination screen slides in, without moving the header/navigation or breaking vertical scrolling.

**Architecture:** `AppShell` will keep the previous tab mounted as a non-interactive outgoing layer while the selected tab renders as the incoming layer. A stable transition viewport will contain each tab's toolbar and panel, and CSS transform/opacity animations will handle four directional roles with a reduced-motion override.

**Tech Stack:** React 19, TypeScript, Vite, CSS keyframes, Vitest, Testing Library

---

## File Structure

- Modify `apps/web/src/components/layout/AppShell.tsx`
  - Own tab transition state.
  - Render tab toolbars and panels through one tab-screen function.
  - Complete transitions on animation end with a defensive timeout.
  - Preserve dominant-axis touch gesture handling.
- Modify `apps/web/src/components/home/AppShell.test.tsx`
  - Cover vertical-scroll safety.
  - Cover forward/backward transition roles and lifecycle.
  - Cover repeated navigation and reduced motion.
  - Confirm toolbar placement inside the animated screen.
- Modify `apps/web/src/styles.css`
  - Add transition viewport/layer rules.
  - Add four directional keyframes.
  - Add reduced-motion behavior.
  - Remove the old enter-only animation.

### Task 1: Preserve Gesture Safety Baseline

**Files:**
- Modify: `apps/web/src/components/layout/AppShell.tsx:48,326-356`
- Test: `apps/web/src/components/home/AppShell.test.tsx:127-167`

- [ ] **Step 1: Verify the vertical-scroll regression test**

The existing pending test must model a mostly vertical gesture with horizontal drift:

```tsx
fireEvent.touchStart(tabPanel!, {
  changedTouches: [{ clientX: 120, clientY: 100 }],
});
fireEvent.touchEnd(tabPanel!, {
  changedTouches: [{ clientX: 60, clientY: 300 }],
});

expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
  "aria-selected",
  "true",
);
```

- [ ] **Step 2: Verify intentional horizontal swipe coverage**

```tsx
fireEvent.touchStart(tabPanel!, {
  changedTouches: [{ clientX: 140, clientY: 100 }],
});
fireEvent.touchEnd(tabPanel!, {
  changedTouches: [{ clientX: 60, clientY: 110 }],
});

expect(screen.getByRole("tab", { name: "Fixtures" })).toHaveAttribute(
  "aria-selected",
  "true",
);
```

- [ ] **Step 3: Run the focused tests**

Run:

```bash
npm.cmd run test --workspace web -- AppShell.test.tsx
```

Expected: both gesture tests pass.

- [ ] **Step 4: Commit the gesture fix**

```bash
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/AppShell.test.tsx
git commit -m "fix: distinguish vertical scroll from tab swipe"
```

### Task 2: Define the Transition Lifecycle with Failing Tests

**Files:**
- Test: `apps/web/src/components/home/AppShell.test.tsx`

- [ ] **Step 1: Add the forward transition test**

Add a test that clicks Fixtures and expects both tab screens:

```tsx
test("slides the previous screen out while the next screen enters", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

  const outgoing = document.querySelector('[data-tab-screen="Knockout"]');
  const incoming = document.querySelector('[data-tab-screen="Fixtures"]');

  expect(outgoing).toHaveClass("tab-screen-outgoing", "tab-screen-exit-left");
  expect(outgoing).toHaveAttribute("aria-hidden", "true");
  expect(incoming).toHaveClass("tab-screen-incoming", "tab-screen-enter-right");

  fireEvent.animationEnd(incoming!);
  expect(document.querySelector('[data-tab-screen="Knockout"]')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add backward direction coverage**

Navigate to Table, complete its animation, then navigate to Fixtures:

```tsx
fireEvent.click(screen.getByRole("tab", { name: "Table" }));
fireEvent.animationEnd(document.querySelector('[data-tab-screen="Table"]')!);
fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

expect(document.querySelector('[data-tab-screen="Table"]')).toHaveClass(
  "tab-screen-exit-right",
);
expect(document.querySelector('[data-tab-screen="Fixtures"]')).toHaveClass(
  "tab-screen-enter-left",
);
```

- [ ] **Step 3: Add transition lock coverage**

```tsx
fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));
fireEvent.click(screen.getByRole("tab", { name: "Table" }));

expect(screen.getByRole("tab", { name: "Fixtures" })).toHaveAttribute(
  "aria-selected",
  "true",
);
expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute(
  "aria-selected",
  "false",
);
```

- [ ] **Step 4: Add animated-toolbar ownership coverage**

Update the fixture-toolbar assertion:

```tsx
expect(fixtureFilters.closest('[data-tab-screen="Fixtures"]')).toBeInTheDocument();
expect(fixtureFilters.closest(".tab-panel")).not.toBeInTheDocument();
```

- [ ] **Step 5: Add reduced-motion coverage**

Stub `matchMedia` before rendering and verify that the destination replaces the current screen without an outgoing layer:

```tsx
window.matchMedia = vi.fn().mockReturnValue({
  matches: true,
  media: "(prefers-reduced-motion: reduce)",
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

render(<App />);
await screen.findByLabelText("World Cup knockout bracket");
fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));

expect(document.querySelector('[data-tab-screen="Knockout"]')).not.toBeInTheDocument();
expect(document.querySelector('[data-tab-screen="Fixtures"]')).toBeInTheDocument();
```

- [ ] **Step 6: Run the tests and verify RED**

Run:

```bash
npm.cmd run test --workspace web -- AppShell.test.tsx
```

Expected: FAIL because `data-tab-screen`, outgoing layers, and transition classes do not exist.

### Task 3: Implement the Two-Screen Transition State

**Files:**
- Modify: `apps/web/src/components/layout/AppShell.tsx`
- Test: `apps/web/src/components/home/AppShell.test.tsx`

- [ ] **Step 1: Add tab and direction types**

```tsx
type TabName = (typeof tabs)[number];
type TransitionDirection = "forward" | "backward";
type TabScreenLayer = "active" | "incoming" | "outgoing";
```

- [ ] **Step 2: Add transition state and cleanup**

```tsx
const [activeTab, setActiveTab] = useState<TabName>("Knockout");
const [outgoingTab, setOutgoingTab] = useState<TabName | null>(null);
const [transitionDirection, setTransitionDirection] =
  useState<TransitionDirection>("forward");
const transitionTimerRef = useRef<number | null>(null);

const completeTabTransition = useCallback(() => {
  setOutgoingTab(null);
  if (transitionTimerRef.current !== null) {
    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null;
  }
}, []);

useEffect(
  () => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
  },
  [],
);
```

- [ ] **Step 3: Add reduced-motion detection**

```tsx
const [prefersReducedMotion, setPrefersReducedMotion] = useState(
  () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
);

useEffect(() => {
  if (typeof window.matchMedia !== "function") {
    return undefined;
  }

  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const updatePreference = () => setPrefersReducedMotion(query.matches);
  query.addEventListener("change", updatePreference);
  return () => query.removeEventListener("change", updatePreference);
}, []);
```

- [ ] **Step 4: Update tab navigation**

```tsx
const handleTabChange = (nextTab: TabName) => {
  if (nextTab === activeTab || outgoingTab !== null) {
    return;
  }

  const currentIndex = tabs.indexOf(activeTab);
  const nextIndex = tabs.indexOf(nextTab);
  const direction = nextIndex > currentIndex ? "forward" : "backward";

  setTransitionDirection(direction);

  if (prefersReducedMotion) {
    setActiveTab(nextTab);
    return;
  }

  setOutgoingTab(activeTab);
  setActiveTab(nextTab);
  transitionTimerRef.current = window.setTimeout(completeTabTransition, 360);
};
```

- [ ] **Step 5: Create one tab content renderer**

Replace the active-only `content` map with:

```tsx
const renderTabContent = (tab: TabName) => {
  if (tab === "Knockout") {
    return <KnockoutTab rounds={knockout} teams={teams} />;
  }

  if (tab === "Fixtures") {
    return (
      <FixturesTab
        activeFilter={fixtureFilter}
        companyPicks={companyPicks}
        fixtures={fixtures}
        participantTeamCode={participant.teamCode}
        selectedGroup={selectedFixtureGroup}
        showFilters={false}
      />
    );
  }

  if (tab === "Table") {
    return (
      <TableTab
        companyPicks={companyPicks}
        scopeMode={scopeMode}
        standings={standings}
        tableMode={tableMode}
      />
    );
  }

  return <NewsTab news={news} selectedTeam={selectedTeam} />;
};
```

- [ ] **Step 6: Create toolbar and panel renderers**

Use a single screen renderer so outgoing and incoming screens share the same structure:

```tsx
const renderTabScreen = (tab: TabName, layer: TabScreenLayer) => {
  const isOutgoing = layer === "outgoing";
  const isIncoming = layer === "incoming";
  const directionClass = isOutgoing
    ? transitionDirection === "forward"
      ? "tab-screen-exit-left"
      : "tab-screen-exit-right"
    : isIncoming
      ? transitionDirection === "forward"
        ? "tab-screen-enter-right"
        : "tab-screen-enter-left"
      : "";

  return (
    <div
      key={`${layer}-${tab}`}
      aria-hidden={isOutgoing ? "true" : undefined}
      className={[
        "tab-screen",
        isOutgoing ? "tab-screen-outgoing" : "",
        isIncoming ? "tab-screen-incoming" : "",
        directionClass,
      ].filter(Boolean).join(" ")}
      data-tab-screen={tab}
      inert={isOutgoing ? true : undefined}
      onAnimationEnd={
        isIncoming
          ? (event) => {
              if (event.currentTarget === event.target) {
                completeTabTransition();
              }
            }
          : undefined
      }
    >
      {renderTabToolbar(tab)}
      {renderTabPanel(tab, isOutgoing)}
    </div>
  );
};
```

`renderTabPanel` must attach the existing touch handlers only when `isOutgoing` is false.

- [ ] **Step 7: Replace the ready-state layout**

```tsx
<div className="tab-transition-viewport">
  <div className="tab-transition-stage">
    {outgoingTab ? renderTabScreen(outgoingTab, "outgoing") : null}
    {renderTabScreen(activeTab, outgoingTab ? "incoming" : "active")}
  </div>
</div>
```

- [ ] **Step 8: Run the focused tests**

Run:

```bash
npm.cmd run test --workspace web -- AppShell.test.tsx
```

Expected: transition lifecycle, direction, lock, toolbar, and gesture tests pass.

- [ ] **Step 9: Commit the transition state**

```bash
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/AppShell.test.tsx
git commit -m "feat: add coordinated tab transition state"
```

### Task 4: Add Slide Animation and Reduced Motion

**Files:**
- Modify: `apps/web/src/styles.css:508-537,1596-1618`
- Test: `apps/web/src/components/home/AppShell.test.tsx`

- [ ] **Step 1: Add failing CSS assertions**

```tsx
test("defines coordinated tab screen slide animations", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.tab-transition-viewport\s*\{[\s\S]*?overflow-x:\s*clip;/,
  );
  expect(applicationStyles).toContain("animation-duration: 280ms;");
  expect(applicationStyles).toContain("@keyframes tab-screen-enter-right");
  expect(applicationStyles).toContain("@keyframes tab-screen-enter-left");
  expect(applicationStyles).toContain("@keyframes tab-screen-exit-left");
  expect(applicationStyles).toContain("@keyframes tab-screen-exit-right");
  expect(applicationStyles).toMatch(
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation:\s*none;/,
  );
});
```

- [ ] **Step 2: Run the style test and verify RED**

Run:

```bash
npm.cmd run test --workspace web -- AppShell.test.tsx
```

Expected: FAIL because the new transition CSS does not exist.

- [ ] **Step 3: Replace enter-only CSS**

```css
.tab-transition-viewport {
  min-width: 0;
  overflow-x: clip;
}

.tab-transition-stage {
  position: relative;
  min-width: 0;
}

.tab-screen {
  min-width: 0;
}

.tab-screen-incoming,
.tab-screen-outgoing {
  animation-duration: 280ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
  will-change: transform, opacity;
}

.tab-screen-incoming {
  position: relative;
  z-index: 2;
}

.tab-screen-outgoing {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  pointer-events: none;
}

.tab-screen-enter-right {
  animation-name: tab-screen-enter-right;
}

.tab-screen-enter-left {
  animation-name: tab-screen-enter-left;
}

.tab-screen-exit-left {
  animation-name: tab-screen-exit-left;
}

.tab-screen-exit-right {
  animation-name: tab-screen-exit-right;
}
```

- [ ] **Step 4: Add the four keyframes**

```css
@keyframes tab-screen-enter-right {
  from { opacity: 0.82; transform: translateX(36px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes tab-screen-enter-left {
  from { opacity: 0.82; transform: translateX(-36px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes tab-screen-exit-left {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0.82; transform: translateX(-36px); }
}

@keyframes tab-screen-exit-right {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0.82; transform: translateX(36px); }
}
```

- [ ] **Step 5: Add reduced-motion CSS**

```css
@media (prefers-reduced-motion: reduce) {
  .tab-screen-incoming,
  .tab-screen-outgoing {
    animation: none;
  }
}
```

- [ ] **Step 6: Run focused verification**

Run:

```bash
npm.cmd run test --workspace web -- AppShell.test.tsx
npm.cmd run lint --workspace web
```

Expected: all focused tests pass and TypeScript reports no errors.

- [ ] **Step 7: Commit animation styles**

```bash
git add apps/web/src/styles.css apps/web/src/components/home/AppShell.test.tsx
git commit -m "feat: animate dashboard tab screens"
```

### Task 5: Full Verification and Responsive QA

**Files:**
- Verify: `apps/web/src/components/layout/AppShell.tsx`
- Verify: `apps/web/src/components/home/AppShell.test.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: Run the complete web suite**

```bash
npm.cmd run test --workspace web
```

Expected: all web tests pass.

- [ ] **Step 2: Run lint and production build**

```bash
npm.cmd run lint --workspace web
npm.cmd run build --workspace web
```

Expected: both commands exit successfully.

- [ ] **Step 3: Check the patch**

```bash
git diff --check
git status -sb
```

Expected: no whitespace errors and only intended files are changed.

- [ ] **Step 4: Verify the running app**

Target flow:

```text
http://192.168.110.119:5173
-> click/swipe Knockout to Fixtures
-> observe outgoing-left and incoming-right screens
-> navigate Table back to Fixtures
-> observe outgoing-right and incoming-left screens
-> rapidly scroll vertically
-> active tab remains unchanged
```

Check mobile and desktop widths for:

- stationary header and primary tabs;
- no horizontal page scrollbar;
- no toolbar overlap;
- no duplicate clickable outgoing controls;
- usable Knockout and Full Table horizontal scrolling;
- no console errors.

- [ ] **Step 5: Commit any verification-only correction**

Only if QA reveals an implementation defect:

```bash
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/AppShell.test.tsx apps/web/src/styles.css
git commit -m "fix: polish tab slide transition"
```
