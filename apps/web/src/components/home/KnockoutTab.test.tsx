import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { KnockoutRound, Team } from "../../lib/types";
import { KnockoutTab } from "./KnockoutTab";

afterEach(() => vi.restoreAllMocks());

function installAnimationFrameClock() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    callbacks.delete(id);
  });
  const advance = (timestamp: number) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    act(() => pending.forEach((callback) => callback(timestamp)));
  };
  return {
    advance,
    finish() {
      advance(0);
      advance(90);
      advance(180);
      advance(181);
    },
  };
}

function makeMatch(
  matchNumber: number,
  prefix: string,
  slot: number,
  side?: "left" | "right" | "center",
): KnockoutRound["matches"][number] {
  return {
    id: `${prefix}-${slot}`,
    matchNumber,
    homeTeam: `${prefix} Home ${slot}`,
    awayTeam: `${prefix} Away ${slot}`,
    homeScore: 0,
    awayScore: 0,
    kickoff: "2026-06-30",
    venue: `${prefix} Stadium ${slot}`,
    side,
  };
}

const rounds: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: Array.from({ length: 16 }, (_, index) =>
      makeMatch(73 + index, "R32", index + 1, index < 8 ? "left" : "right"),
    ),
  },
  {
    round: "Round of 16",
    matches: Array.from({ length: 8 }, (_, index) =>
      makeMatch(89 + index, "R16", index + 1, index < 4 ? "left" : "right"),
    ),
  },
  {
    round: "Quarter-finals",
    matches: Array.from({ length: 4 }, (_, index) =>
      makeMatch(97 + index, "QF", index + 1, index < 2 ? "left" : "right"),
    ),
  },
  {
    round: "Semi-finals",
    matches: [makeMatch(101, "SF", 1, "left"), makeMatch(102, "SF", 2, "right")],
  },
  {
    round: "Finals",
    matches: [
      { ...makeMatch(104, "Final", 1, "center"), badge: "FINAL" },
      { ...makeMatch(103, "Bronze", 2, "center"), badge: "BRONZE-FINAL" },
    ],
  },
];

function getMobileElements() {
  const bracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = bracket.querySelector<HTMLElement>(".knockout-mobile-bracket-scroll");
  const viewport = bracket.querySelector<HTMLElement>(".knockout-mobile-bracket-viewport");
  const board = bracket.querySelector<HTMLElement>(".knockout-mobile-bracket-board");
  if (!scroller || !viewport || !board) throw new Error("Expected mobile bracket elements");
  return { board, scroller, viewport };
}

test("renders resolved owners and keeps unresolved placeholders plain", () => {
  const teams: Team[] = [
    { code: "ARG", name: "Argentina", group: "J", flag: "ARG", isOwned: true, ownedByName: "မင်း" },
  ];
  const ownerRounds: KnockoutRound[] = [{
    round: "Round of 32",
    matches: [{ ...makeMatch(73, "Owner", 1), homeTeam: "ARG", awayTeam: "Winner Match 1" }],
  }];
  render(<KnockoutTab rounds={ownerRounds} teams={teams} />);
  expect(screen.getAllByText("မင်း").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Winner Match 1").length).toBeGreaterThan(0);
});

test("shows finished scores and penalty detail", () => {
  const penaltyRounds: KnockoutRound[] = [{
    round: "Round of 32",
    matches: [{
      ...makeMatch(73, "Penalty", 1),
      homeTeam: "GER",
      awayTeam: "PAR",
      homeScore: 1,
      awayScore: 1,
      penaltyHomeScore: 3,
      penaltyAwayScore: 4,
      statusShort: "PEN",
      homeWinner: false,
      awayWinner: true,
    }],
  }];
  render(<KnockoutTab rounds={penaltyRounds} teams={[]} />);
  expect(screen.getAllByText("(3-4 pens)").length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(/1-1 \(3-4 pens\)/).length).toBeGreaterThan(0);
});

test.each([
  ["Round of 32", 0],
  ["Round of 16", 256],
  ["Quarter-finals", 512],
  ["Semi-finals", 768],
  ["Finals", 1024],
])("selects %s with logical transform while native scrollLeft stays zero", (name, offset) => {
  const clock = installAnimationFrameClock();
  render(<KnockoutTab rounds={rounds} teams={[]} />);
  const { board, scroller } = getMobileElements();
  fireEvent.click(screen.getByRole("tab", { name }));
  clock.finish();
  expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  expect(scroller.scrollLeft).toBe(0);
  expect(board.style.transform).toBe(`translate3d(-${offset}px, 0, 0)`);
});

test("moves the board with the finger and snaps one adjacent round", () => {
  const clock = installAnimationFrameClock();
  render(<KnockoutTab rounds={rounds} teams={[]} />);
  const { board, scroller } = getMobileElements();
  fireEvent.touchStart(scroller, { touches: [{ clientX: 220, clientY: 300 }] });
  fireEvent.touchMove(scroller, { touches: [{ clientX: 120, clientY: 302 }] });
  clock.advance(0);
  expect(board.style.transform).toBe("translate3d(-100px, 0, 0)");
  expect(scroller.scrollLeft).toBe(0);
  fireEvent.touchEnd(scroller, { changedTouches: [{ clientX: 120, clientY: 302 }] });
  clock.finish();
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute("aria-selected", "true");
  expect(board.style.transform).toBe("translate3d(-256px, 0, 0)");
  expect(scroller.scrollLeft).toBe(0);
});

test("keeps the selected horizontal anchor during vertical scrolling and rubber-band drift", () => {
  const clock = installAnimationFrameClock();
  render(<KnockoutTab rounds={rounds} teams={[]} />);
  const { board, scroller } = getMobileElements();
  let scrollLeft = 0;
  let scrollTop = 0;
  Object.defineProperties(scroller, {
    scrollLeft: { configurable: true, get: () => scrollLeft, set: (value) => { scrollLeft = Number(value); } },
    scrollTop: { configurable: true, get: () => scrollTop, set: (value) => { scrollTop = Number(value); } },
  });
  fireEvent.click(screen.getByRole("tab", { name: "Round of 16" }));
  clock.finish();
  fireEvent.touchStart(scroller, { touches: [{ clientX: 180, clientY: 520 }] });
  fireEvent.touchMove(scroller, { touches: [{ clientX: 176, clientY: 360 }] });
  scrollTop = 320;
  scrollLeft = 37;
  fireEvent.scroll(scroller);
  fireEvent.touchEnd(scroller, { changedTouches: [{ clientX: 176, clientY: 220 }] });
  expect(scrollLeft).toBe(0);
  expect(board.style.transform).toBe("translate3d(-256px, 0, 0)");
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute("aria-selected", "true");
});

test("uses a width-limited viewport so the vertical scroller has no horizontal board width", () => {
  render(<KnockoutTab rounds={rounds} teams={[]} />);
  const { viewport } = getMobileElements();
  expect(viewport.style.getPropertyValue("--knockout-mobile-board-height")).toMatch(/^\d+px$/);
  const styles = readFileSync("src/styles.css", "utf8");
  expect(styles).toMatch(/\.knockout-mobile-bracket-viewport\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*overflow:\s*hidden;/s);
  expect(styles).toMatch(/\.knockout-mobile-bracket-scroll\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/s);
});

test.each(["Round of 16", "Quarter-finals", "Semi-finals", "Finals"])(
  "restores %s after switching to overview and back",
  (name) => {
    const clock = installAnimationFrameClock();
    render(<KnockoutTab rounds={rounds} teams={[]} />);
    fireEvent.click(screen.getByRole("tab", { name }));
    clock.finish();
    fireEvent.click(screen.getByRole("button", { name: "Show full bracket overview" }));
    expect(screen.getByLabelText("World Cup knockout overview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show round detail" }));
    const { scroller } = getMobileElements();
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
    expect(scroller.scrollLeft).toBe(0);
  },
);

test("overview updates its score from current round props", () => {
  const { rerender } = render(<KnockoutTab rounds={rounds} teams={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Show full bracket overview" }));
  expect(screen.getByLabelText("World Cup knockout overview")).toBeInTheDocument();
  const updatedRounds = rounds.map((round) => round.round !== "Round of 16" ? round : {
    ...round,
    matches: round.matches.map((match, index) => index === 0 ? { ...match, homeScore: 2, awayScore: 1, statusShort: "FT" } : match),
  });
  rerender(<KnockoutTab rounds={updatedRounds} teams={[]} />);
  const overview = screen.getByLabelText("World Cup knockout overview");
  expect(overview).toHaveTextContent("2");
  expect(overview).toHaveTextContent("1");
});

test("renders future overview dates beside teams in rounded cards", () => {
  render(<KnockoutTab rounds={rounds} teams={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Show full bracket overview" }));
  const overview = screen.getByLabelText("World Cup knockout overview");
  const date = overview.querySelector("article time");
  expect(date).toHaveClass("knockout-overview-date-side");
  expect(date?.parentElement).toHaveClass("knockout-overview-card-body");
  const styles = readFileSync("src/styles.css", "utf8");
  expect(styles).toMatch(/\.knockout-overview-card\s*\{[^}]*border-radius:\s*14px;/s);
});

test("does not render the removed debug overlay or status filter", () => {
  render(<KnockoutTab rounds={rounds} teams={[]} />);
  expect(screen.queryByLabelText("Knockout scroll debug")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "As it stands" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirmed" })).not.toBeInTheDocument();
});
