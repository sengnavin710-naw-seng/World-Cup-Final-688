import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { GroupStanding } from "../../lib/types";
import { TableTab } from "./TableTab";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";

const stats = {
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
};

const standings: GroupStanding[] = [
  {
    group: "A",
    rows: [
      {
        teamCode: "MEX",
        team: "Mexico",
        flag: "MEX",
        stats: {
          overall: stats,
          home: stats,
          away: stats,
        },
      },
    ],
  },
];

test("shows a display name beneath picked table teams", () => {
  render(
    <TableTab
      companyPicks={[
        {
          displayName: BURMESE_NAME,
          teamCode: "MEX",
          teamName: "Mexico",
          flag: "MEX",
        },
      ]}
      scopeMode="Overall"
      standings={standings}
      tableMode="Short"
    />,
  );

  expect(screen.getByText("Mexico")).toBeInTheDocument();
  expect(screen.getByText(BURMESE_NAME)).toBeInTheDocument();
  expect(screen.getByText(BURMESE_NAME)).toHaveClass("team-owner-name");
});

test("renders full standings in a responsive horizontal table", () => {
  const { container } = render(
    <TableTab
      companyPicks={[]}
      scopeMode="Overall"
      standings={standings}
      tableMode="Full"
    />,
  );

  expect(container.querySelector(".group-cards-grid")).toHaveClass("table-mode-full");
  expect(container.querySelector(".group-table-scroll")).toBeInTheDocument();
  expect(container.querySelector(".group-table-content")).toHaveClass("table-mode-full");
  expect(container.querySelector(".compact-table")).toHaveClass("table-mode-full");
});

test("keeps full table team names readable at small and large widths", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.group-table-scroll\s*\{[\s\S]*?overflow-x:\s*auto;/,
  );
  expect(applicationStyles).toMatch(
    /\.group-table-content\.table-mode-full\s*\{[\s\S]*?min-width:\s*560px;/,
  );
  expect(applicationStyles).toMatch(
    /\.table-team-name\s*\{[\s\S]*?white-space:\s*nowrap;/,
  );
  expect(applicationStyles).toMatch(
    /\.group-cards-grid\.table-mode-full\s*\{[\s\S]*?minmax\(560px,\s*1fr\)/,
  );
});

test("keeps horizontal table gestures from reaching the tab swipe handler", () => {
  const handleParentTouchStart = vi.fn();
  const handleParentTouchEnd = vi.fn();
  const { container } = render(
    <div onTouchEnd={handleParentTouchEnd} onTouchStart={handleParentTouchStart}>
      <TableTab
        companyPicks={[]}
        scopeMode="Overall"
        standings={standings}
        tableMode="Full"
      />
    </div>,
  );

  const tableScroll = container.querySelector(".group-table-scroll");
  expect(tableScroll).not.toBeNull();

  fireEvent.touchStart(tableScroll!);
  fireEvent.touchEnd(tableScroll!);

  expect(handleParentTouchStart).not.toHaveBeenCalled();
  expect(handleParentTouchEnd).not.toHaveBeenCalled();
});
