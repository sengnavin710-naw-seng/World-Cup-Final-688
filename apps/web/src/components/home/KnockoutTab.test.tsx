import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { KnockoutRound } from "../../lib/types";
import { KnockoutTab } from "./KnockoutTab";

const rounds: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: [
      {
        id: "r32-1",
        homeTeam: "1A",
        awayTeam: "2B",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jun 28",
      },
      {
        id: "r32-2",
        homeTeam: "1C",
        awayTeam: "2D",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jun 29",
      },
    ],
  },
  {
    round: "Semi-finals",
    matches: [
      {
        id: "sf-1",
        homeTeam: "W1",
        awayTeam: "W2",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 14",
      },
      {
        id: "sf-2",
        homeTeam: "W3",
        awayTeam: "W4",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 15",
      },
    ],
  },
  {
    round: "Finals",
    matches: [
      {
        id: "final",
        homeTeam: "WS1",
        awayTeam: "WS2",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 19",
        badge: "FINAL",
      },
      {
        id: "bronze",
        homeTeam: "LS1",
        awayTeam: "LS2",
        homeScore: 0,
        awayScore: 0,
        kickoff: "Jul 18",
        badge: "BRONZE-FINAL",
      },
    ],
  },
];

test("updates the selected mobile round when the bracket is scrolled", () => {
  render(<KnockoutTab rounds={rounds} />);

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
      <KnockoutTab rounds={rounds} />
    </div>,
  );

  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  fireEvent.touchEnd(scroller!);

  expect(handleOuterTouchEnd).not.toHaveBeenCalled();
});
