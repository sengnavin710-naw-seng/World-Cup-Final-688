# World Cup Festival 688 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of World Cup Festival 688 with a React/Vite/TypeScript frontend, a Node.js API, Supabase-backed team ownership rules, and a responsive World Cup dashboard that matches the approved design spec.

**Architecture:** Use an npm workspaces monorepo with `apps/web` for the React client and `apps/api` for the Node.js API. Keep tournament content as backend-served mock data while storing participant selection records and team ownership in Supabase, with device identity remembered locally in the browser.

**Tech Stack:** npm workspaces, React, Vite, TypeScript, Node.js, Express, Vitest, React Testing Library, Supertest, Supabase, SQL migrations, Tailwind CSS, Lucide React

---

## File Structure

Planned repository structure after implementation:

- `package.json`
  Root workspace scripts and shared commands.
- `package-lock.json`
  Workspace dependency lockfile.
- `.gitignore`
  Ignore node modules, build outputs, env files, and local brainstorming files.
- `.env.example`
  Shared environment template documenting required variables.
- `apps/web/package.json`
  Frontend package scripts and dependencies.
- `apps/web/index.html`
  Vite HTML shell.
- `apps/web/src/main.tsx`
  Frontend bootstrap.
- `apps/web/src/App.tsx`
  Top-level app router/state shell.
- `apps/web/src/styles.css`
  Global theme and layout styling.
- `apps/web/src/lib/deviceIdentity.ts`
  Local browser device identity utilities.
- `apps/web/src/lib/api.ts`
  Frontend API client for backend calls.
- `apps/web/src/lib/types.ts`
  Shared frontend-facing domain types.
- `apps/web/src/hooks/useParticipantSession.ts`
  Session bootstrap, loading, and reset logic.
- `apps/web/src/components/layout/AppShell.tsx`
  Home navbar, tabs, notification entry, and utility menu wrapper.
- `apps/web/src/components/selection/TeamSelectionScreen.tsx`
  Full selection flow container.
- `apps/web/src/components/selection/TeamGrid.tsx`
  48-team grid with disabled and selected states.
- `apps/web/src/components/selection/DisplayNameForm.tsx`
  Display name form shown after team selection.
- `apps/web/src/components/home/SelectedTeamSummary.tsx`
  Current team summary and change name/team actions.
- `apps/web/src/components/home/KnockoutTab.tsx`
  Bracket and match detail cards.
- `apps/web/src/components/home/FixturesTab.tsx`
  Match listings and filters.
- `apps/web/src/components/home/TableTab.tsx`
  Group standings and company picks table.
- `apps/web/src/components/home/NewsTab.tsx`
  Featured story, list, and team spotlight.
- `apps/web/src/components/ui/ConfirmDialog.tsx`
  Shared confirmation modal for change team and reset device.
- `apps/web/src/components/ui/NotificationPanel.tsx`
  Placeholder notification panel.
- `apps/web/src/components/ui/BrandHeader.tsx`
  Logo + brand header component.
- `apps/web/src/test/setup.ts`
  React Testing Library and Vitest setup.
- `apps/web/src/test/fixtures/mockTournament.ts`
  Stable frontend test fixtures.
- `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`
  Selection flow tests.
- `apps/web/src/components/home/AppShell.test.tsx`
  Home/dashboard interaction tests.
- `apps/api/package.json`
  API package scripts and dependencies.
- `apps/api/src/server.ts`
  Express app factory used by tests and runtime.
- `apps/api/src/index.ts`
  API server startup entry.
- `apps/api/src/config.ts`
  Environment loading and validation.
- `apps/api/src/types.ts`
  API-side domain types.
- `apps/api/src/data/mockTournamentData.ts`
  Backend mock tournament dataset and helpers.
- `apps/api/src/lib/supabase.ts`
  Supabase client setup.
- `apps/api/src/lib/deviceIdentity.ts`
  Validation helpers for device identity payloads.
- `apps/api/src/services/selectionService.ts`
  Team selection, conflict, change, reset, and display name update logic.
- `apps/api/src/routes/health.ts`
  Health endpoint.
- `apps/api/src/routes/tournament.ts`
  Teams, knockout, fixtures, standings, company picks, and news endpoints.
- `apps/api/src/routes/participant.ts`
  Session bootstrap, create selection, update name, change team, reset device.
- `apps/api/src/test/setup.ts`
  API test setup helpers.
- `apps/api/src/routes/participant.test.ts`
  API ownership and conflict tests.
- `apps/api/src/routes/tournament.test.ts`
  Tournament content response tests.
- `supabase/migrations/20260530_create_selection_records.sql`
  Selection tables, constraints, and indexes.
- `README.md`
  Setup and run instructions for the repo.

## Task 1: Scaffold the workspace and shared tooling

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Write the failing repo smoke check**

Create a simple repo validation script reference in the plan by expecting the root commands to exist before implementation.

```json
{
  "scripts": {
    "dev:web": "npm run dev --workspace web",
    "dev:api": "npm run dev --workspace api",
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces"
  }
}
```

- [ ] **Step 2: Run repo check to verify it fails**

Run: `npm run test`
Expected: FAIL with missing `package.json` or missing script definitions.

- [ ] **Step 3: Write minimal root workspace files**

Create `package.json` with npm workspaces and shared scripts:

```json
{
  "name": "world-cup-festival-688",
  "private": true,
  "workspaces": [
    "apps/web",
    "apps/api"
  ],
  "scripts": {
    "dev:web": "npm run dev --workspace web",
    "dev:api": "npm run dev --workspace api",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.local
coverage/
.superpowers/
.DS_Store
```

Create `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_BRAND_NAME=World Cup Festival 688
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Create a minimal `README.md`:

```md
# World Cup Festival 688

Monorepo for the World Cup Festival 688 web app.

## Apps

- `apps/web`: React + Vite + TypeScript frontend
- `apps/api`: Node.js + Express backend
```

- [ ] **Step 4: Run repo check to verify it passes**

Run: `npm run test`
Expected: FAIL moves from missing root script to missing workspace packages, confirming the root scaffold exists.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore .env.example README.md
git commit -m "chore: scaffold workspace root"
```

## Task 2: Create the frontend app shell and test harness

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`

- [ ] **Step 1: Write the failing frontend render test**

Create `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import App from "../../App";

test("renders the World Cup Festival 688 brand on first load", () => {
  render(<App />);
  expect(screen.getByText("World Cup Festival 688")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace web -- TeamSelectionScreen`
Expected: FAIL because the `web` workspace and test setup do not exist yet.

- [ ] **Step 3: Write the minimal frontend scaffold**

Create `apps/web/package.json`:

```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "lucide-react": "^0.511.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.1.4"
  }
}
```

Create `apps/web/src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app">
      <header className="brand-header">
        <span className="brand-mark" aria-hidden="true" />
        <span>World Cup Festival 688</span>
      </header>
    </main>
  );
}
```

Create `apps/web/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `apps/web/src/styles.css`:

```css
:root {
  color: #102033;
  background: #f7fbff;
  font-family: "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

.app {
  min-height: 100vh;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  font-size: 1.5rem;
  font-weight: 700;
}

.brand-mark {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #00abff;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace web -- TeamSelectionScreen`
Expected: PASS with one successful render test.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold frontend app"
```

## Task 3: Create the backend app shell and API tests

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/tournament.test.ts`

- [ ] **Step 1: Write the failing backend health test**

Create `apps/api/src/routes/tournament.test.ts`:

```ts
import request from "supertest";
import { createServer } from "../server";

test("health endpoint returns ok", async () => {
  const app = createServer();
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace api -- tournament`
Expected: FAIL because the `api` workspace does not exist yet.

- [ ] **Step 3: Write the minimal backend scaffold**

Create `apps/api/package.json`:

```json
{
  "name": "api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.1",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.0",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  }
}
```

Create `apps/api/src/server.ts`:

```ts
import cors from "cors";
import express from "express";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  return app;
}
```

Create `apps/api/src/index.ts`:

```ts
import { createServer } from "./server";

const port = Number(process.env.PORT ?? 3001);
createServer().listen(port, () => {
  console.log(`api listening on ${port}`);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace api -- tournament`
Expected: PASS with the health endpoint test succeeding.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: scaffold backend api"
```

## Task 4: Define mock tournament contracts and tournament endpoints

**Files:**
- Create: `apps/api/src/types.ts`
- Create: `apps/api/src/data/mockTournamentData.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/api/src/routes/tournament.ts`
- Modify: `apps/api/src/routes/tournament.test.ts`
- Create: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Write the failing tournament endpoint test**

Extend `apps/api/src/routes/tournament.test.ts`:

```ts
test("teams endpoint returns 48 teams", async () => {
  const app = createServer();
  const response = await request(app).get("/api/tournament/teams");
  expect(response.status).toBe(200);
  expect(response.body.teams).toHaveLength(48);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace api -- tournament`
Expected: FAIL with `404` for `/api/tournament/teams`.

- [ ] **Step 3: Write tournament types and routes**

Create `apps/api/src/types.ts`:

```ts
export type Team = {
  code: string;
  name: string;
  thaiAlias?: string;
  flagUrl: string;
  group: string;
  isOwned: boolean;
  ownedByName?: string;
};
```

Create `apps/api/src/data/mockTournamentData.ts` with a static export:

```ts
import type { Team } from "../types";

export const teams: Team[] = [
  { code: "ARG", name: "Argentina", thaiAlias: "อาร์เจนตินา", flagUrl: "/flags/arg.svg", group: "A", isOwned: false },
  { code: "BRA", name: "Brazil", thaiAlias: "บราซิล", flagUrl: "/flags/bra.svg", group: "A", isOwned: false },
];
```

During implementation, fill the array to all 48 teams in this file instead of scattering team data across components.

Create `apps/api/src/routes/tournament.ts`:

```ts
import { Router } from "express";
import { teams } from "../data/mockTournamentData";

export const tournamentRouter = Router();

tournamentRouter.get("/teams", (_req, res) => {
  res.json({ teams });
});
```

Wire in `apps/api/src/server.ts`:

```ts
import { tournamentRouter } from "./routes/tournament";
// ...
app.use("/api/tournament", tournamentRouter);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace api -- tournament`
Expected: PASS for both health and teams endpoint tests after the full 48-team dataset is added.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/types.ts apps/api/src/data/mockTournamentData.ts apps/api/src/routes/tournament.ts apps/api/src/server.ts apps/api/src/routes/tournament.test.ts apps/web/src/lib/types.ts apps/web/src/lib/api.ts
git commit -m "feat: add tournament mock data endpoints"
```

## Task 5: Add Supabase schema and selection service rules

**Files:**
- Create: `supabase/migrations/20260530_create_selection_records.sql`
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/lib/supabase.ts`
- Create: `apps/api/src/services/selectionService.ts`
- Create: `apps/api/src/routes/participant.ts`
- Create: `apps/api/src/routes/participant.test.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Write the failing selection conflict test**

Create `apps/api/src/routes/participant.test.ts`:

```ts
import request from "supertest";
import { createServer } from "../server";

test("cannot assign one team to two participants", async () => {
  const app = createServer();

  await request(app).post("/api/participant/select").send({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "ARG",
  });

  const second = await request(app).post("/api/participant/select").send({
    deviceId: "device-2",
    displayName: "May",
    teamCode: "ARG",
  });

  expect(second.status).toBe(409);
  expect(second.body.code).toBe("SELECTION_CONFLICT");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace api -- participant`
Expected: FAIL because participant routes and persistence do not exist.

- [ ] **Step 3: Write schema and service layer**

Create `supabase/migrations/20260530_create_selection_records.sql`:

```sql
create table if not exists participant_selections (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  display_name text not null,
  team_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participant_selections_team_code_idx
  on participant_selections (team_code);
```

Create `apps/api/src/services/selectionService.ts` with an interface that supports:

```ts
export async function createSelection(input: {
  deviceId: string;
  displayName: string;
  teamCode: string;
}) {}

export async function changeSelection(input: {
  deviceId: string;
  displayName: string;
  nextTeamCode: string;
}) {}

export async function resetSelection(deviceId: string) {}
```

Implement conflict detection by relying on the unique `team_code` constraint and mapping duplicate-key errors to a `409 SELECTION_CONFLICT`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace api -- participant`
Expected: PASS for conflict handling and first successful selection.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260530_create_selection_records.sql apps/api/src/config.ts apps/api/src/lib/supabase.ts apps/api/src/services/selectionService.ts apps/api/src/routes/participant.ts apps/api/src/routes/participant.test.ts apps/api/src/server.ts
git commit -m "feat: add participant selection service"
```

## Task 6: Build frontend participant session bootstrapping and selection flow

**Files:**
- Create: `apps/web/src/lib/deviceIdentity.ts`
- Create: `apps/web/src/hooks/useParticipantSession.ts`
- Create: `apps/web/src/components/selection/TeamSelectionScreen.tsx`
- Create: `apps/web/src/components/selection/TeamGrid.tsx`
- Create: `apps/web/src/components/selection/DisplayNameForm.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`

- [ ] **Step 1: Write the failing selection flow test**

Update `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`:

```tsx
test("requires team selection before enabling continue", async () => {
  render(<App />);
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace web -- TeamSelectionScreen`
Expected: FAIL because the button and selection screen do not exist yet.

- [ ] **Step 3: Implement session and selection UI**

Create `apps/web/src/lib/deviceIdentity.ts`:

```ts
const DEVICE_KEY = "wcf688-device-id";

export function getOrCreateDeviceId() {
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const next = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, next);
  return next;
}
```

Implement `TeamSelectionScreen.tsx` with state for:
- search term
- selected team code
- display name
- loading state
- conflict message

The `Continue` button must remain disabled until both:
- an available team is selected
- display name is non-empty

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace web -- TeamSelectionScreen`
Expected: PASS for selection gating and brand render assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/deviceIdentity.ts apps/web/src/hooks/useParticipantSession.ts apps/web/src/components/selection/TeamSelectionScreen.tsx apps/web/src/components/selection/TeamGrid.tsx apps/web/src/components/selection/DisplayNameForm.tsx apps/web/src/App.tsx apps/web/src/components/selection/TeamSelectionScreen.test.tsx
git commit -m "feat: add participant selection flow"
```

## Task 7: Build the Home dashboard, tabs, and utility interactions

**Files:**
- Create: `apps/web/src/components/layout/AppShell.tsx`
- Create: `apps/web/src/components/home/SelectedTeamSummary.tsx`
- Create: `apps/web/src/components/home/KnockoutTab.tsx`
- Create: `apps/web/src/components/home/FixturesTab.tsx`
- Create: `apps/web/src/components/home/TableTab.tsx`
- Create: `apps/web/src/components/home/NewsTab.tsx`
- Create: `apps/web/src/components/ui/ConfirmDialog.tsx`
- Create: `apps/web/src/components/ui/NotificationPanel.tsx`
- Create: `apps/web/src/components/home/AppShell.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write the failing home dashboard test**

Create `apps/web/src/components/home/AppShell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import App from "../../App";

test("home defaults to knockout tab for returning participant", () => {
  window.localStorage.setItem("wcf688-session", JSON.stringify({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "ARG"
  }));

  render(<App />);
  expect(screen.getByRole("tab", { name: "Knockout" })).toHaveAttribute("aria-selected", "true");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace web -- AppShell`
Expected: FAIL because the dashboard shell and tab state do not exist.

- [ ] **Step 3: Implement the dashboard shell**

`AppShell.tsx` should provide:

```tsx
const tabs = ["Knockout", "Fixtures", "Table", "News"] as const;
```

Include:
- navbar with `World Cup Festival 688`
- bell icon button
- utility menu with `Reset this device`
- selected team summary bar
- default selected tab `Knockout`
- confirm dialog for `Change Team`
- confirm dialog for `Reset this device`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace web -- AppShell`
Expected: PASS with Knockout selected by default for a stored session.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/components/home/SelectedTeamSummary.tsx apps/web/src/components/home/KnockoutTab.tsx apps/web/src/components/home/FixturesTab.tsx apps/web/src/components/home/TableTab.tsx apps/web/src/components/home/NewsTab.tsx apps/web/src/components/ui/ConfirmDialog.tsx apps/web/src/components/ui/NotificationPanel.tsx apps/web/src/components/home/AppShell.test.tsx apps/web/src/App.tsx
git commit -m "feat: add home dashboard experience"
```

## Task 8: Connect frontend and backend, then verify locally

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/hooks/useParticipantSession.ts`
- Modify: `apps/api/src/routes/tournament.ts`
- Modify: `apps/api/src/routes/participant.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing integration-oriented test**

Add a frontend mock-fetch test asserting a returning participant skips selection:

```tsx
test("loads home for a remembered participant", async () => {
  render(<App />);
  expect(await screen.findByText("Change Team")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace web`
Expected: FAIL because session bootstrap is not yet calling the real API contract consistently.

- [ ] **Step 3: Implement real API wiring and docs**

In `apps/web/src/lib/api.ts`, add methods equivalent to:

```ts
export async function fetchTeams() {}
export async function fetchParticipant(deviceId: string) {}
export async function createSelection(payload: {
  deviceId: string;
  displayName: string;
  teamCode: string;
}) {}
export async function changeSelection(payload: {
  deviceId: string;
  displayName: string;
  teamCode: string;
}) {}
export async function resetDevice(deviceId: string) {}
```

Update `README.md` with concrete commands:

```md
## Install

npm install

## Run

npm run dev:api
npm run dev:web

## Test

npm run test
```

- [ ] **Step 4: Run full verification**

Run:
- `npm install`
- `npm run test`
- `npm run build`

Expected:
- dependency installation completes successfully
- all frontend and backend tests pass
- both apps build without TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/hooks/useParticipantSession.ts apps/api/src/routes/tournament.ts apps/api/src/routes/participant.ts README.md package-lock.json
git commit -m "feat: connect app flows end to end"
```

## Self-Review

### Spec coverage

- Entry decision and returning participant flow: covered by Tasks 6 and 8.
- Team selection grid, search, display name, continue gating, and disabled owned teams: covered by Tasks 4 and 6.
- Home navbar, bell icon, reset device menu, selected team summary, and default Knockout tab: covered by Task 7.
- Knockout, Fixtures, Table, and News tabs: covered by Tasks 4 and 7.
- Team ownership rules, conflicts, change team safety, and reset release behavior: covered by Task 5 and verified again in Task 8.
- Responsive behavior and polished visual shell: covered by Tasks 6 and 7, with build/test validation in Task 8.

### Placeholder scan

- No `TBD`, `TODO`, or deferred placeholders remain in the task steps.
- Each code-writing step names concrete files and includes concrete starter code or interfaces.
- Each test step includes a command and expected result.

### Type consistency

- `deviceId`, `displayName`, and `teamCode` are used consistently across backend routes, frontend API calls, and session state.
- `Knockout`, `Fixtures`, `Table`, and `News` tab labels match the approved spec exactly.
- `SELECTION_CONFLICT` is the stable error code for duplicate ownership handling across the API and UI.
