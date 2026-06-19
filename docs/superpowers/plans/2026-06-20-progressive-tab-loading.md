# Progressive Tab Loading and Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home render immediately, cache and prefetch tournament tab data, and support image-like horizontal tab swipes without full-page loading or the existing 360 ms navigation lock.

**Architecture:** TanStack Query owns independent tournament requests and cache lifetimes. `AppShell` keeps shell controls and filter state, while a dedicated carousel renders lightweight slide wrappers and mounts only the active and adjacent lazy tab modules. Pointer movement updates the carousel transform directly; query loading and background refresh never control swipe motion.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, TanStack Query 5.101, CSS transforms, Vitest, Testing Library

---

## File Structure

### Create

- `apps/web/src/lib/queryClient.ts`: query client factory and shared cache defaults.
- `apps/web/src/lib/queryClient.test.ts`: query default regression tests.
- `apps/web/src/test/renderWithQueryClient.tsx`: create an isolated query client for every component test render.
- `apps/web/src/lib/tournamentQueries.ts`: typed query options, query keys, and tab prefetch mapping.
- `apps/web/src/lib/tournamentQueries.test.ts`: freshness and request-deduplication tests.
- `apps/web/src/components/layout/tabModules.ts`: lazy tab imports and reusable module preload functions.
- `apps/web/src/components/layout/tabModules.test.ts`: module-preloader deduplication test.
- `apps/web/src/components/home/FixtureFilters.tsx`: lightweight eager toolbar extracted from the lazy Fixtures content module.
- `apps/web/src/components/layout/TabLoadState.tsx`: panel-local skeleton, error, retry, and background-refresh UI.
- `apps/web/src/components/layout/TabLoadState.test.tsx`: local loading/error behavior tests.
- `apps/web/src/hooks/useHomeTabQueries.ts`: enable only active/adjacent tab queries and expose per-tab query groups.
- `apps/web/src/hooks/useHomeTabQueries.test.tsx`: progressive request and cache tests.
- `apps/web/src/hooks/useTabSwipe.ts`: horizontal gesture decision, direct transform updates, clamping, and snap completion.
- `apps/web/src/hooks/useTabSwipe.test.ts`: threshold, direction, velocity, and boundary tests.
- `apps/web/src/components/layout/TabCarousel.tsx`: stable four-slide track that mounts only active/adjacent content.
- `apps/web/src/components/layout/TabCarousel.test.tsx`: gesture, accessibility, and reduced-motion tests.

### Modify

- `apps/web/package.json`: add `@tanstack/react-query@^5.101.0`.
- `package-lock.json`: lock the installed query dependency.
- `apps/web/src/main.tsx`: provide the shared query client.
- `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`: use the isolated query render helper.
- `apps/web/src/components/layout/AppShell.tsx`: remove global `Promise.all`, eager tab imports, and outgoing-tab timer; coordinate queries, prefetch, and carousel.
- `apps/web/src/components/home/AppShell.test.tsx`: replace old two-layer animation tests with progressive-loading and integration coverage.
- `apps/web/src/styles.css`: replace outgoing/incoming keyframes with a transform track and add local skeleton/error styling.

## Task 1: Add the Query Client Foundation

**Files:**
- Create: `apps/web/src/lib/queryClient.ts`
- Create: `apps/web/src/lib/queryClient.test.ts`
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/test/renderWithQueryClient.tsx`
- Modify: `apps/web/src/components/home/AppShell.test.tsx`
- Modify: `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the pinned compatible major**

Run:

```powershell
npm.cmd install @tanstack/react-query@^5.101.0 --workspace web
```

Expected: `apps/web/package.json` contains `"@tanstack/react-query": "^5.101.0"` and npm updates the root lockfile.

- [ ] **Step 2: Write the failing query-default test**

Create `apps/web/src/lib/queryClient.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { createAppQueryClient } from "./queryClient";

describe("createAppQueryClient", () => {
  test("keeps successful inactive tab data for thirty minutes", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions().queries;

    expect(defaults?.gcTime).toBe(30 * 60 * 1000);
    expect(defaults?.retry).toBe(1);
    expect(defaults?.refetchOnWindowFocus).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/lib/queryClient.test.ts
```

Expected: FAIL because `./queryClient` does not exist.

- [ ] **Step 4: Implement the query client factory**

Create `apps/web/src/lib/queryClient.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

const THIRTY_MINUTES = 30 * 60 * 1000;

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: THIRTY_MINUTES,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}

export const appQueryClient = createAppQueryClient();
```

- [ ] **Step 5: Provide the client at the application root**

Replace `apps/web/src/main.tsx` with:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { appQueryClient } from "./lib/queryClient";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={appQueryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Add isolated query test rendering**

Before running tests, create `apps/web/src/test/renderWithQueryClient.tsx` so tests that import `App` directly receive a fresh cache:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { createAppQueryClient } from "../lib/queryClient";

export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createAppQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );
  return { ...result, queryClient };
}
```

In both `AppShell.test.tsx` and `TeamSelectionScreen.test.tsx`, remove `render` from the Testing Library import and add:

```ts
import { renderWithQueryClient as render } from "../../test/renderWithQueryClient";
```

All existing `render(<App />)` calls then remain unchanged and each test gets an isolated cache.

- [ ] **Step 7: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/lib/queryClient.test.ts
npm.cmd run lint --workspace web
```

Expected: the new test passes and TypeScript reports no errors.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/package.json package-lock.json apps/web/src/main.tsx apps/web/src/lib/queryClient.ts apps/web/src/lib/queryClient.test.ts apps/web/src/test/renderWithQueryClient.tsx apps/web/src/components/home/AppShell.test.tsx apps/web/src/components/selection/TeamSelectionScreen.test.tsx
git commit -m "feat: add tournament query client"
```

## Task 2: Define Typed Tournament Queries and Prefetching

**Files:**
- Create: `apps/web/src/lib/tournamentQueries.ts`
- Create: `apps/web/src/lib/tournamentQueries.test.ts`
- Read: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Write failing freshness and deduplication tests**

Create `apps/web/src/lib/tournamentQueries.test.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams,
} from "./api";
import {
  prefetchTabData,
  tournamentQueries,
} from "./tournamentQueries";

vi.mock("./api", () => ({
  fetchFixtures: vi.fn(async () => ({ fixtures: [] })),
  fetchKnockout: vi.fn(async () => ({ knockout: [] })),
  fetchNews: vi.fn(async () => ({ news: [] })),
  fetchStandings: vi.fn(async () => ({ companyPicks: [], standings: [] })),
  fetchTeams: vi.fn(async () => ({ teams: [] })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tournament query options", () => {
  test("uses the approved freshness windows", () => {
    expect(tournamentQueries.teams.staleTime).toBe(24 * 60 * 60 * 1000);
    expect(tournamentQueries.knockout.staleTime).toBe(30 * 1000);
    expect(tournamentQueries.fixtures.staleTime).toBe(30 * 1000);
    expect(tournamentQueries.table.staleTime).toBe(30 * 1000);
    expect(tournamentQueries.news.staleTime).toBe(5 * 60 * 1000);
  });

  test("deduplicates repeated adjacent-tab prefetches", async () => {
    const client = new QueryClient();

    await Promise.all([
      prefetchTabData(client, "Fixtures"),
      prefetchTabData(client, "Fixtures"),
    ]);

    expect(fetchFixtures).toHaveBeenCalledTimes(1);
    expect(fetchStandings).toHaveBeenCalledTimes(1);
    expect(fetchTeams).not.toHaveBeenCalled();
    expect(fetchKnockout).not.toHaveBeenCalled();
    expect(fetchNews).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/lib/tournamentQueries.test.ts
```

Expected: FAIL because `tournamentQueries.ts` does not exist.

- [ ] **Step 3: Implement query options and tab mapping**

Create `apps/web/src/lib/tournamentQueries.ts`:

```ts
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams,
} from "./api";

export const homeTabs = ["Knockout", "Fixtures", "Table", "News"] as const;
export type HomeTab = (typeof homeTabs)[number];

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const tournamentQueries = {
  teams: queryOptions({
    queryKey: ["tournament", "teams"] as const,
    queryFn: fetchTeams,
    select: (result) => result.teams,
    staleTime: 24 * HOUR,
  }),
  knockout: queryOptions({
    queryKey: ["tournament", "knockout"] as const,
    queryFn: fetchKnockout,
    select: (result) => result.knockout,
    staleTime: 30 * SECOND,
  }),
  fixtures: queryOptions({
    queryKey: ["tournament", "fixtures"] as const,
    queryFn: fetchFixtures,
    select: (result) => result.fixtures,
    staleTime: 30 * SECOND,
  }),
  table: queryOptions({
    queryKey: ["tournament", "table"] as const,
    queryFn: fetchStandings,
    staleTime: 30 * SECOND,
  }),
  news: queryOptions({
    queryKey: ["tournament", "news"] as const,
    queryFn: fetchNews,
    select: (result) => result.news,
    staleTime: 5 * MINUTE,
  }),
} as const;

export function prefetchTabData(client: QueryClient, tab: HomeTab) {
  if (tab === "Knockout") {
    return Promise.all([
      client.prefetchQuery(tournamentQueries.teams),
      client.prefetchQuery(tournamentQueries.knockout),
    ]);
  }

  if (tab === "Fixtures") {
    return Promise.all([
      client.prefetchQuery(tournamentQueries.fixtures),
      client.prefetchQuery(tournamentQueries.table),
    ]);
  }

  if (tab === "Table") {
    return Promise.all([client.prefetchQuery(tournamentQueries.table)]);
  }

  return Promise.all([
    client.prefetchQuery(tournamentQueries.teams),
    client.prefetchQuery(tournamentQueries.news),
  ]);
}
```

- [ ] **Step 4: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/lib/tournamentQueries.test.ts
npm.cmd run lint --workspace web
```

Expected: both tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/lib/tournamentQueries.ts apps/web/src/lib/tournamentQueries.test.ts
git commit -m "feat: define tournament query cache policy"
```

## Task 3: Split and Preload Tab Modules

**Files:**
- Create: `apps/web/src/components/layout/tabModules.ts`
- Create: `apps/web/src/components/layout/tabModules.test.ts`
- Create: `apps/web/src/components/home/FixtureFilters.tsx`
- Modify: `apps/web/src/components/home/FixturesTab.tsx`
- Test: `apps/web/src/components/home/FixturesTab.test.tsx`

- [ ] **Step 1: Verify the fixture-filter refactor baseline**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/home/FixturesTab.test.tsx
```

Expected: the existing fixture tests pass before moving the toolbar code.

- [ ] **Step 2: Extract the eager fixture toolbar**

Create `apps/web/src/components/home/FixtureFilters.tsx`:

```tsx
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export const fixtureFilters = ["Date", "Round", "My Team", "Group"] as const;
export type FixtureFilter = (typeof fixtureFilters)[number];

type FixtureFiltersProps = {
  activeFilter: FixtureFilter;
  onFilterChange: (filter: FixtureFilter) => void;
  onGroupChange: (group: string) => void;
  selectedGroup: string;
};

const groupOptions = "ABCDEFGHIJKL".split("");

export function FixtureFilters({
  activeFilter,
  onFilterChange,
  onGroupChange,
  selectedGroup,
}: FixtureFiltersProps) {
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  function handleFilterClick(filter: FixtureFilter) {
    if (filter === "Group") {
      onFilterChange("Group");
      setGroupMenuOpen((isOpen) => (activeFilter === "Group" ? !isOpen : true));
      return;
    }
    onFilterChange(filter);
    setGroupMenuOpen(false);
  }

  return (
    <div className="fixture-filter-area">
      <div
        aria-label="Fixture filters"
        className="filter-row fixture-filter-row fixture-filter-row-fill"
      >
        {fixtureFilters.map((filter) => (
          <button
            key={filter}
            aria-controls={filter === "Group" ? "fixture-group-options" : undefined}
            aria-expanded={filter === "Group" ? groupMenuOpen : undefined}
            aria-haspopup={filter === "Group" ? "listbox" : undefined}
            aria-pressed={activeFilter === filter}
            className={[
              "filter-chip",
              "fixture-filter-chip",
              filter === "Group" ? "fixture-filter-chip-group" : "",
              activeFilter === filter ? "active" : "",
            ].filter(Boolean).join(" ")}
            type="button"
            onClick={() => handleFilterClick(filter)}
          >
            {filter}
            {filter === "Group" ? (
              <ChevronDown
                aria-hidden="true"
                className={groupMenuOpen ? "fixture-group-chevron open" : "fixture-group-chevron"}
                size={16}
                strokeWidth={2.2}
              />
            ) : null}
          </button>
        ))}
      </div>

      {groupMenuOpen ? (
        <div
          aria-label="Select group"
          className="fixture-group-menu"
          id="fixture-group-options"
          role="listbox"
        >
          {groupOptions.map((group) => (
            <button
              key={group}
              aria-selected={selectedGroup === group}
              className={`fixture-group-option${selectedGroup === group ? " selected" : ""}`}
              role="option"
              type="button"
              onClick={() => {
                onGroupChange(group);
                onFilterChange("Group");
                setGroupMenuOpen(false);
              }}
            >
              {`Group ${group}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

In `FixturesTab.tsx`, remove the `ChevronDown` import, `filters`, `groupOptions`, the local `FixtureFilter` type declaration, `FixtureFiltersProps`, and the local `FixtureFilters` implementation. Add:

```tsx
import { FixtureFilters, type FixtureFilter } from "./FixtureFilters";
export type { FixtureFilter } from "./FixtureFilters";
```

Change the local filter type to use the extracted tuple:

```tsx
const [localActiveFilter, setLocalActiveFilter] = useState<FixtureFilter>("Date");
```

- [ ] **Step 3: Verify the extraction preserved behavior**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/home/FixturesTab.test.tsx
npm.cmd run lint --workspace web
```

Expected: the fixture filter and group-picker tests remain green, and TypeScript reports no errors.

- [ ] **Step 4: Write the failing preloader test**

Create `apps/web/src/components/layout/tabModules.test.ts`:

```ts
import { expect, test, vi } from "vitest";
import { createModulePreloader } from "./tabModules";

test("reuses one module download for repeated preload calls", async () => {
  const loader = vi.fn(async () => ({ value: "loaded" }));
  const preload = createModulePreloader(loader);

  await Promise.all([preload(), preload(), preload()]);

  expect(loader).toHaveBeenCalledTimes(1);
});

test("allows a module download to retry after failure", async () => {
  const loader = vi.fn()
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValueOnce({ value: "loaded" });
  const preload = createModulePreloader(loader);

  await expect(preload()).rejects.toThrow("temporary failure");
  await expect(preload()).resolves.toEqual({ value: "loaded" });
  expect(loader).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 5: Run the test to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/layout/tabModules.test.ts
```

Expected: FAIL because `tabModules.ts` does not exist.

- [ ] **Step 6: Implement lazy imports and preloader reuse**

Create `apps/web/src/components/layout/tabModules.ts`:

```tsx
import { lazy } from "react";
import type { HomeTab } from "../../lib/tournamentQueries";

export function createModulePreloader<T>(loader: () => Promise<T>) {
  let pending: Promise<T> | null = null;
  return () => {
    pending ??= loader().catch((error) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}

const loadKnockout = createModulePreloader(() => import("../home/KnockoutTab"));
const loadFixtures = createModulePreloader(() => import("../home/FixturesTab"));
const loadTable = createModulePreloader(() => import("../home/TableTab"));
const loadNews = createModulePreloader(() => import("../home/NewsTab"));

export const LazyKnockoutTab = lazy(() =>
  loadKnockout().then((module) => ({ default: module.KnockoutTab })),
);
export const LazyFixturesTab = lazy(() =>
  loadFixtures().then((module) => ({ default: module.FixturesTab })),
);
export const LazyTableTab = lazy(() =>
  loadTable().then((module) => ({ default: module.TableTab })),
);
export const LazyNewsTab = lazy(() =>
  loadNews().then((module) => ({ default: module.NewsTab })),
);

const preloaders: Record<HomeTab, () => Promise<unknown>> = {
  Knockout: loadKnockout,
  Fixtures: loadFixtures,
  Table: loadTable,
  News: loadNews,
};

export function preloadTabModule(tab: HomeTab) {
  return preloaders[tab]().then(() => undefined);
}
```

- [ ] **Step 7: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/layout/tabModules.test.ts
npm.cmd run lint --workspace web
```

Expected: both preloader tests pass and TypeScript accepts the lazy module mappings.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/components/home/FixtureFilters.tsx apps/web/src/components/home/FixturesTab.tsx apps/web/src/components/layout/tabModules.ts apps/web/src/components/layout/tabModules.test.ts
git commit -m "perf: split tournament tab modules"
```

## Task 4: Add Independent Tab Query Groups and Local States

**Files:**
- Create: `apps/web/src/hooks/useHomeTabQueries.ts`
- Create: `apps/web/src/hooks/useHomeTabQueries.test.tsx`
- Create: `apps/web/src/components/layout/TabLoadState.tsx`
- Create: `apps/web/src/components/layout/TabLoadState.test.tsx`

- [ ] **Step 1: Write a failing progressive-request test**

Create `apps/web/src/hooks/useHomeTabQueries.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import * as api from "../lib/api";
import { useHomeTabQueries } from "./useHomeTabQueries";

vi.mock("../lib/api", () => ({
  fetchFixtures: vi.fn(async () => ({ fixtures: [] })),
  fetchKnockout: vi.fn(async () => ({ knockout: [] })),
  fetchNews: vi.fn(async () => ({ news: [] })),
  fetchStandings: vi.fn(async () => ({ companyPicks: [], standings: [] })),
  fetchTeams: vi.fn(async () => ({ teams: [] })),
}));

beforeEach(() => vi.clearAllMocks());

test("loads only the active and adjacent tab data", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  renderHook(() => useHomeTabQueries(0), { wrapper });

  await waitFor(() => {
    expect(api.fetchKnockout).toHaveBeenCalledTimes(1);
    expect(api.fetchFixtures).toHaveBeenCalledTimes(1);
    expect(api.fetchStandings).toHaveBeenCalledTimes(1);
  });

  expect(api.fetchTeams).toHaveBeenCalledTimes(1);
  expect(api.fetchNews).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the hook test to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/hooks/useHomeTabQueries.test.tsx
```

Expected: FAIL because `useHomeTabQueries` does not exist.

- [ ] **Step 3: Implement enabled query groups**

Create `apps/web/src/hooks/useHomeTabQueries.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { homeTabs, tournamentQueries } from "../lib/tournamentQueries";

export function useHomeTabQueries(activeIndex: number) {
  const enabledTabs = new Set(
    homeTabs.filter((_, index) => Math.abs(index - activeIndex) <= 1),
  );
  const needsTeams = enabledTabs.has("Knockout") || enabledTabs.has("News");
  const needsTable = enabledTabs.has("Fixtures") || enabledTabs.has("Table");

  const teams = useQuery({ ...tournamentQueries.teams, enabled: needsTeams });
  const knockout = useQuery({
    ...tournamentQueries.knockout,
    enabled: enabledTabs.has("Knockout"),
  });
  const fixtures = useQuery({
    ...tournamentQueries.fixtures,
    enabled: enabledTabs.has("Fixtures"),
  });
  const table = useQuery({ ...tournamentQueries.table, enabled: needsTable });
  const news = useQuery({
    ...tournamentQueries.news,
    enabled: enabledTabs.has("News"),
  });

  return { fixtures, knockout, news, table, teams };
}
```

- [ ] **Step 4: Write failing local-state tests**

Create `apps/web/src/components/layout/TabLoadState.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TabLoadState, TabRefreshNotice } from "./TabLoadState";

test("shows a panel-local skeleton while first data is pending", () => {
  render(<TabLoadState label="Knockout" state="loading" />);
  expect(screen.getByLabelText("Loading Knockout")).toBeInTheDocument();
});

test("retries a tab-local failure", () => {
  const retry = vi.fn();
  render(<TabLoadState label="News" onRetry={retry} state="error" />);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("keeps content usable while a background refresh has failed", () => {
  const retry = vi.fn();
  render(<TabRefreshNotice onRetry={retry} />);
  fireEvent.click(screen.getByRole("button", { name: "Refresh again" }));
  expect(retry).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 5: Implement the panel-local state component**

Create `apps/web/src/components/layout/TabLoadState.tsx`:

```tsx
type TabLoadStateProps = {
  label: string;
  onRetry?: () => void;
  state: "loading" | "error";
};

export function TabRefreshNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="tab-refresh-notice" role="status">
      <span>Showing saved data. Refresh failed.</span>
      <button type="button" onClick={onRetry}>Refresh again</button>
    </div>
  );
}

export function TabLoadState({ label, onRetry, state }: TabLoadStateProps) {
  if (state === "loading") {
    return (
      <div aria-label={`Loading ${label}`} className="tab-local-skeleton" role="status">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="tab-local-error" role="alert">
      <strong>{`Unable to load ${label}.`}</strong>
      <button className="primary-button" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/hooks/useHomeTabQueries.test.tsx src/components/layout/TabLoadState.test.tsx
npm.cmd run lint --workspace web
```

Expected: all four focused tests pass and TypeScript reports no errors.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/hooks/useHomeTabQueries.ts apps/web/src/hooks/useHomeTabQueries.test.tsx apps/web/src/components/layout/TabLoadState.tsx apps/web/src/components/layout/TabLoadState.test.tsx
git commit -m "feat: load tournament tabs independently"
```

## Task 5: Implement One-Snap-Per-Gesture Decisions

**Files:**
- Create: `apps/web/src/hooks/useTabSwipe.ts`
- Create: `apps/web/src/hooks/useTabSwipe.test.ts`

- [ ] **Step 1: Write failing gesture-decision tests**

Create `apps/web/src/hooks/useTabSwipe.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { resolveSwipeDelta } from "./useTabSwipe";

describe("resolveSwipeDelta", () => {
  test("advances only one tab for a long fast left swipe", () => {
    expect(resolveSwipeDelta({
      activeIndex: 0,
      distanceX: -420,
      distanceY: 18,
      elapsedMs: 120,
      tabCount: 4,
      viewportWidth: 390,
    })).toBe(1);
  });

  test("returns to the same tab for a short slow swipe", () => {
    expect(resolveSwipeDelta({
      activeIndex: 1,
      distanceX: -30,
      distanceY: 8,
      elapsedMs: 220,
      tabCount: 4,
      viewportWidth: 390,
    })).toBe(0);
  });

  test("does not treat vertical scrolling as tab navigation", () => {
    expect(resolveSwipeDelta({
      activeIndex: 1,
      distanceX: -80,
      distanceY: 220,
      elapsedMs: 250,
      tabCount: 4,
      viewportWidth: 390,
    })).toBe(0);
  });

  test("clamps gestures at the first and final tabs", () => {
    expect(resolveSwipeDelta({
      activeIndex: 0,
      distanceX: 180,
      distanceY: 5,
      elapsedMs: 180,
      tabCount: 4,
      viewportWidth: 390,
    })).toBe(0);
    expect(resolveSwipeDelta({
      activeIndex: 3,
      distanceX: -180,
      distanceY: 5,
      elapsedMs: 180,
      tabCount: 4,
      viewportWidth: 390,
    })).toBe(0);
  });
});
```

- [ ] **Step 2: Run the decision tests to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/hooks/useTabSwipe.test.ts
```

Expected: FAIL because `useTabSwipe.ts` does not exist.

- [ ] **Step 3: Implement the decision function and gesture hook**

Create `apps/web/src/hooks/useTabSwipe.ts`:

```ts
import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";

type SwipeInput = {
  activeIndex: number;
  distanceX: number;
  distanceY: number;
  elapsedMs: number;
  tabCount: number;
  viewportWidth: number;
};

type Gesture = {
  pointerId: number;
  startTime: number;
  startX: number;
  startY: number;
};

export function resolveSwipeDelta({
  activeIndex,
  distanceX,
  distanceY,
  elapsedMs,
  tabCount,
  viewportWidth,
}: SwipeInput) {
  if (Math.abs(distanceX) <= Math.abs(distanceY) * 1.2) return 0;

  const velocity = Math.abs(distanceX) / Math.max(elapsedMs, 1);
  const crossedDistance = Math.abs(distanceX) >= viewportWidth * 0.18;
  const crossedVelocity = Math.abs(distanceX) >= 36 && velocity >= 0.55;
  if (!crossedDistance && !crossedVelocity) return 0;

  const delta = distanceX < 0 ? 1 : -1;
  const nextIndex = Math.min(Math.max(activeIndex + delta, 0), tabCount - 1);
  return nextIndex - activeIndex;
}

export function useTabSwipe({
  activeIndex,
  onIndexChange,
  reducedMotion,
  tabCount,
}: {
  activeIndex: number;
  onIndexChange: (index: number) => void;
  reducedMotion: boolean;
  tabCount: number;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const frameRef = useRef<number | null>(null);

  const setTransform = (index: number, offset = 0, animate = true) => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;
    const x = -(index * viewport.clientWidth) + offset;
    track.style.transition = animate && !reducedMotion
      ? "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  useLayoutEffect(() => {
    setTransform(activeIndex, 0, true);
  }, [activeIndex, reducedMotion]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const observer = new ResizeObserver(() => {
      setTransform(activeIndex, 0, false);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [activeIndex, reducedMotion]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    gestureRef.current = {
      pointerId: event.pointerId,
      startTime: event.timeStamp,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setTransform(activeIndex, 0, false);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    const viewport = viewportRef.current;
    if (!gesture || !viewport || gesture.pointerId !== event.pointerId) return;
    const distanceX = event.clientX - gesture.startX;
    const distanceY = event.clientY - gesture.startY;
    if (Math.abs(distanceX) <= Math.abs(distanceY) * 1.2) return;
    event.preventDefault();

    const atStart = activeIndex === 0 && distanceX > 0;
    const atEnd = activeIndex === tabCount - 1 && distanceX < 0;
    const offset = atStart || atEnd ? distanceX * 0.18 : distanceX;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setTransform(activeIndex, offset, false);
    });
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const viewportWidth = viewportRef.current?.clientWidth ?? 1;
    const delta = resolveSwipeDelta({
      activeIndex,
      distanceX: event.clientX - gesture.startX,
      distanceY: event.clientY - gesture.startY,
      elapsedMs: event.timeStamp - gesture.startTime,
      tabCount,
      viewportWidth,
    });
    const nextIndex = activeIndex + delta;
    if (nextIndex === activeIndex) setTransform(activeIndex, 0, true);
    else onIndexChange(nextIndex);
  };

  const cancelGesture = () => {
    gestureRef.current = null;
    setTransform(activeIndex, 0, true);
  };

  return {
    onPointerCancel: cancelGesture,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishGesture,
    trackRef,
    viewportRef,
  };
}
```

- [ ] **Step 4: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/hooks/useTabSwipe.test.ts
npm.cmd run lint --workspace web
```

Expected: all four decision tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/hooks/useTabSwipe.ts apps/web/src/hooks/useTabSwipe.test.ts
git commit -m "feat: add bounded tab swipe gestures"
```

## Task 6: Build the Accessible Carousel Track

**Files:**
- Create: `apps/web/src/components/layout/TabCarousel.tsx`
- Create: `apps/web/src/components/layout/TabCarousel.test.tsx`

- [ ] **Step 1: Write failing carousel behavior tests**

Create `apps/web/src/components/layout/TabCarousel.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { TabCarousel } from "./TabCarousel";

const tabs = ["Knockout", "Fixtures", "Table", "News"] as const;

beforeEach(() => {
  class ResizeObserverMock {
    constructor(private callback: ResizeObserverCallback) {}
    disconnect() {}
    unobserve() {}
    observe(target: Element) {
      Object.defineProperty(target, "scrollHeight", {
        configurable: true,
        value: 480,
      });
      this.callback(
        [{ target } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

function Harness({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <TabCarousel
      activeIndex={activeIndex}
      reducedMotion={reducedMotion}
      tabs={tabs}
      onActiveIndexChange={setActiveIndex}
      renderTab={(tab) => <div>{tab}</div>}
    />
  );
}

test("mounts only the active and adjacent tab contents", () => {
  render(<Harness />);
  expect(screen.getByText("Knockout")).toBeInTheDocument();
  expect(screen.getByText("Fixtures")).toBeInTheDocument();
  expect(screen.queryByText("Table")).not.toBeInTheDocument();
  expect(screen.queryByText("News")).not.toBeInTheDocument();
});

test("advances one slide after a qualifying pointer gesture", () => {
  render(<Harness />);
  const viewport = screen.getByLabelText("Tournament tabs");
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 390 });

  fireEvent.pointerDown(viewport, { clientX: 320, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(viewport, { clientX: 150, clientY: 108, pointerId: 1 });
  fireEvent.pointerUp(viewport, { clientX: 120, clientY: 108, pointerId: 1 });

  expect(screen.getByText("Table")).toBeInTheDocument();
  expect(screen.queryByText("News")).not.toBeInTheDocument();
});

test("handles rapid sequential gestures without skipping a tab", () => {
  render(<Harness />);
  const viewport = screen.getByLabelText("Tournament tabs");
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 390 });

  fireEvent.pointerDown(viewport, { clientX: 320, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(viewport, { clientX: 100, clientY: 106, pointerId: 1 });
  fireEvent.pointerDown(viewport, { clientX: 320, clientY: 100, pointerId: 2 });
  fireEvent.pointerUp(viewport, { clientX: 100, clientY: 106, pointerId: 2 });

  expect(screen.getByTestId("tab-slide-Table")).not.toHaveAttribute("aria-hidden");
  expect(screen.getByTestId("tab-slide-News")).toHaveAttribute("aria-hidden", "true");
});

test("keeps inactive slides hidden from assistive technology", () => {
  render(<Harness />);
  expect(screen.getByTestId("tab-slide-Fixtures")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByTestId("tab-slide-Knockout")).not.toHaveAttribute("aria-hidden");
});

test("sizes the viewport from the active slide instead of a taller neighbor", () => {
  render(<Harness />);
  expect(screen.getByLabelText("Tournament tabs")).toHaveStyle({ height: "480px" });
});

test("disables track animation when reduced motion is preferred", () => {
  render(<Harness reducedMotion />);
  expect(screen.getByTestId("tab-carousel-track")).toHaveStyle({ transition: "none" });
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/layout/TabCarousel.test.tsx
```

Expected: FAIL because `TabCarousel.tsx` does not exist.

- [ ] **Step 3: Implement the stable four-slide track**

Create `apps/web/src/components/layout/TabCarousel.tsx`:

```tsx
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useTabSwipe } from "../../hooks/useTabSwipe";
import type { HomeTab } from "../../lib/tournamentQueries";

type TabCarouselProps = {
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  reducedMotion: boolean;
  renderTab: (tab: HomeTab) => ReactNode;
  tabs: readonly HomeTab[];
};

export function TabCarousel({
  activeIndex,
  onActiveIndexChange,
  reducedMotion,
  renderTab,
  tabs,
}: TabCarouselProps) {
  const activeSlideRef = useRef<HTMLDivElement | null>(null);
  const swipe = useTabSwipe({
    activeIndex,
    onIndexChange: onActiveIndexChange,
    reducedMotion,
    tabCount: tabs.length,
  });

  useLayoutEffect(() => {
    const slide = activeSlideRef.current;
    const viewport = swipe.viewportRef.current;
    if (!slide || !viewport) return undefined;

    const syncHeight = () => {
      viewport.style.height = `${slide.scrollHeight}px`;
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [activeIndex]);

  return (
    <div
      ref={swipe.viewportRef}
      aria-label="Tournament tabs"
      className="tab-carousel-viewport"
      onPointerCancel={swipe.onPointerCancel}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
    >
      <div
        ref={swipe.trackRef}
        className="tab-carousel-track"
        data-testid="tab-carousel-track"
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const shouldMount = Math.abs(index - activeIndex) <= 1;
          return (
            <div
              key={tab}
              ref={isActive ? activeSlideRef : undefined}
              aria-hidden={isActive ? undefined : "true"}
              className="tab-carousel-slide"
              data-testid={`tab-slide-${tab}`}
              inert={isActive ? undefined : true}
            >
              {shouldMount ? renderTab(tab) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/layout/TabCarousel.test.tsx
npm.cmd run lint --workspace web
```

Expected: all six carousel tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/layout/TabCarousel.tsx apps/web/src/components/layout/TabCarousel.test.tsx
git commit -m "feat: add tournament tab carousel"
```

## Task 7: Integrate Progressive Queries, Prefetching, and Lazy Tabs

**Files:**
- Modify: `apps/web/src/components/layout/AppShell.tsx:1-205,224-380,469-495`
- Modify: `apps/web/src/components/home/AppShell.test.tsx:1-410`

- [ ] **Step 1: Replace obsolete animation assertions with failing integration tests**

In `apps/web/src/components/home/AppShell.test.tsx`:

1. Remove the obsolete tests named `does not change tabs when a vertical scroll drifts horizontally`, `changes tabs for a primarily horizontal swipe`, `changes tabs when swiping the active tab screen outside the panel`, `slides the previous screen out while the next screen enters`, `reverses slide direction when navigating to a previous tab`, `ignores repeated tab changes while a slide transition is active`, and `changes tabs immediately when reduced motion is preferred`. Their responsibilities move to `useTabSwipe.test.ts` and `TabCarousel.test.tsx`.
2. Add this deferred-response helper near the imports:

```ts
function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}
```

3. Add these tests:

```tsx
test("renders Home chrome without waiting for every tournament endpoint", async () => {
  const pendingNews = deferredResponse();
  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/news")) return pendingNews.promise;
    return currentFetch(input, init);
  }) as typeof fetch;

  render(<App />);

  expect(screen.getByText("World Cup Festival 688")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await screen.findByLabelText("World Cup knockout bracket")).toBeInTheDocument();
  expect(screen.queryByText("Loading the latest tournament dashboard...")).not.toBeInTheDocument();
});

test("shows cached tab content while its query refreshes", async () => {
  const { queryClient } = render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "Fixtures" }));
  expect(await screen.findByLabelText("Fixture filters")).toBeInTheDocument();

  const currentFetch = global.fetch;
  global.fetch = vi.fn((input, init) => {
    if (String(input).includes("/api/tournament/fixtures")) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: "Temporary failure" }), { status: 503 }),
      );
    }
    return currentFetch(input, init);
  }) as typeof fetch;

  await queryClient.invalidateQueries({ queryKey: ["tournament", "fixtures"] });

  expect(screen.getByLabelText("Fixture filters")).toBeInTheDocument();
  expect(screen.queryByLabelText("Loading Fixtures")).not.toBeInTheDocument();
  expect(await screen.findByText("Showing saved data. Refresh failed.")).toBeInTheDocument();
});

test("prefetches the destination on tab pointer down", async () => {
  render(<App />);
  await screen.findByLabelText("World Cup knockout bracket");

  fireEvent.pointerDown(screen.getByRole("tab", { name: "News" }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tournament/news"),
      expect.anything(),
    );
  });
});
```

- [ ] **Step 2: Run the integration tests to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/home/AppShell.test.tsx
```

Expected: FAIL because Home still uses a global loading state and tab buttons do not prefetch destinations.

- [ ] **Step 3: Replace eager data and transition state in `AppShell`**

Remove these imports and state groups:

```tsx
fetchFixtures,
fetchKnockout,
fetchNews,
fetchStandings,
fetchTeams,
Fixture,
GroupStanding,
KnockoutRound,
NewsItem,
Team,
teams,
knockout,
fixtures,
standings,
companyPicks,
news,
outgoingTab,
transitionDirection,
transitionTimerRef,
swipeStart,
homeStatus,
homeError,
loadHomeData,
TabName,
TabScreenLayer,
TransitionDirection,
selectedTeam,
```

Also remove eager imports of `KnockoutTab`, `FixturesTab`, `TableTab`, and `NewsTab`. Keep `FixtureFilters` and `FixtureFilter` because their toolbar remains owned by `AppShell`.

Add the query and layout imports below, and replace the existing React import with the shown block:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FixtureFilters,
  type FixtureFilter,
} from "../home/FixtureFilters";
import { useHomeTabQueries } from "../../hooks/useHomeTabQueries";
import {
  homeTabs,
  prefetchTabData,
  type HomeTab,
} from "../../lib/tournamentQueries";
import { TabCarousel } from "./TabCarousel";
import { TabLoadState, TabRefreshNotice } from "./TabLoadState";
import {
  LazyFixturesTab,
  LazyKnockoutTab,
  LazyNewsTab,
  LazyTableTab,
  preloadTabModule,
} from "./tabModules";
```

Replace the tab constants and active state with:

```tsx
const tabs = homeTabs;
const [activeIndex, setActiveIndex] = useState(0);
const activeTab = tabs[activeIndex];
const queryClient = useQueryClient();
const queries = useHomeTabQueries(activeIndex);
```

- [ ] **Step 4: Add destination prefetch and idle prefetch**

Add these callbacks and effects inside `AppShell`:

```tsx
const prefetchTab = useCallback(
  (tab: HomeTab) => {
    void Promise.all([
      preloadTabModule(tab),
      prefetchTabData(queryClient, tab),
    ]).catch(() => undefined);
  },
  [queryClient],
);

useEffect(() => {
  const neighbors = [tabs[activeIndex - 1], tabs[activeIndex + 1]].filter(
    (tab): tab is HomeTab => Boolean(tab),
  );
  neighbors.forEach(prefetchTab);
}, [activeIndex, prefetchTab]);

useEffect(() => {
  const preloadRemaining = () => tabs.forEach(prefetchTab);
  const idleWindow = window as Window & {
    cancelIdleCallback?: (id: number) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
  };
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const id = idleWindow.requestIdleCallback(preloadRemaining, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(preloadRemaining, 700);
  return () => window.clearTimeout(id);
}, [prefetchTab]);
```

- [ ] **Step 5: Render each tab from independent query state**

Replace `renderTabContent` with a function that returns local loading or error UI before the lazy component:

```tsx
const renderTabContent = (tab: HomeTab) => {
  if (tab === "Knockout") {
    if (!queries.knockout.data) {
      return (
        <TabLoadState
          label="Knockout"
          state={queries.knockout.isError ? "error" : "loading"}
          onRetry={() => void queries.knockout.refetch()}
        />
      );
    }
    return (
      <>
        {queries.knockout.isError || queries.teams.isError ? (
          <TabRefreshNotice
            onRetry={() => {
              void queries.knockout.refetch();
              void queries.teams.refetch();
            }}
          />
        ) : null}
        <LazyKnockoutTab
          onFastForwardSwipe={() => setActiveIndex(1)}
          rounds={queries.knockout.data}
          teams={queries.teams.data ?? []}
        />
      </>
    );
  }

  if (tab === "Fixtures") {
    if (!queries.fixtures.data) {
      return (
        <TabLoadState
          label="Fixtures"
          state={queries.fixtures.isError ? "error" : "loading"}
          onRetry={() => void queries.fixtures.refetch()}
        />
      );
    }
    return (
      <>
        {queries.fixtures.isError || queries.table.isError ? (
          <TabRefreshNotice
            onRetry={() => {
              void queries.fixtures.refetch();
              void queries.table.refetch();
            }}
          />
        ) : null}
        <LazyFixturesTab
          activeFilter={fixtureFilter}
          companyPicks={queries.table.data?.companyPicks ?? []}
          fixtures={queries.fixtures.data}
          participantTeamCode={participant.teamCode}
          selectedGroup={selectedFixtureGroup}
          showFilters={false}
        />
      </>
    );
  }

  if (tab === "Table") {
    if (!queries.table.data) {
      return (
        <TabLoadState
          label="Table"
          state={queries.table.isError ? "error" : "loading"}
          onRetry={() => void queries.table.refetch()}
        />
      );
    }
    return (
      <>
        {queries.table.isError ? (
          <TabRefreshNotice onRetry={() => void queries.table.refetch()} />
        ) : null}
        <LazyTableTab
          companyPicks={queries.table.data.companyPicks}
          scopeMode={scopeMode}
          standings={queries.table.data.standings}
          tableMode={tableMode}
        />
      </>
    );
  }

  if (!queries.news.data) {
    return (
      <TabLoadState
        label="News"
        state={queries.news.isError ? "error" : "loading"}
        onRetry={() => void queries.news.refetch()}
      />
    );
  }
  const selectedTeam =
    queries.teams.data?.find((team) => team.code === participant.teamCode) ?? null;
  return (
    <>
      {queries.news.isError || queries.teams.isError ? (
        <TabRefreshNotice
          onRetry={() => {
            void queries.news.refetch();
            void queries.teams.refetch();
          }}
        />
      ) : null}
      <LazyNewsTab news={queries.news.data} selectedTeam={selectedTeam} />
    </>
  );
};
```

Derive the fixture group without blocking Home:

```tsx
const participantFixtureGroup = useMemo(
  () =>
    queries.fixtures.data?.find(
      (fixture) =>
        fixture.homeTeam === participant.teamCode ||
        fixture.awayTeam === participant.teamCode,
    )?.group ?? "A",
  [participant.teamCode, queries.fixtures.data],
);
const selectedFixtureGroup = fixtureGroupOverride || participantFixtureGroup;
```

- [ ] **Step 6: Replace outgoing layers with `TabCarousel`**

Delete `handleTabChange`, `handleSwipeToTab`, `handleTabTouchStart`, `handleTabTouchEnd`, `completeTabTransition`, `renderTabScreen`, and the global Home loading/error branches. Render the carousel directly below the Home chrome:

```tsx
<TabCarousel
  activeIndex={activeIndex}
  reducedMotion={prefersReducedMotion}
  tabs={tabs}
  onActiveIndexChange={setActiveIndex}
  renderTab={(tab) => (
    <>
      {renderTabToolbar(tab)}
      <Suspense fallback={<TabLoadState label={tab} state="loading" />}>
        {renderTabPanel(tab)}
      </Suspense>
    </>
  )}
/>
```

Update each tab button:

```tsx
<button
  key={tab}
  ref={(node) => {
    tabRefs.current[index] = node;
  }}
  aria-selected={activeTab === tab}
  className="tab-button"
  role="tab"
  type="button"
  onClick={() => setActiveIndex(index)}
  onFocus={() => prefetchTab(tab)}
  onPointerDown={() => prefetchTab(tab)}
>
  {tab}
</button>
```

Change tab-button centering to immediate behavior:

```tsx
activeButton.scrollIntoView({
  behavior: "auto",
  inline: "center",
  block: "nearest",
});
```

- [ ] **Step 7: Run AppShell integration verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/home/AppShell.test.tsx
npm.cmd run lint --workspace web
```

Expected: Home chrome and Knockout no longer wait for News, tab destination prefetch works, cached revisit remains visible, and TypeScript reports no errors.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/AppShell.test.tsx
git commit -m "perf: load and prefetch tabs progressively"
```

## Task 8: Replace Old Transition CSS and Add Local Skeletons

**Files:**
- Modify: `apps/web/src/styles.css:522-570,1666-1720`
- Modify: `apps/web/src/components/home/AppShell.test.tsx`

- [ ] **Step 1: Write failing CSS assertions**

Replace the old coordinated-keyframe test in `AppShell.test.tsx` with:

```tsx
test("defines a transform carousel with local loading states", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.tab-carousel-viewport\s*\{[\s\S]*?overflow:\s*clip;[\s\S]*?touch-action:\s*pan-y;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-carousel-track\s*\{[\s\S]*?display:\s*flex;[\s\S]*?will-change:\s*transform;/,
  );
  expect(applicationStyles).toMatch(
    /\.tab-carousel-slide\s*\{[\s\S]*?flex:\s*0 0 100%;/,
  );
  expect(applicationStyles).toContain(".tab-local-skeleton");
  expect(applicationStyles).not.toContain("@keyframes tab-screen-enter-right");
});
```

- [ ] **Step 2: Run the style test to verify RED**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/home/AppShell.test.tsx
```

Expected: FAIL because the carousel and skeleton CSS do not exist.

- [ ] **Step 3: Replace the old transition rules**

Remove `.tab-transition-*`, `.tab-screen-*`, all four `tab-screen-*` keyframes, and their reduced-motion block. Add:

```css
.tab-carousel-viewport {
  min-width: 0;
  overflow: clip;
  touch-action: pan-y;
  transition: height 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tab-carousel-track {
  display: flex;
  align-items: flex-start;
  width: 100%;
  will-change: transform;
}

.tab-carousel-slide {
  flex: 0 0 100%;
  min-width: 0;
}

.tab-local-skeleton,
.tab-local-error {
  min-height: 220px;
  padding: 20px;
  border: 1px solid rgba(171, 219, 244, 0.78);
  background: rgba(255, 255, 255, 0.98);
}

.tab-local-skeleton {
  display: grid;
  align-content: start;
  gap: 12px;
}

.tab-local-skeleton span {
  display: block;
  height: 72px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eaf7fd 25%, #f8fcfe 50%, #eaf7fd 75%);
  background-size: 200% 100%;
  animation: tab-skeleton-pulse 1.2s ease-in-out infinite;
}

.tab-local-error {
  display: grid;
  place-content: center;
  justify-items: start;
  gap: 14px;
}

.tab-refresh-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  color: var(--muted);
  background: #f5fbfe;
  font-size: 0.82rem;
}

.tab-refresh-notice button {
  border: 0;
  color: var(--primary-strong);
  background: transparent;
  font: inherit;
  font-weight: 700;
}

@keyframes tab-skeleton-pulse {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .tab-carousel-track {
    transition: none !important;
  }

  .tab-carousel-viewport {
    transition: none;
  }

  .tab-local-skeleton span {
    animation: none;
  }
}
```

- [ ] **Step 4: Run focused verification**

Run:

```powershell
npm.cmd run test --workspace web -- src/components/home/AppShell.test.tsx src/components/layout/TabCarousel.test.tsx src/components/layout/TabLoadState.test.tsx
npm.cmd run lint --workspace web
```

Expected: CSS assertions, carousel tests, local-state tests, and TypeScript all pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/styles.css apps/web/src/components/home/AppShell.test.tsx
git commit -m "style: polish progressive tab carousel"
```

## Task 9: Full Verification and Mobile Performance QA

**Files:**
- Verify: `apps/web/src/components/layout/AppShell.tsx`
- Verify: `apps/web/src/components/layout/TabCarousel.tsx`
- Verify: `apps/web/src/hooks/useTabSwipe.ts`
- Verify: `apps/web/src/lib/tournamentQueries.ts`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: all frontend/backend tests pass, both TypeScript projects pass, Vite and API production builds succeed, and Git reports no whitespace errors.

- [ ] **Step 2: Verify production code splitting**

Run:

```powershell
Get-ChildItem apps/web/dist/assets/*.js | Select-Object Name,Length
```

Expected: the output contains the main application bundle plus separate lazy JavaScript chunks for tab modules. No single tab module should be folded back into the eager entry bundle.

- [ ] **Step 3: Verify request behavior under throttling**

Start the API and network-hosted Vite server in separate terminals.

Terminal 1:

```powershell
npm.cmd run dev:api
```

Terminal 2:

```powershell
npm.cmd run dev:host
```

In a mobile browser on the same Wi-Fi, test this sequence with network throttling enabled where available:

1. Reload with a saved participant session.
2. Confirm the brand header and primary tabs appear before News completes.
3. Confirm Knockout becomes usable without a full-page loading card.
4. Swipe once to Fixtures and confirm the panel is already rendered or shows only a local skeleton.
5. Swipe rapidly Fixtures -> Table -> News and back; each gesture advances one tab and never overshoots.
6. Scroll vertically inside the long Knockout bracket; the active Home tab does not change.
7. Return to each visited tab; cached content appears immediately while background requests refresh.
8. Disable the API after a successful load and revisit a tab; cached content remains usable.

- [ ] **Step 4: Inspect runtime failures**

During the QA sequence, verify:

```text
Console: no uncaught exceptions, act warnings, or repeated query errors
Network: no duplicate in-flight request for the same tournament endpoint
Layout: no horizontal document scrollbar or tab-panel overlap
Accessibility: inactive slides are aria-hidden and inert
Reduced motion: tab changes occur without transform animation
```

Expected: all checks hold on a narrow mobile viewport and a desktop viewport.

- [ ] **Step 5: Commit only if QA required a correction**

Stage the exact corrected files rather than using `git add -A`, then run the full verification commands again. Use:

```powershell
git commit -m "fix: finalize progressive tab performance"
```

Expected: the final commit contains only QA corrections and all verification commands still pass.

## Completion Checklist

- [ ] Home shell is independent from tournament query completion.
- [ ] Knockout is the priority query and Fixtures is prefetched as its adjacent tab.
- [ ] Table and News preload during idle time.
- [ ] Query requests are cached and deduplicated.
- [ ] Loading and errors are isolated to their tab.
- [ ] Cached content remains visible during background refresh.
- [ ] Tab code is split into lazy production chunks.
- [ ] One gesture advances at most one tab.
- [ ] Vertical scrolling never changes Home tabs.
- [ ] Reduced-motion users receive immediate tab replacement.
- [ ] Existing UI, filters, API contracts, and team-selection behavior remain intact.
- [ ] Full tests, lint, build, whitespace check, and mobile QA pass.
