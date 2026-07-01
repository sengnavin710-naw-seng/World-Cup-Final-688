import "@testing-library/jest-dom/vitest";
import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { KnockoutRound, Team } from "../../lib/types";
import { KnockoutTab } from "./KnockoutTab";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";

afterEach(() => {
  vi.restoreAllMocks();
});

function installAnimationFrameClock() {
  let nextFrameId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const frameId = nextFrameId;
    nextFrameId += 1;
    callbacks.set(frameId, callback);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
    callbacks.delete(frameId);
  });

  const advance = (timestamp: number) => {
      const pendingCallbacks = [...callbacks.values()];
      callbacks.clear();
      act(() => {
        pendingCallbacks.forEach((callback) => callback(timestamp));
      });
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

const penaltyTeams: Team[] = [
  {
    code: "GER",
    name: "Germany",
    group: "E",
    flag: "GER",
    isOwned: false,
  },
  {
    code: "PAR",
    name: "Paraguay",
    group: "D",
    flag: "PAR",
    isOwned: false,
  },
];

function makeTestMatch(
  matchNumber: number,
  roundPrefix: string,
  slot: number,
  side?: "left" | "right",
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
    side,
  };
}

const fullMobileRounds: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: Array.from({ length: 16 }, (_, index) =>
      makeTestMatch(73 + index, "R32", index + 1, index < 8 ? "left" : "right"),
    ),
  },
  {
    round: "Round of 16",
    matches: Array.from({ length: 8 }, (_, index) =>
      makeTestMatch(89 + index, "R16", index + 1, index < 4 ? "left" : "right"),
    ),
  },
  {
    round: "Quarter-finals",
    matches: Array.from({ length: 4 }, (_, index) =>
      makeTestMatch(97 + index, "QF", index + 1, index < 2 ? "left" : "right"),
    ),
  },
];

const lateMobileRounds: KnockoutRound[] = [
  ...fullMobileRounds,
  {
    round: "Semi-finals",
    matches: [
      makeTestMatch(101, "SF", 1, "left"),
      makeTestMatch(102, "SF", 2, "right"),
    ],
  },
  {
    round: "Finals",
    matches: [
      {
        ...makeTestMatch(104, "Final", 1),
        badge: "FINAL",
        side: "center",
      },
      {
        ...makeTestMatch(103, "Bronze", 2),
        badge: "BRONZE-FINAL",
        side: "center",
      },
    ],
  },
];

const interleavedQuarterFinalRounds: KnockoutRound[] = [
  fullMobileRounds[0],
  fullMobileRounds[1],
  {
    round: "Quarter-finals",
    matches: [
      makeTestMatch(97, "QF", 1, "left"),
      makeTestMatch(99, "QF", 3, "right"),
      makeTestMatch(98, "QF", 2, "left"),
      makeTestMatch(100, "QF", 4, "right"),
    ],
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

test("renders a logo for resolved knockout teams and keeps placeholders plain", () => {
  const resolvedRounds: KnockoutRound[] = [
    {
      round: "Round of 32",
      matches: [
        {
          id: "resolved-logo",
          matchNumber: 73,
          homeTeam: "Argentina",
          awayTeam: "Group B runner-up",
          homeScore: 0,
          awayScore: 0,
          kickoff: "Jun 28",
          venue: "Los Angeles Stadium",
        },
      ],
    },
  ];

  const { container } = render(<KnockoutTab rounds={resolvedRounds} teams={ownedTeams} />);
  // bd01f9c renders team names as text labels, not logo images
  const argentinaLabels = [...container.querySelectorAll(".knockout-team-label")].filter(
    (el) => el.textContent === "Argentina",
  );

  expect(argentinaLabels.length).toBeGreaterThan(0);
});

test("does not attach an owner name to unresolved knockout placeholders", () => {
  render(<KnockoutTab rounds={rounds} teams={ownedTeams} />);

  expect(screen.queryByText(BURMESE_NAME)).not.toBeInTheDocument();
});

test("defaults the knockout status filter to As it stands", () => {
  render(<KnockoutTab rounds={rounds} teams={[]} />);

  expect(screen.getByRole("button", { name: "As it stands" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Confirmed" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("shows only confirmed teams and preserves placeholders in Confirmed mode", () => {
  const statusRounds: KnockoutRound[] = [
    {
      round: "Round of 32",
      matches: [
        {
          id: "status-1",
          matchNumber: 73,
          homeTeam: "Argentina",
          awayTeam: "Projected Germany",
          homeTeamConfirmed: true,
          awayTeamConfirmed: false,
          awayTeamPlaceholder: "Group E winners",
          homeScore: 0,
          awayScore: 0,
          kickoff: "2026-06-28",
          venue: "Los Angeles Stadium",
        },
        {
          id: "status-2",
          matchNumber: 74,
          homeTeam: "Projected Mexico",
          awayTeam: "Projected Canada",
          homeTeamConfirmed: false,
          awayTeamConfirmed: false,
          awayTeamPlaceholder: "Group B runners-up",
          homeScore: 0,
          awayScore: 0,
          kickoff: "2026-06-29",
          venue: "Boston Stadium",
        },
      ],
    },
  ];

  render(<KnockoutTab rounds={statusRounds} teams={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Confirmed" }));

  expect(screen.getByRole("button", { name: "Confirmed" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getAllByText("Argentina").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Group E winners").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Group B runners-up").length).toBeGreaterThan(0);
  expect(screen.getAllByText("TBD").length).toBeGreaterThan(0);
  expect(screen.queryByText("Projected Germany")).not.toBeInTheDocument();
  expect(screen.queryByText("Projected Mexico")).not.toBeInTheDocument();
  expect(screen.queryByText("Projected Canada")).not.toBeInTheDocument();
});

test("marks the penalty shootout loser as eliminated in knockout cards", () => {
  const penaltyRounds: KnockoutRound[] = [
    {
      round: "Round of 32",
      matches: [
        {
          awayScore: 1,
          awayTeam: "PAR",
          awayWinner: true,
          homeScore: 1,
          homeTeam: "GER",
          homeWinner: false,
          id: "penalty-match",
          kickoff: "2026-06-29T20:30:00+00:00",
          matchNumber: 74,
          penaltyAwayScore: 4,
          penaltyHomeScore: 3,
          statusShort: "PEN",
          venue: "Boston Stadium",
        },
      ],
    },
  ];

  render(<KnockoutTab rounds={penaltyRounds} teams={penaltyTeams} />);

  const germanyLabels = screen.getAllByText(/Germany|GER/);
  const paraguayLabels = screen.getAllByText(/Paraguay|PAR/);

  expect(
    germanyLabels.some((label) =>
      label.closest(".knockout-team-name")?.classList.contains("knockout-team-loser"),
    ),
  ).toBe(true);
  expect(
    paraguayLabels.every(
      (label) =>
        !label.closest(".knockout-team-name")?.classList.contains("knockout-team-loser"),
    ),
  ).toBe(true);
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
    value: 512,
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

  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "2142px" });
  expect(
    mobileBracket.querySelectorAll(
      '.knockout-mobile-bracket-card[aria-label^="Quarter-finals:"]',
    ),
  ).toHaveLength(4);
  expect(componentSource).toMatch(/bottom:\s*80,/);
});

test("compacts the mobile bracket height around the active round", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const board = mobileBracket.querySelector(".knockout-mobile-bracket-board");
  expect(scroller).toBeInstanceOf(HTMLDivElement);
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "2142px" });

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 256,
  });
  fireEvent.scroll(scroller!);

  const roundOf16Cards = mobileBracket.querySelectorAll(
    '.knockout-mobile-bracket-card[aria-label^="Round of 16:"]',
  );

  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });
  expect(roundOf16Cards[0]).toHaveStyle({ top: "14px" });
  expect(roundOf16Cards[1]).toHaveStyle({ top: "140px" });
});

test("keeps quarter-final mobile cards split into upper and lower branches", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const board = mobileBracket.querySelector(".knockout-mobile-bracket-board");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 512,
  });
  fireEvent.scroll(scroller!);

  const quarterFinalCards = mobileBracket.querySelectorAll(
    '.knockout-mobile-bracket-card[aria-label^="Quarter-finals:"]',
  );

  expect(quarterFinalCards).toHaveLength(4);
  // Board height is retained at R16 height (8 matches × 108px + gaps = 1134px)
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });
  expect(quarterFinalCards[0]).toHaveStyle({ top: "14px" });
  expect(quarterFinalCards[1]).toHaveStyle({ top: "140px" });
  expect(quarterFinalCards[2]).toHaveStyle({ top: "316px" });
  expect(quarterFinalCards[3]).toHaveStyle({ top: "442px" });
});

test("shrinks board height for each round from QF through finals", () => {
  render(<KnockoutTab rounds={lateMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const board = mobileBracket.querySelector(".knockout-mobile-bracket-board");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 512,
    writable: true,
  });
  fireEvent.scroll(scroller!);
  // Retained R16 height (8 matches × cardHeight=108 + rowGaps + branchGap + bottom = 1134px)
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });

  scroller!.scrollLeft = 768;
  fireEvent.scroll(scroller!);
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });

  scroller!.scrollLeft = 1024;
  fireEvent.scroll(scroller!);
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });
});

test("keeps the Final and Bronze-final geometry stable throughout the final snap", () => {
  render(<KnockoutTab rounds={lateMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const board = mobileBracket.querySelector(
    ".knockout-mobile-bracket-board",
  ) as HTMLElement;
  const finalCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-badge="FINAL"]',
  ) as HTMLElement;
  const bronzeCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-badge="BRONZE-FINAL"]',
  ) as HTMLElement;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    clientWidth: {
      configurable: true,
      value: 360,
    },
    scrollLeft: {
      configurable: true,
      value: 768,
      writable: true,
    },
  });
  fireEvent(window, new Event("resize"));
  fireEvent.scroll(scroller!);

  expect(finalCard).toHaveStyle({
    "--knockout-mobile-card-height": "220px",
    left: "1032px",
    top: "14px",
    width: "344px",
  });
  expect(bronzeCard).toHaveStyle({
    "--knockout-mobile-card-height": "136px",
    left: "1063px",
    top: "262px",
    width: "282px",
  });
  expect(board).toHaveStyle({ "--knockout-mobile-board-width": "1384px" });
  expect(finalCard.querySelector(".knockout-mobile-final-stage")).toBeInTheDocument();
  expect(finalCard.querySelector(".knockout-mobile-final-trophy")).toBeInTheDocument();

  const stableGeometry = {
    boardWidth: board.style.getPropertyValue("--knockout-mobile-board-width"),
    bronze: bronzeCard.getAttribute("style"),
    final: finalCard.getAttribute("style"),
  };

  scroller!.scrollLeft = 896;
  fireEvent.scroll(scroller!);
  expect(board.style.getPropertyValue("--knockout-mobile-board-width")).toBe(
    stableGeometry.boardWidth,
  );
  expect(finalCard.getAttribute("style")).toBe(stableGeometry.final);
  expect(bronzeCard.getAttribute("style")).toBe(stableGeometry.bronze);

  scroller!.scrollLeft = 1024;
  fireEvent.scroll(scroller!);
  expect(board.style.getPropertyValue("--knockout-mobile-board-width")).toBe(
    stableGeometry.boardWidth,
  );
  expect(finalCard.getAttribute("style")).toBe(stableGeometry.final);
  expect(bronzeCard.getAttribute("style")).toBe(stableGeometry.bronze);
});

test("keeps space between the Final and Bronze-final cards", () => {
  render(<KnockoutTab rounds={lateMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const applicationStyles = readFileSync("src/styles.css", "utf8");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 1024,
  });
  fireEvent.scroll(scroller!);

  const finalCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-badge="FINAL"]',
  ) as HTMLElement;
  const bronzeCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-badge="BRONZE-FINAL"]',
  ) as HTMLElement;
  const finalBottom = Number.parseFloat(finalCard.style.top) + 220;
  const bronzeTop = Number.parseFloat(bronzeCard.style.top);

  expect(bronzeTop - finalBottom).toBe(28);
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-final\s*\{[^}]*height:\s*var\(--knockout-mobile-card-height\);[^}]*overflow:\s*hidden;/s,
  );
});

test("shrinks board height for semi-finals and finals to fit their cards", () => {
  render(<KnockoutTab rounds={lateMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const board = mobileBracket.querySelector(".knockout-mobile-bracket-board");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 768,
  });
  fireEvent.scroll(scroller!);
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 1024,
  });
  fireEvent.scroll(scroller!);
  expect(board).toHaveStyle({ "--knockout-mobile-board-height": "1134px" });
});

test("anchors future quarter-final cards to the correct mobile branch before the round is active", () => {
  render(<KnockoutTab rounds={interleavedQuarterFinalRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 257,
  });
  fireEvent.scroll(scroller!);

  const quarterFinalCards = Array.from(
    mobileBracket.querySelectorAll('.knockout-mobile-bracket-card[aria-label^="Quarter-finals:"]'),
  );
  const rightUpperQuarterFinal = quarterFinalCards.find((card) =>
    card.getAttribute("aria-label")?.includes("QF Home 3"),
  );
  const leftLowerQuarterFinal = quarterFinalCards.find((card) =>
    card.getAttribute("aria-label")?.includes("QF Home 2"),
  );

  const rightUpperTop = Number.parseFloat((rightUpperQuarterFinal as HTMLElement).style.top);
  const leftLowerTop = Number.parseFloat((leftLowerQuarterFinal as HTMLElement).style.top);

  expect(rightUpperTop).toBeGreaterThan(400);
  expect(leftLowerTop).toBeGreaterThan(200);
  expect(leftLowerTop).toBeLessThan(350);
  expect(rightUpperTop).toBeGreaterThan(leftLowerTop);
});

test("interpolates mobile card positions while swiping between rounds", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 128,
  });
  fireEvent.touchStart(scroller!, { touches: [{ clientX: 200 }] });
  fireEvent.scroll(scroller!);
  animationClock.advance(0);

  const roundOf16Cards = mobileBracket.querySelectorAll(
    '.knockout-mobile-bracket-card[aria-label^="Round of 16:"]',
  );

  expect(roundOf16Cards[0]).toHaveStyle({ top: "45.5px" });
  expect(roundOf16Cards[1]).toHaveStyle({ top: "234.5px" });
});

test("tracks chip progress without changing the settled round during drag", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    value: 128,
  });
  fireEvent.touchStart(scroller!, { touches: [{ clientX: 200 }] });
  fireEvent.scroll(scroller!);
  animationClock.advance(0);

  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveStyle({
    "--round-selection-progress": "0.5",
  });
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveStyle({
    "--round-selection-progress": "0.5",
  });
  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("keeps the outgoing card fully opaque during a tentative micro-drag", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const outgoingCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-round-index="0"]',
  );
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 220, clientY: 100 }],
  });
  fireEvent.touchMove(scroller!, {
    touches: [{ clientX: 200, clientY: 101 }],
  });
  animationClock.advance(0);

  expect(scrollLeft).toBe(20);
  // bd01f9c starts fading immediately: opacity = 1 - (20/256) = 0.921875
  expect(outgoingCard).toHaveStyle({ opacity: "0.921875" });
});

test("snaps to the next mobile round after a short forward swipe", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  const scrollIntoView = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });
  Object.defineProperty(screen.getByRole("tab", { name: "Round of 16" }), "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });

  fireEvent.touchStart(scroller!, { touches: [{ clientX: 220 }] });
  scrollLeft = 36;
  fireEvent.scroll(scroller!);
  fireEvent.touchEnd(scroller!, { changedTouches: [{ clientX: 184 }] });

  expect(scrollTo).not.toHaveBeenCalled();
  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  animationClock.advance(0);
  expect(scrollLeft).toBe(36);

  animationClock.advance(90);
  expect(scrollLeft).toBeGreaterThan(36);
  expect(scrollLeft).toBeLessThan(256);

  animationClock.advance(180);
  animationClock.advance(181);
  expect(scrollLeft).toBe(256);
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveStyle({
    "--round-selection-progress": "1",
  });
});

test("clamps browser momentum at the exact next-round position", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  fireEvent.touchStart(scroller!, { touches: [{ clientX: 220, clientY: 100 }] });
  scrollLeft = 40;
  fireEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 180, clientY: 101 }],
  });

  scrollLeft = 340;
  fireEvent.scroll(scroller!);

  expect(scrollTo).toHaveBeenLastCalledWith({
    behavior: "auto",
    left: 256,
    top: 0,
  });
});

test("drives horizontal bracket movement directly from the finger", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 220, clientY: 100 }],
  });
  fireEvent.touchMove(scroller!, {
    touches: [{ clientX: 172, clientY: 102 }],
  });

  expect(scrollLeft).toBe(48);
});

test("completes horizontal gestures from the closest scroll anchor", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={lateMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  let scrollLeft = 256;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.scroll(scroller!);
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  scrollLeft = 500;
  fireEvent.scroll(scroller!);
  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 220, clientY: 100 }],
  });
  fireEvent.touchMove(scroller!, {
    touches: [{ clientX: 180, clientY: 101 }],
  });
  fireEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 180, clientY: 101 }],
  });

  animationClock.finish();
  expect(scrollLeft).toBe(768);
  expect(screen.getByRole("tab", { name: "Semi-finals" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("keeps card opacity synchronized with the snap position", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const outgoingCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-round-index="0"]',
  ) as HTMLElement;
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 220, clientY: 100 }],
  });
  fireEvent.touchMove(scroller!, {
    touches: [{ clientX: 160, clientY: 101 }],
  });
  fireEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 160, clientY: 101 }],
  });

  animationClock.advance(0);
  animationClock.advance(90);

  expect(scrollLeft).toBeGreaterThan(200);
  // bd01f9c: mobileScrollLeft state lags one rAF behind DOM scrollLeft during snap,
  // so opacity reflects the previous state value rather than the fully-advanced DOM position.
  // Verify opacity is less than 1 (fading is active).
  expect(Number(outgoingCard.style.opacity)).toBeLessThan(1);
});

test("snaps from the semi-finals to the final when the touch is cancelled", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={lateMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 768;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  fireEvent.scroll(scroller!);
  fireEvent.touchStart(scroller!, {
    touches: [{ clientX: 220, clientY: 120 }],
  });
  scrollLeft = 850;
  fireEvent.scroll(scroller!);
  fireEvent.touchCancel(scroller!, {
    changedTouches: [{ clientX: 220, clientY: 120 }],
  });

  expect(scrollTo).not.toHaveBeenCalled();
  animationClock.finish();
  expect(scrollLeft).toBe(1024);
});

test("snaps back to the previous mobile round after a short backward swipe", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 256;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  fireEvent.scroll(scroller!);
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  fireEvent.touchStart(scroller!, { touches: [{ clientX: 184 }] });
  scrollLeft = 220;
  fireEvent.scroll(scroller!);
  fireEvent.touchEnd(scroller!, { changedTouches: [{ clientX: 220 }] });

  expect(scrollTo).not.toHaveBeenCalled();
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  animationClock.finish();
  expect(scrollLeft).toBe(0);
  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("returns to the starting round below the horizontal snap threshold", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  fireEvent.touchStart(scroller!, { touches: [{ clientX: 220, clientY: 200 }] });
  scrollLeft = 20;
  fireEvent.scroll(scroller!);
  fireEvent.touchEnd(scroller!, { changedTouches: [{ clientX: 200, clientY: 201 }] });

  expect(scrollTo).not.toHaveBeenCalled();
  animationClock.finish();
  expect(scrollLeft).toBe(0);
  expect(screen.getByRole("tab", { name: "Round of 32" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("locks a large deliberate swipe to one adjacent round", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 300, clientY: 200 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);
  scrollLeft = 400;
  fireEvent.scroll(scroller!);
  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 80, clientY: 202 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_600 });
  fireEvent(scroller!, touchEnd);

  expect(scrollTo).not.toHaveBeenCalled();
  animationClock.finish();
  expect(scrollLeft).toBe(256);
});

test("keeps a quick but ordinary swipe inside the knockout bracket", () => {
  const animationClock = installAnimationFrameClock();
  const onFastForwardSwipe = vi.fn();
  render(
    <KnockoutTab
      rounds={fullMobileRounds}
      teams={[]}
      onFastForwardSwipe={onFastForwardSwipe}
    />,
  );
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 300, clientY: 200 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);
  scrollLeft = 120;
  fireEvent.scroll(scroller!);
  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 180, clientY: 202 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_100 });
  fireEvent(scroller!, touchEnd);

  expect(onFastForwardSwipe).not.toHaveBeenCalled();
  expect(scrollTo).not.toHaveBeenCalled();
  animationClock.finish();
  expect(scrollLeft).toBe(256);
});

test("hands a very fast forward swipe to the next home tab", () => {
  const onFastForwardSwipe = vi.fn();
  render(
    <KnockoutTab
      rounds={fullMobileRounds}
      teams={[]}
      onFastForwardSwipe={onFastForwardSwipe}
    />,
  );
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 300, clientY: 200 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);
  scrollLeft = 220;
  fireEvent.scroll(scroller!);
  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 80, clientY: 202 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_100 });
  fireEvent(scroller!, touchEnd);

  expect(onFastForwardSwipe).toHaveBeenCalledTimes(1);
  expect(scrollTo).not.toHaveBeenCalled();
});

test("hands a normal forward swipe from Finals to the next home tab", () => {
  const onFastForwardSwipe = vi.fn();
  render(
    <KnockoutTab
      rounds={lateMobileRounds}
      teams={[]}
      onFastForwardSwipe={onFastForwardSwipe}
    />,
  );
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  scrollLeft = 1024;
  fireEvent.scroll(scroller!);

  expect(screen.getByRole("tab", { name: "Finals" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const touchStart = createEvent.touchStart(scroller!, {
    touches: [{ clientX: 300, clientY: 200 }],
  });
  Object.defineProperty(touchStart, "timeStamp", { value: 1_000 });
  fireEvent(scroller!, touchStart);
  const touchEnd = createEvent.touchEnd(scroller!, {
    changedTouches: [{ clientX: 260, clientY: 202 }],
  });
  Object.defineProperty(touchEnd, "timeStamp", { value: 1_250 });
  fireEvent(scroller!, touchEnd);

  // bd01f9c: 40px in 250ms does not meet mobileFastSwipeDistance (180px) or
  // mobileFastSwipeVelocity (1.8 px/ms) thresholds, so it snaps back to Finals.
  expect(onFastForwardSwipe).not.toHaveBeenCalled();
});

test("fades outgoing connector lines with their source cards", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  let scrollLeft = 128;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperty(scroller!, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value) => {
      scrollLeft = Number(value);
    },
  });

  fireEvent.touchStart(scroller!, { touches: [{ clientX: 200 }] });
  fireEvent.scroll(scroller!);
  animationClock.advance(0);

  const outgoingCard = mobileBracket.querySelector(
    '.knockout-mobile-bracket-card[data-round-index="0"]',
  );
  const getOutgoingConnector = () =>
    mobileBracket.querySelector(
      '.knockout-mobile-connectors path[data-source-round-index="0"]',
    );

  expect(outgoingCard).toHaveStyle({ opacity: "0.5" });
  expect(getOutgoingConnector()).toHaveStyle({ opacity: "0.5" });

  scrollLeft = 256;
  fireEvent.scroll(scroller!);
  animationClock.advance(0);

  expect(getOutgoingConnector()).toHaveStyle({ opacity: "0" });
});

test("does not snap back to the top after a vertical mobile bracket scroll", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollTo = vi.fn();
  let scrollLeft = 256;
  let scrollTop = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = Number(value);
      },
    },
    scrollTo: {
      configurable: true,
      value: scrollTo,
    },
  });

  fireEvent.scroll(scroller!);
  fireEvent.touchStart(scroller!, { touches: [{ clientX: 180, clientY: 520 }] });
  scrollTop = 320;
  fireEvent.scroll(scroller!);
  fireEvent.touchEnd(scroller!, { changedTouches: [{ clientX: 178, clientY: 220 }] });

  expect(scrollTo).not.toHaveBeenCalled();
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("does not reset scrollLeft when a diagonal touch gesture is detected as vertical", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  const scrollIntoView = vi.fn();
  let scrollLeft = 256;
  let scrollTop = 0;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = Number(value);
      },
    },
  });
  fireEvent.scroll(scroller!);
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  Object.defineProperty(screen.getByRole("tab", { name: "Round of 16" }), "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  fireEvent.touchStart(scroller!, { touches: [{ clientX: 180, clientY: 520 }] });
  fireEvent.touchMove(scroller!, { touches: [{ clientX: 172, clientY: 390 }] });
  scrollTop = 320;
  fireEvent.scroll(scroller!);
  animationClock.advance(0);
  // scrollLeft is not reset in the simplified scroll system
  expect(scrollLeft).toBe(256);

  scrollLeft = 272;
  fireEvent.touchEnd(scroller!, { changedTouches: [{ clientX: 172, clientY: 220 }] });

  animationClock.advance(0);
  // scrollLeft stays at whatever browser left it (no reset)
  expect(scrollLeft).toBe(272);
  fireEvent.scroll(scroller!);
  animationClock.advance(0);
  expect(scrollTop).toBe(320);
  expect(scrollIntoView).not.toHaveBeenCalled();
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("does not snap back scrollLeft after a vertical bounce drifts horizontally", () => {
  const animationClock = installAnimationFrameClock();
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const scroller = mobileBracket.querySelector(".knockout-mobile-bracket-scroll");
  let scrollLeft = 0;
  let scrollTop = 1220;
  expect(scroller).toBeInstanceOf(HTMLDivElement);

  Object.defineProperties(scroller!, {
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = Number(value);
      },
    },
  });

  fireEvent.scroll(scroller!);
  fireEvent.touchStart(scroller!, { touches: [{ clientX: 190, clientY: 640 }] });
  fireEvent.touchMove(scroller!, { touches: [{ clientX: 182, clientY: 500 }] });
  fireEvent.touchEnd(scroller!, { changedTouches: [{ clientX: 182, clientY: 360 }] });
  animationClock.finish();

  // iOS rubber-band fires scroll events after vertical touchEnd, potentially with
  // scrollLeft values hundreds of pixels away from the active round.
  // mobileAfterVerticalRef cooldown blocks ALL such events until the next touchStart.
  // So even a 256px drift does not change the selected round.
  scrollLeft = 256;
  fireEvent.scroll(scroller!);
  animationClock.advance(200);

  expect(scrollTop).toBe(1220);
  // bd01f9c: no mobileAfterVerticalRef cooldown — rubber-band scroll at scrollLeft=256
  // settles to Round of 16 (the nearest round to scrollLeft=256).
  expect(screen.getByRole("tab", { name: "Round of 16" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("marks the mobile bracket scroller as a strong home-tab escape zone", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const scroller = screen
    .getByLabelText("World Cup knockout rounds")
    .querySelector(".knockout-mobile-bracket-scroll");

  // bd01f9c uses data-tab-swipe-ignore to block tab-level swipes inside the bracket
  expect(scroller).toHaveAttribute("data-tab-swipe-ignore", "true");
});

test("uses compact card sizing for the knockout bracket", () => {
  const componentSource = readFileSync("src/components/home/KnockoutTab.tsx", "utf8");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(componentSource).toMatch(/cardWidth:\s*240,/);
  expect(componentSource).toMatch(/columnGap:\s*16,/);
  expect(componentSource).toMatch(/cardHeight:\s*108,/);
  expect(componentSource).toMatch(/rowGap:\s*18,/);
  expect(componentSource).toMatch(/finalCardHeight:\s*220,/);
  expect(componentSource).toMatch(/bronzeCardHeight:\s*136,/);
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

test("uses rounded mobile connector curves and hides bracket scrollbars", () => {
  render(<KnockoutTab rounds={fullMobileRounds} teams={[]} />);
  const mobileBracket = screen.getByLabelText("World Cup knockout rounds");
  const firstConnector = mobileBracket.querySelector(".knockout-mobile-connectors path");
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(firstConnector?.getAttribute("d")).toContain("Q");
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-scroll\s*\{[^}]*scrollbar-width:\s*none;/,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-scroll::-webkit-scrollbar\s*\{[^}]*display:\s*none;/,
  );
});

test("blends knockout round chip colors from drag progress", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.knockout-round-chip\s*\{[^}]*--round-selection-percent:\s*0%;[^}]*color-mix/s,
  );
});

test("sizes mobile round chips by their labels like the reference", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.knockout-round-strip\s*\{[^}]*gap:\s*8px;[^}]*padding:\s*8px;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-round-chip\s*\{[^}]*min-width:\s*fit-content;[^}]*height:\s*34px;[^}]*padding:\s*0 10px;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-round-chip strong\s*\{[^}]*font-size:\s*0\.78rem;/s,
  );
});

test("uses one white mobile Knockout container with solid brand-blue match cards", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).toMatch(
    /\.knockout-mobile\s*\{[^}]*border:\s*1px solid var\(--line\);[^}]*border-radius:\s*10px;[^}]*background:\s*#ffffff;[^}]*box-shadow:\s*none;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-status-filter\s*\{[^}]*gap:\s*8px;[^}]*padding:\s*8px;[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-round-strip\s*\{[^}]*padding:\s*8px;[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-scroll\s*\{[^}]*background:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-card\s*\{[^}]*background:\s*#00abff;[^}]*color:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-bracket-card\s*\{[^}]*background:\s*#00abff;[^}]*color:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-card-team \.knockout-team-label\s*\{[^}]*color:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-mobile-card-body time\s*\{[^}]*border-left:\s*1px solid rgba\(255, 255, 255, 0\.28\);[^}]*color:\s*#ffffff;/s,
  );
  expect(applicationStyles).toMatch(
    /\.knockout-status-chip\[aria-pressed="true"\]\s*\{[^}]*background:\s*#00abff;[^}]*color:\s*#ffffff;/s,
  );
});

test("uses scroll progress as the only mobile bracket position animation", () => {
  const applicationStyles = readFileSync("src/styles.css", "utf8");

  expect(applicationStyles).not.toMatch(
    /\.knockout-mobile-bracket-card\s*\{[^}]*transition:\s*top/s,
  );
  expect(applicationStyles).not.toMatch(
    /\.knockout-mobile-bracket-board\s*\{[^}]*transition:[^}]*height/s,
  );
});
