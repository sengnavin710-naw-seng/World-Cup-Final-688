import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type { Fixture } from "../../lib/types";
import { FixturesTab } from "./FixturesTab";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

const fixtures: Fixture[] = [
  {
    id: "match-1",
    matchNumber: 1,
    group: "A",
    round: "Group A",
    homeTeam: "MEX",
    homeTeamName: "Mexico",
    awayTeam: "ZAF",
    awayTeamName: "South Africa",
    homeFlag: "MEX",
    awayFlag: "ZAF",
    kickoff: "2026-06-11",
    venue: "Mexico City Stadium",
  },
  {
    id: "match-2",
    matchNumber: 2,
    group: "A",
    round: "Group A",
    homeTeam: "KOR",
    homeTeamName: "South Korea",
    awayTeam: "CZE",
    awayTeamName: "Czechia",
    homeFlag: "KOR",
    awayFlag: "CZE",
    kickoff: "2026-06-11",
    venue: "Estadio Guadalajara",
  },
  {
    id: "match-25",
    matchNumber: 25,
    group: "A",
    round: "Group A",
    homeTeam: "CZE",
    homeTeamName: "Czechia",
    awayTeam: "ZAF",
    awayTeamName: "South Africa",
    homeFlag: "CZE",
    awayFlag: "ZAF",
    kickoff: "2026-06-18",
    venue: "Atlanta Stadium",
  },
  {
    id: "match-3",
    matchNumber: 3,
    group: "B",
    round: "Group B",
    homeTeam: "CAN",
    homeTeamName: "Canada",
    awayTeam: "BIH",
    awayTeamName: "Bosnia and Herzegovina",
    homeFlag: "CAN",
    awayFlag: "BIH",
    kickoff: "2026-06-12",
    venue: "Toronto Stadium",
  },
];

function renderFixtures(participantTeamCode = "MEX") {
  return render(
    <FixturesTab
      companyPicks={[]}
      fixtures={fixtures}
      participantTeamCode={participantTeamCode}
    />,
  );
}

test("groups fixtures by kickoff date by default", () => {
  renderFixtures();

  expect(screen.getByText("Thursday, June 11")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Filter options" }));
  expect(screen.getByRole("menuitem", { name: "By Date" })).toHaveClass("active");
  expect(screen.getByText("Mexico")).toBeInTheDocument();
  expect(screen.getAllByText("South Africa").length).toBeGreaterThan(0);
  expect(screen.getByText("South Korea")).toBeInTheDocument();
  expect(screen.getAllByText("Czechia").length).toBeGreaterThan(0);
  expect(screen.getAllByText("01:30").length).toBeGreaterThan(0);
  expect(screen.getByText("08:30")).toBeInTheDocument();
  expect(screen.queryByText("vs")).not.toBeInTheDocument();
  expect(screen.queryByText("Mexico City Stadium")).not.toBeInTheDocument();
});

test("groups fixtures into group-stage rounds", () => {
  renderFixtures();

  fireEvent.click(screen.getByRole("button", { name: "Filter options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Round" }));

  expect(screen.getByText("Round 1")).toBeInTheDocument();
  expect(screen.getByText("Thu, Jun 11")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.getByText("Round 2")).toBeInTheDocument();
  expect(screen.getByText("Thu, Jun 18")).toBeInTheDocument();
});

test("uses a compact penalty status without losing its accessible meaning", () => {
  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[
        {
          ...fixtures[0],
          awayScore: 1,
          homeScore: 1,
          penaltyAwayScore: 4,
          penaltyHomeScore: 3,
          statusShort: "PEN",
        },
      ]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("Pens 3-4")).toBeInTheDocument();
  expect(
    screen.getByLabelText(
      "Mexico vs South Africa: 1 - 1, After Penalties, shootout 3 - 4",
    ),
  ).toBeInTheDocument();
});

test("uses a compact extra-time status without losing its accessible meaning", () => {
  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[
        {
          ...fixtures[0],
          awayScore: 1,
          homeScore: 2,
          statusShort: "AET",
        },
      ]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("AET")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Mexico vs South Africa: 2 - 1, After Extra Time"),
  ).toBeInTheDocument();
});

test("filters fixtures to the participant team", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "Filter options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "My Team" }));

  expect(screen.getByText("My Team")).toBeInTheDocument();
  expect(screen.getByText("Mexico")).toBeInTheDocument();
  expect(screen.queryByText("Canada")).not.toBeInTheDocument();
});

test("opens a group picker with Group A through Group L", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "Filter options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Group" }));

  for (const group of "ABCDEFGHIJKL") {
    expect(screen.getByRole("option", { name: `Group ${group}` })).toBeInTheDocument();
  }

  expect(screen.getByRole("option", { name: "Group A" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Mexico")).toBeInTheDocument();
  expect(screen.getAllByText("Czechia").length).toBeGreaterThan(0);
  expect(screen.queryByText("Canada")).not.toBeInTheDocument();
});

test("returns from the group picker to the fixture filter menu", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "Filter options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Group" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to filter options" }));

  expect(screen.getByRole("menuitem", { name: "By Date" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Round" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "My Team" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Group" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Group A" })).not.toBeInTheDocument();
});

test("filters fixtures to the selected group", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "Filter options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Group" }));
  fireEvent.click(screen.getByRole("option", { name: "Group B" }));

  expect(screen.getByText("Group B")).toBeInTheDocument();
  expect(screen.getByText("Canada")).toBeInTheDocument();
  expect(screen.getByText("Bosnia and Herzegovina")).toBeInTheDocument();
  expect(screen.queryByText("Mexico")).not.toBeInTheDocument();
});

test("shows a display name beneath picked fixture teams", () => {
  render(
    <FixturesTab
      companyPicks={[
        {
          displayName: BURMESE_NAME,
          teamCode: "MEX",
          teamName: "Mexico",
          flag: "MEX",
        },
      ]}
      fixtures={fixtures.slice(0, 1)}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText(BURMESE_NAME)).toBeInTheDocument();
  expect(screen.getByText(BURMESE_NAME)).toHaveClass("team-owner-name");
});

test("shows a real score and match status for completed API fixtures", () => {
  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[
        {
          ...fixtures[0],
          awayScore: 1,
          homeScore: 2,
          kickoff: "2026-06-11T19:00:00+00:00",
          statusElapsed: 90,
          statusLong: "Match Finished",
          statusShort: "FT",
        },
      ]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("2 - 1")).toBeInTheDocument();
  expect(screen.getByText("Full Time")).toBeInTheDocument();
  expect(screen.getByText("2 - 1").closest("time")).toHaveAttribute(
    "datetime",
    "2026-06-11T19:00:00+00:00",
  );
});

test("shows a ticking clock and announced stoppage time for a live API fixture", () => {
  vi.useFakeTimers();
  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[
        {
          ...fixtures[0],
          awayScore: 1,
          homeScore: 2,
          kickoff: "2026-06-11T19:00:00+00:00",
          statusElapsed: 67,
          statusExtra: 6,
          statusLong: "Second Half",
          statusShort: "2H",
        },
      ]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("2 - 1")).toBeInTheDocument();
  expect(screen.getByText("67:00 +6")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1_000));

  expect(screen.getByText("67:01 +6")).toBeInTheDocument();
  vi.useRealTimers();
});

test("shows Half Time without ticking while the match is paused", () => {
  vi.useFakeTimers();
  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[
        {
          ...fixtures[0],
          awayScore: 1,
          homeScore: 2,
          kickoff: "2026-06-11T19:00:00+00:00",
          statusElapsed: 45,
          statusLong: "Halftime",
          statusShort: "HT",
        },
      ]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("2 - 1")).toBeInTheDocument();
  expect(screen.getByText("Half Time")).toBeInTheDocument();
  expect(screen.queryByText("45:00")).not.toBeInTheDocument();

  act(() => vi.advanceTimersByTime(60_000));

  expect(screen.getByText("Half Time")).toBeInTheDocument();
  expect(screen.queryByText("46:00")).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("resyncs the live clock from the API elapsed minute after a page reload", () => {
  vi.useFakeTimers();
  const liveFixture: Fixture = {
    ...fixtures[0],
    awayScore: 1,
    homeScore: 2,
    kickoff: "2026-06-11T19:00:00+00:00",
    statusElapsed: 45,
    statusExtra: 6,
    statusLong: "First Half",
    statusShort: "1H",
  };
  const { unmount } = render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[liveFixture]}
      participantTeamCode="MEX"
    />,
  );

  act(() => vi.advanceTimersByTime(6_000));

  expect(screen.getByText("45:06 +6")).toBeInTheDocument();

  unmount();

  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[{ ...liveFixture }]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("45:00 +6")).toBeInTheDocument();
  expect(screen.queryByText("45:06 +6")).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("uses the latest API elapsed minute after a page reload", () => {
  vi.useFakeTimers();
  const liveFixture: Fixture = {
    ...fixtures[0],
    awayScore: 1,
    homeScore: 2,
    kickoff: "2026-06-11T19:00:00+00:00",
    statusElapsed: 45,
    statusExtra: 6,
    statusLong: "First Half",
    statusShort: "1H",
  };
  const { unmount } = render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[liveFixture]}
      participantTeamCode="MEX"
    />,
  );

  act(() => vi.advanceTimersByTime(6_000));
  expect(screen.getByText("45:06 +6")).toBeInTheDocument();

  unmount();
  act(() => vi.advanceTimersByTime(5_000));

  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[{ ...liveFixture, statusElapsed: 46 }]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("46:00 +6")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1_000));

  expect(screen.getByText("46:01 +6")).toBeInTheDocument();
  vi.useRealTimers();
});

test("starts from the new API minute when elapsed changes after reload", () => {
  vi.useFakeTimers();
  const liveFixture: Fixture = {
    ...fixtures[0],
    awayScore: 1,
    homeScore: 2,
    kickoff: "2026-06-11T19:00:00+00:00",
    statusElapsed: 45,
    statusExtra: 6,
    statusLong: "First Half",
    statusShort: "1H",
  };
  const { unmount } = render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[liveFixture]}
      participantTeamCode="MEX"
    />,
  );

  act(() => vi.advanceTimersByTime(6_000));
  expect(screen.getByText("45:06 +6")).toBeInTheDocument();
  unmount();

  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[{ ...liveFixture, statusElapsed: 46 }]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("46:00 +6")).toBeInTheDocument();
  expect(screen.queryByText("45:06 +6")).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("keeps ticking while waiting for the next API elapsed minute", () => {
  vi.useFakeTimers();
  render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[
        {
          ...fixtures[0],
          awayScore: 1,
          homeScore: 2,
          kickoff: "2026-06-11T19:00:00+00:00",
          statusElapsed: 45,
          statusExtra: 6,
          statusLong: "First Half",
          statusShort: "1H",
        },
      ]}
      participantTeamCode="MEX"
    />,
  );

  act(() => vi.advanceTimersByTime(70_000));

  expect(screen.getByText("46:10 +6")).toBeInTheDocument();
  expect(screen.queryByText("45:59 +6")).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("does not jump backward when the API elapsed minute catches up", () => {
  vi.useFakeTimers();
  const liveFixture: Fixture = {
    ...fixtures[0],
    awayScore: 1,
    homeScore: 2,
    kickoff: "2026-06-11T19:00:00+00:00",
    statusElapsed: 45,
    statusExtra: 6,
    statusLong: "First Half",
    statusShort: "1H",
  };
  const { rerender } = render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[liveFixture]}
      participantTeamCode="MEX"
    />,
  );

  act(() => vi.advanceTimersByTime(70_000));
  expect(screen.getByText("46:10 +6")).toBeInTheDocument();

  rerender(
    <FixturesTab
      companyPicks={[]}
      fixtures={[{ ...liveFixture, statusElapsed: 46 }]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("46:10 +6")).toBeInTheDocument();
  expect(screen.queryByText("46:00 +6")).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("shows the latest announced stoppage time from the API", () => {
  vi.useFakeTimers();
  const liveFixture: Fixture = {
    ...fixtures[0],
    awayScore: 1,
    homeScore: 2,
    kickoff: "2026-06-11T19:00:00+00:00",
    statusElapsed: 90,
    statusExtra: 6,
    statusLong: "Second Half",
    statusShort: "2H",
  };
  const { rerender } = render(
    <FixturesTab
      companyPicks={[]}
      fixtures={[liveFixture]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("90:00 +6")).toBeInTheDocument();

  rerender(
    <FixturesTab
      companyPicks={[]}
      fixtures={[{ ...liveFixture, statusExtra: 8 }]}
      participantTeamCode="MEX"
    />,
  );

  expect(screen.getByText("90:00 +8")).toBeInTheDocument();
  expect(screen.queryByText("90:00 +6")).not.toBeInTheDocument();
  vi.useRealTimers();
});
