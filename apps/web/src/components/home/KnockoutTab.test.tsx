import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  expect(screen.getByRole("tab", { name: "Final 2 games" })).toHaveAttribute(
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
