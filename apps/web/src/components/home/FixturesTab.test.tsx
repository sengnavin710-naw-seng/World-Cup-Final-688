import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Fixture } from "../../lib/types";
import { FixturesTab } from "./FixturesTab";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";

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

  expect(screen.getByRole("button", { name: "Date" })).toHaveClass("active");
  expect(screen.getByText("Thursday, June 11")).toBeInTheDocument();
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

  fireEvent.click(screen.getByRole("button", { name: "Round" }));

  expect(screen.getByText("Round 1")).toBeInTheDocument();
  expect(screen.getByText("Round 2")).toBeInTheDocument();
  expect(screen.getByText("Thu, Jun 11")).toBeInTheDocument();
  expect(screen.getByText("Thu, Jun 18")).toBeInTheDocument();
});

test("filters fixtures to the participant team", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "My Team" }));

  expect(screen.getByRole("heading", { name: "My Team" })).toBeInTheDocument();
  expect(screen.getByText("Mexico")).toBeInTheDocument();
  expect(screen.queryByText("Canada")).not.toBeInTheDocument();
});

test("opens a group picker with Group A through Group L", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "Group" }));

  for (const group of "ABCDEFGHIJKL") {
    expect(screen.getByRole("option", { name: `Group ${group}` })).toBeInTheDocument();
  }

  expect(screen.getByRole("heading", { name: "Group A" })).toBeInTheDocument();
  expect(screen.getByText("Mexico")).toBeInTheDocument();
  expect(screen.getAllByText("Czechia").length).toBeGreaterThan(0);
  expect(screen.queryByText("Canada")).not.toBeInTheDocument();
});

test("filters fixtures to the selected group", () => {
  renderFixtures("MEX");

  fireEvent.click(screen.getByRole("button", { name: "Group" }));
  fireEvent.click(screen.getByRole("option", { name: "Group B" }));

  expect(screen.getByRole("heading", { name: "Group B" })).toBeInTheDocument();
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
