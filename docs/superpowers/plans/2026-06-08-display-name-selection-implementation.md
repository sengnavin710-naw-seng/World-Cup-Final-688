# Display Name Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a multilingual display name after team selection, remember it during team changes, and show it beneath resolved teams in the knockout bracket.

**Architecture:** Add a focused controlled dialog that validates and returns a trimmed display name to `TeamSelectionScreen`. Keep API submission and conflict recovery in the selection screen, pass the current name from the participant session during change mode, and pass the existing team ownership payload into `KnockoutTab` for resolved-team labels. No database migration is needed because `display_name` is already non-unique text and participant identity remains the device ID.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Express, Supabase

---

## File Structure

- Create `apps/web/src/components/selection/DisplayNameDialog.tsx`: controlled display-name dialog, validation, focus, and submit/cancel behavior.
- Create `apps/web/src/components/selection/DisplayNameDialog.test.tsx`: isolated tests for required input, trimming, Burmese text, length limit, cancel, and prefill.
- Modify `apps/web/src/components/selection/TeamSelectionScreen.tsx`: open the dialog after `Continue`, submit the chosen name with the team, and preserve retry behavior.
- Modify `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`: integration coverage for create, change, cancel, Burmese input, and selection conflict.
- Modify `apps/web/src/App.tsx`: pass the current participant display name into change mode.
- Modify `apps/web/src/components/home/KnockoutTab.tsx`: resolve concrete team slots and render owner names on desktop and mobile cards.
- Modify `apps/web/src/components/home/KnockoutTab.test.tsx`: verify resolved owner labels and placeholder behavior.
- Modify `apps/web/src/components/layout/AppShell.tsx`: pass the fetched team ownership data into `KnockoutTab`.
- Modify `apps/web/src/styles.css`: style the display-name form and secondary knockout owner labels using the existing theme and multilingual font stack.

### Task 1: Build the Display Name Dialog

**Files:**
- Create: `apps/web/src/components/selection/DisplayNameDialog.test.tsx`
- Create: `apps/web/src/components/selection/DisplayNameDialog.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Write failing dialog tests**

Create `apps/web/src/components/selection/DisplayNameDialog.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DisplayNameDialog } from "./DisplayNameDialog";

test("requires a display name before confirming", () => {
  const onConfirm = vi.fn();

  render(
    <DisplayNameDialog
      initialValue=""
      open
      submitting={false}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByRole("status")).toHaveTextContent("Display name is required.");
  expect(onConfirm).not.toHaveBeenCalled();
});

test("trims and submits a Burmese display name", () => {
  const onConfirm = vi.fn();

  render(
    <DisplayNameDialog
      initialValue=""
      open
      submitting={false}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: "  အောင်ကျော်သူ  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onConfirm).toHaveBeenCalledWith("အောင်ကျော်သူ");
});

test("prefills the existing display name and supports cancel", () => {
  const onCancel = vi.fn();

  render(
    <DisplayNameDialog
      initialValue="အောင်ကျော်ဟိန်း"
      open
      submitting={false}
      onCancel={onCancel}
      onConfirm={vi.fn()}
    />,
  );

  const input = screen.getByPlaceholderText("Display name");
  expect(input).toHaveValue("အောင်ကျော်ဟိန်း");
  expect(input).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledOnce();
});

test("rejects a display name longer than 80 characters", () => {
  const onConfirm = vi.fn();

  render(
    <DisplayNameDialog
      initialValue=""
      open
      submitting={false}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: "a".repeat(81) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByRole("status")).toHaveTextContent(
    "Display name must be 80 characters or fewer.",
  );
  expect(onConfirm).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the dialog tests and verify the missing component failure**

Run:

```bash
npm run test --workspace web -- DisplayNameDialog.test.tsx
```

Expected: FAIL because `./DisplayNameDialog` does not exist.

- [ ] **Step 3: Implement the controlled dialog**

Create `apps/web/src/components/selection/DisplayNameDialog.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from "react";

type DisplayNameDialogProps = {
  initialValue: string;
  open: boolean;
  submitError?: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (displayName: string) => void;
};

export function DisplayNameDialog({
  initialValue,
  onCancel,
  onConfirm,
  open,
  submitError = "",
  submitting,
}: DisplayNameDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    setErrorMessage("");
    inputRef.current?.focus();
  }, [initialValue, open]);

  if (!open) return null;

  const handleConfirm = () => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setErrorMessage("Display name is required.");
      return;
    }

    if (trimmedValue.length > 80) {
      setErrorMessage("Display name must be 80 characters or fewer.");
      return;
    }

    setErrorMessage("");
    onConfirm(trimmedValue);
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-labelledby={`${inputId}-title`}
        aria-modal="true"
        className="dialog-card display-name-dialog"
        role="dialog"
      >
        <h3 id={`${inputId}-title`}>Your Display Name</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleConfirm();
          }}
        >
          <label className="display-name-field" htmlFor={inputId}>
            <span>Display name</span>
            <input
              ref={inputRef}
              id={inputId}
              className="text-input"
              disabled={submitting}
              maxLength={81}
              placeholder="Display name"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>
          {errorMessage || submitError ? (
            <p className="error-text" role="status">
              {errorMessage || submitError}
            </p>
          ) : null}
          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={submitting}
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add focused dialog styles**

Add to the dialog section of `apps/web/src/styles.css`:

```css
.display-name-dialog h3 {
  margin: 0 0 16px;
}

.display-name-field {
  display: grid;
  gap: 8px;
  color: var(--text);
  font-weight: 700;
}

.display-name-dialog .error-text {
  margin: 10px 0 0;
}
```

- [ ] **Step 5: Run the dialog tests**

Run:

```bash
npm run test --workspace web -- DisplayNameDialog.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit the dialog**

Because `apps/web/src/styles.css` already contains unrelated local work, stage only the new dialog CSS hunk from that file.

```bash
git add apps/web/src/components/selection/DisplayNameDialog.tsx apps/web/src/components/selection/DisplayNameDialog.test.tsx
git add -p apps/web/src/styles.css
git diff --cached --check
git commit -m "feat: add display name dialog"
```

### Task 2: Connect the Dialog to Team Selection

**Files:**
- Modify: `apps/web/src/components/selection/TeamSelectionScreen.tsx`
- Modify: `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add failing selection-flow tests**

Add this import to `apps/web/src/components/selection/TeamSelectionScreen.test.tsx`:

```tsx
import { TeamSelectionScreen } from "./TeamSelectionScreen";
```

Change the default fetch mock signature from `(input)` to `(input, init)`, then add this branch before its final fallback:

```tsx
if (url.includes("/api/participant/select")) {
  const participant = JSON.parse(String(init?.body));
  return Promise.resolve(
    new Response(JSON.stringify({ participant }), { status: 201 }),
  );
}
```

Then add:

```tsx
test("opens the display name dialog and submits a trimmed Burmese name", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /Argentina/i }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  const input = screen.getByPlaceholderText("Display name");
  fireEvent.change(input, { target: { value: "  အောင်ကျော်သူ  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    const selectionCall = vi.mocked(global.fetch).mock.calls.find(([input]) =>
      String(input).includes("/api/participant/select"),
    );
    expect(selectionCall).toBeDefined();
    expect(JSON.parse(String(selectionCall?.[1]?.body))).toMatchObject({
      displayName: "အောင်ကျော်သူ",
      teamCode: "ARG",
    });
  });
});

test("cancelling the display name dialog does not save the selection", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /Argentina/i }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByPlaceholderText("Display name")).not.toBeInTheDocument();
  expect(
    vi.mocked(global.fetch).mock.calls.some(([input]) =>
      String(input).includes("/api/participant/select"),
    ),
  ).toBe(false);
});

test("keeps the dialog open and shows an API error when saving fails", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          teams: [
            {
              code: "ARG",
              name: "Argentina",
              group: "J",
              flag: "ARG",
              isOwned: false,
            },
          ],
        }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "failed" }), { status: 500 }),
    ) as typeof fetch;

  render(
    <TeamSelectionScreen
      brandName="World Cup Festival 688"
      mode="create"
      onSelectionSaved={vi.fn()}
    />,
  );

  fireEvent.click(await screen.findByRole("button", { name: /Argentina/i }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByPlaceholderText("Display name"), {
    target: { value: "Seng" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("Unable to save your team selection right now."),
  ).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Display name")).toBeInTheDocument();
});
```

Add a direct change-mode test with a one-team fetch mock:

```tsx
test("prefills the current display name in change mode", async () => {
  render(
    <TeamSelectionScreen
      brandName="World Cup Festival 688"
      currentDisplayName="အောင်ကျော်ဟိန်း"
      currentTeamCode="ARG"
      mode="change"
      onSelectionSaved={vi.fn()}
    />,
  );

  await screen.findByRole("button", { name: /Argentina/i });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(screen.getByPlaceholderText("Display name")).toHaveValue("အောင်ကျော်ဟိန်း");
});
```

In the existing conflict test, replace the direct submit sequence with:

```tsx
fireEvent.click(teamButton);
fireEvent.click(screen.getByRole("button", { name: "Continue" }));
fireEvent.change(screen.getByPlaceholderText("Display name"), {
  target: { value: "Seng" },
});
fireEvent.click(screen.getByRole("button", { name: "Save" }));
```

- [ ] **Step 2: Run the selection tests and verify failure**

Run:

```bash
npm run test --workspace web -- TeamSelectionScreen.test.tsx
```

Expected: FAIL because `currentDisplayName` and the dialog flow are not implemented.

- [ ] **Step 3: Add the current display name prop and dialog state**

In `apps/web/src/components/selection/TeamSelectionScreen.tsx`:

```tsx
import { DisplayNameDialog } from "./DisplayNameDialog";

type TeamSelectionScreenProps = {
  brandName: string;
  mode: "create" | "change";
  currentDisplayName?: string;
  currentTeamCode?: string;
  initialMessage?: string;
  onSelectionSaved: (value: ParticipantSession) => void;
};
```

Destructure `currentDisplayName = ""`, then add:

```tsx
const [showDisplayNameDialog, setShowDisplayNameDialog] = useState(false);
```

Change the sticky-bar button from direct submission to:

```tsx
onClick={() => {
  setErrorMessage("");
  setShowDisplayNameDialog(true);
}}
```

Rename `handleSubmit` to `handleDisplayNameConfirm` and accept the validated name:

```tsx
const handleDisplayNameConfirm = async (displayName: string) => {
  if (!selectedTeamCode) return;

  setSubmitting(true);
  setErrorMessage("");

  const payload = {
    deviceId: getOrCreateDeviceId(),
    displayName,
    teamCode: selectedTeamCode,
  };

  try {
    const response =
      mode === "change" ? await changeSelection(payload) : await createSelection(payload);
    setShowDisplayNameDialog(false);
    onSelectionSaved(response.participant);
  } catch (error) {
    const isConflict =
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code?: string }).code === "SELECTION_CONFLICT";

    if (isConflict) {
      setShowDisplayNameDialog(false);
      const latestTeams = await loadTeams();
      const selectedTeamStillAvailable = latestTeams.some(
        (team) =>
          team.code === selectedTeamCode &&
          (!team.isOwned || team.code === currentTeamCode),
      );

      if (!selectedTeamStillAvailable) {
        setSelectedTeamCode(null);
      }

      setErrorMessage(
        "That team was just taken by someone else. Please choose another team.",
      );
    } else {
      setErrorMessage("Unable to save your team selection right now.");
    }
  } finally {
    setSubmitting(false);
  }
};
```

Render the dialog immediately before `</main>`:

```tsx
<DisplayNameDialog
  initialValue={mode === "change" ? currentDisplayName : ""}
  open={showDisplayNameDialog}
  submitError={errorMessage}
  submitting={submitting}
  onCancel={() => setShowDisplayNameDialog(false)}
  onConfirm={handleDisplayNameConfirm}
/>
```

- [ ] **Step 4: Pass the participant name from App**

In `apps/web/src/App.tsx`, add:

```tsx
currentDisplayName={session.participant?.displayName}
```

to the existing `TeamSelectionScreen` element.

- [ ] **Step 5: Run the selection tests**

Run:

```bash
npm run test --workspace web -- TeamSelectionScreen.test.tsx
```

Expected: all selection tests PASS, including Burmese submission, cancel, prefill, and conflict recovery.

- [ ] **Step 6: Commit the selection flow**

```bash
git add apps/web/src/App.tsx apps/web/src/components/selection/TeamSelectionScreen.tsx apps/web/src/components/selection/TeamSelectionScreen.test.tsx
git diff --cached --check
git commit -m "feat: collect display name during team selection"
```

### Task 3: Show Participant Names in Resolved Knockout Slots

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Modify: `apps/web/src/components/layout/AppShell.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Add failing knockout owner-label tests**

Change the type import in `apps/web/src/components/home/KnockoutTab.test.tsx` to:

```tsx
import type { KnockoutRound, Team } from "../../lib/types";
```

Then add:

```tsx
const ownedTeams: Team[] = [
  {
    code: "ARG",
    name: "Argentina",
    group: "J",
    flag: "ARG",
    isOwned: true,
    ownedByName: "အောင်ကျော်သူ",
  },
];

test("shows an owner name beneath a resolved knockout team", () => {
  const resolvedRounds: KnockoutRound[] = [
    {
      round: "Round of 32",
      matches: [
        {
          id: "resolved-1",
          matchNumber: 73,
          homeTeam: "ARG",
          awayTeam: "Group B runner-up",
          homeScore: 0,
          awayScore: 0,
          kickoff: "Jun 28",
          venue: "Los Angeles Stadium",
        },
      ],
    },
  ];

  render(<KnockoutTab rounds={resolvedRounds} teams={ownedTeams} />);

  expect(screen.getAllByText("Argentina").length).toBeGreaterThan(0);
  expect(screen.getAllByText("အောင်ကျော်သူ").length).toBeGreaterThan(0);
});

test("does not attach an owner name to unresolved knockout placeholders", () => {
  render(<KnockoutTab rounds={rounds} teams={ownedTeams} />);

  expect(screen.queryByText("အောင်ကျော်သူ")).not.toBeInTheDocument();
});
```

Replace the two existing test renders with:

```tsx
render(<KnockoutTab rounds={rounds} teams={[]} />);
```

and:

```tsx
render(
  <div onTouchEnd={handleOuterTouchEnd}>
    <KnockoutTab rounds={rounds} teams={[]} />
  </div>,
);
```

- [ ] **Step 2: Run the knockout tests and verify prop/type failure**

Run:

```bash
npm run test --workspace web -- KnockoutTab.test.tsx
```

Expected: FAIL because `KnockoutTab` does not accept `teams`.

- [ ] **Step 3: Add concrete-team resolution**

In `apps/web/src/components/home/KnockoutTab.tsx`, import `Team` and add:

```tsx
type ResolvedKnockoutTeam = {
  label: string;
  ownerName?: string;
};

function resolveKnockoutTeam(value: string, teams: Team[]): ResolvedKnockoutTeam {
  const normalizedValue = value.trim().toLowerCase();
  const team = teams.find(
    (candidate) =>
      candidate.code.toLowerCase() === normalizedValue ||
      candidate.name.toLowerCase() === normalizedValue,
  );

  return {
    label: team?.name ?? value,
    ownerName: team?.ownedByName,
  };
}

function KnockoutTeamName({ value, teams }: { value: string; teams: Team[] }) {
  const resolved = resolveKnockoutTeam(value, teams);

  return (
    <span className="knockout-team-name">
      <strong>{resolved.label}</strong>
      {resolved.ownerName ? (
        <small className="knockout-owner-name">{resolved.ownerName}</small>
      ) : null}
    </span>
  );
}
```

Change `MatchCard` and `MobileBracketMatchCard` to receive `teams: Team[]` and replace each direct `<strong>{match.homeTeam}</strong>` / `<strong>{match.awayTeam}</strong>` with:

```tsx
<KnockoutTeamName value={match.homeTeam} teams={teams} />
<KnockoutTeamName value={match.awayTeam} teams={teams} />
```

Change the public component signature:

```tsx
export function KnockoutTab({
  rounds,
  teams,
}: {
  rounds: KnockoutRound[];
  teams: Team[];
}) {
```

Pass `teams` into every desktop and mobile match card.

- [ ] **Step 4: Pass ownership data from AppShell**

In `apps/web/src/components/layout/AppShell.tsx`, change:

```tsx
Knockout: <KnockoutTab rounds={knockout} teams={teams} />,
```

- [ ] **Step 5: Add desktop and mobile secondary-label styles**

Add near the knockout card styles in `apps/web/src/styles.css`:

```css
.knockout-team-name {
  display: grid;
  min-width: 0;
  gap: 3px;
  justify-items: center;
}

.knockout-team-name strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.knockout-owner-name {
  max-width: 100%;
  overflow: hidden;
  color: #9fb0c0;
  font-size: 0.64rem;
  font-weight: 500;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knockout-mobile-card-team .knockout-team-name {
  justify-items: start;
}

.knockout-mobile-card-team .knockout-owner-name {
  font-size: 0.7rem;
}
```

- [ ] **Step 6: Run knockout and shell tests**

Run:

```bash
npm run test --workspace web -- KnockoutTab.test.tsx AppShell.test.tsx
```

Expected: all knockout and shell tests PASS.

- [ ] **Step 7: Commit only feature-specific hunks**

`AppShell.tsx`, `KnockoutTab.test.tsx`, and `styles.css` already contain unrelated local work. Stage only the display-name hunks from those files.

```bash
git add apps/web/src/components/home/KnockoutTab.tsx
git add -p apps/web/src/components/home/KnockoutTab.test.tsx apps/web/src/components/layout/AppShell.tsx apps/web/src/styles.css
git diff --cached --check
git commit -m "feat: show participant names in knockout bracket"
```

### Task 4: Verify the Complete Feature

**Files:**
- Modify: `apps/api/src/routes/participant.test.ts`
- Verify: all files changed in Tasks 1-3

- [ ] **Step 1: Add an API contract test for duplicate multilingual names**

Append to `apps/api/src/routes/participant.test.ts`:

```ts
test("allows duplicate Burmese display names for different teams", async () => {
  const app = createServer();

  const first = await request(app).post("/api/participant/select").send({
    deviceId: "device-1",
    displayName: "  အောင်ကျော်သူ  ",
    teamCode: "ARG",
  });
  const second = await request(app).post("/api/participant/select").send({
    deviceId: "device-2",
    displayName: "အောင်ကျော်သူ",
    teamCode: "BRA",
  });

  expect(first.status).toBe(201);
  expect(first.body.participant.displayName).toBe("အောင်ကျော်သူ");
  expect(second.status).toBe(201);
  expect(second.body.participant.displayName).toBe("အောင်ကျော်သူ");
});
```

- [ ] **Step 2: Run the participant API contract tests**

Run:

```bash
npm run test --workspace api -- participant.test.ts
```

Expected: PASS. The database schema has unique constraints only for `device_id` and `team_code`, so duplicate `display_name` values remain allowed.

- [ ] **Step 3: Commit the API characterization test**

```bash
git add apps/api/src/routes/participant.test.ts
git diff --cached --check
git commit -m "test: cover duplicate multilingual display names"
```

- [ ] **Step 4: Run all frontend tests**

Run:

```bash
npm run test --workspace web
```

Expected: all frontend tests PASS.

- [ ] **Step 5: Run type checks and production builds**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 6: Verify the mobile flow in the in-app browser**

Start the API and network-hosted frontend:

```bash
npm run dev:api
npm run dev:host
```

Verify at desktop and mobile widths:

1. Select a team and press `Continue`.
2. Confirm the dialog input says `Display name`.
3. Enter `အောင်ကျော်သူ`, save, and confirm Home opens.
4. Open the three-dot menu, choose Change Team, and confirm the current Burmese name is prefilled.
5. Confirm resolved knockout teams show country first and participant name second.
6. Confirm unresolved placeholders show no participant name.
7. Confirm cards do not overflow at a narrow mobile viewport.

- [ ] **Step 7: Confirm the repository state**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: the four feature commits are present. Any pre-existing unrelated changes remain untouched and are reported separately.
