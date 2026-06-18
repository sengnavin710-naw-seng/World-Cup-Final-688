import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { KnockoutRound, Team } from "../../lib/types";
import { KnockoutTab } from "./KnockoutTab";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";

const rounds: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: [
      {
        id: "r32-1",
        matchNumber: 73,
        homeTeam: "1A",
        awayTeam: "2B",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jun 28",
        venue: "Los Angeles Stadium",
      },
      {
        id: "r32-2",
        matchNumber: 74,
        homeTeam: "1C",
        awayTeam: "2D",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jun 29",
        venue: "Boston Stadium",
      },
    ],
  },
  {
    round: "Semi-finals",
    matches: [
      {
        id: "sf-1",
        matchNumber: 101,
        homeTeam: "W1",
        awayTeam: "W2",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 14",
        venue: "Dallas Stadium",
      },
      {
        id: "sf-2",
        matchNumber: 102,
        homeTeam: "W3",
        awayTeam: "W4",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 15",
        venue: "Atlanta Stadium",
      },
    ],
  },
  {
    round: "Finals",
    matches: [
      {
        id: "final",
        matchNumber: 104,
        homeTeam: "WS1",
        awayTeam: "WS2",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 19",
        venue: "New York New Jersey Stadium",
        badge: "FINAL",
      },
      {
        id: "bronze",
        matchNumber: 103,
        homeTeam: "LS1",
        awayTeam: "LS2",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 18",
        venue: "Miami Stadium",
        badge: "BRONZE-FINAL",
      },
    ],
  },
];

const ownedTeams: Team[] = [
  {
    code: "ARG",
    name: "Argentina",
    group: "J",
    flag: "ARG",
    isOwned: true,
    ownedByName: BURMESE_NAME,
  },
];

function makeTestMatch(
  matchNumber: number,
  roundPrefix: string,
  slot: number,
): KnockoutRound["matches"][number] {
  return {
    id: `${roundPrefix}-${slot}`,
    matchNumber,
    homeTeam: `${roundPrefix} Home ${slot}`,
    awayTeam: `${roundPrefix} Away ${slot}`,
    homeScore: 0,
    awayScore: 0,
    kickoff: "2026-06-30",
    venue: `${roundPrefix} Stadium ${slot}`,
  };
}

const fullMobileRounds: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: Array.from({ length: 16 }, (_, index) =>
      makeTestMatch(73 + index, "R32", index + 1),
    ),
  },
  {
    round: "Round of 16",
    matches: Array.from({ length: 8 }, (_, index) =>
      makeTestMatch(89 + index, "R16", index + 1),
    ),
  },
  {
    round: "Quarter-finals",
    matches: Array.from({ length: 4 }, (_, index) =>
      makeTestMatch(97 + index, "QF", index + 1),
    ),
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
  expect(screen.getAllByText(BURMESE_NAME).length).toBeGreaterThan(0);
});

test("does not attach an owner name to unresolved knockout placeholders", () => {
  render(<KnockoutTab rounds={rounds} teams={ownedTeams} />);

  expect(screen.queryByText(BURMESE_NAME)).not.toBeInTheDocument();
});

test("formats knockout ISO dates with a default kickoff time", () => {
  const isoDateRounds: KnockoutRound[] = [
    {
      round: "Round of 32",
      matches: [
        {
          id: "iso-1",
          matchNumber: 79,
          homeTeam: "1A",
          awayTeam: "3C/E/F/H/I",
          homeScore: 0,
          awayScore: 0,
          kickoff: "2026-06-30",
          venue: "Mexico City Stadium",
        },
      ],
    },
  ];

  render(<KnockoutTab rounds={isoDateRounds} teams={[]} />);

  expect(
    screen.getAllByText((_, element) => element?.textContent === "Tue, Jun 30\n03:00").length,
  ).toBeGreaterThan(0);
});

test("updates the selected mobile round when the bracket is scrolled", () => {
  render(<KnockoutTab rounds={rounds} teams={[]} />);

  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 786,
  });
  fireEvent.scroll(scroller!);

  expect(screen.getByRole("tab", { name: "Finals" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("keeps horizontal bracket gestures inside the knockout view", () => {
  const handleOuterTouchEnd = vi.fn();

  render(
    <div onTouchEnd={handleOuterTouchEnd}>
      <KnockoutTab rounds={rounds} teams={[]} />
    </div>,
  );

  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  fireEvent.touchEnd(scroller!);

  expect(handleOuterTouchEnd).not.toHaveBeenCalled();
});

test("keeps the last round of 32 card clear and renders all quarter-final cards", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const board = mobileBracket.querySelector(".knockout-mobile-bracket-board");
  const componentSource = readFileSync("src/components/home/KnockoutTab.tsx", "utf8");

  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1618px" });
  expect(
    mobileBracket.querySelectorAll(
      '.knockout-mobile-bracket-card[aria-label^="Quarter-finals:"]',
    ),
  ).toHaveLength(4);
  expect(componentSource).toMatch(/bottom:\s*82,/);
});

test("uses compact card sizing for the knockout bracket", () => {
  const componentSource = readFileSync("src/components/home/KnockoutTab.tsx", "utf8");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(componentSource).toMatch(/cardWidth:\s*240,/);
  expect(componentSource).toMatch(/cardHeight:\s*82,/);
  expect(componentSource).toMatch(/finalCardHeight:\s*100,/);
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-card\s*\{[^}]*width:\s*240px;[^}]*padding:\s*9px 10px;/,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-crest\s*\{[^}]*width:\s*17px;[^}]*height:\s*17px;[^}]*border-radius:\s*999px;/,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-card\s*\{[^}]*width:\s*86px;[^}]*height:\s*80px;/,
  );
});
