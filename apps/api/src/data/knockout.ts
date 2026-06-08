import type { KnockoutRound } from "../types";

type BracketSide = "left" | "right" | "center";

function makeKnockoutMatch(
  matchNumber: number,
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
  venue: string,
  side: BracketSide,
  bracketColumn: number,
  bracketSlot: number,
  badge?: string,
) {
  return {
    id: `match-${matchNumber}`,
    matchNumber,
    homeTeam,
    awayTeam,
    homeScore: 0,
    awayScore: 0,
    kickoff,
    venue,
    side,
    bracketColumn,
    bracketSlot,
    badge,
  };
}

export const knockout: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: [
      makeKnockoutMatch(74, "Group E winners", "Best third A/B/C/D/F", "2026-06-29", "Boston Stadium", "left", 1, 1),
      makeKnockoutMatch(77, "Group I winners", "Best third C/D/F/G/H", "2026-06-30", "New York New Jersey Stadium", "left", 1, 2),
      makeKnockoutMatch(73, "Group A runners-up", "Group B runners-up", "2026-06-28", "Los Angeles Stadium", "left", 1, 3),
      makeKnockoutMatch(75, "Group F winners", "Group C runners-up", "2026-06-29", "Estadio Monterrey", "left", 1, 4),
      makeKnockoutMatch(83, "Group K runners-up", "Group L runners-up", "2026-07-02", "Toronto Stadium", "left", 1, 5),
      makeKnockoutMatch(84, "Group H winners", "Group J runners-up", "2026-07-02", "Los Angeles Stadium", "left", 1, 6),
      makeKnockoutMatch(81, "Group D winners", "Best third B/E/F/I/J", "2026-07-01", "San Francisco Bay Area Stadium", "left", 1, 7),
      makeKnockoutMatch(82, "Group G winners", "Best third A/E/H/I/J", "2026-07-01", "Seattle Stadium", "left", 1, 8),
      makeKnockoutMatch(76, "Group C winners", "Group F runners-up", "2026-06-29", "Houston Stadium", "right", 1, 1),
      makeKnockoutMatch(78, "Group E runners-up", "Group I runners-up", "2026-06-30", "Dallas Stadium", "right", 1, 2),
      makeKnockoutMatch(79, "Group A winners", "Best third C/E/F/H/I", "2026-06-30", "Mexico City Stadium", "right", 1, 3),
      makeKnockoutMatch(80, "Group L winners", "Best third E/H/I/J/K", "2026-07-01", "Atlanta Stadium", "right", 1, 4),
      makeKnockoutMatch(86, "Group J winners", "Group H runners-up", "2026-07-03", "Miami Stadium", "right", 1, 5),
      makeKnockoutMatch(88, "Group D runners-up", "Group G runners-up", "2026-07-03", "Dallas Stadium", "right", 1, 6),
      makeKnockoutMatch(85, "Group B winners", "Best third E/F/G/I/J", "2026-07-02", "BC Place Vancouver", "right", 1, 7),
      makeKnockoutMatch(87, "Group K winners", "Best third D/E/I/J/L", "2026-07-03", "Kansas City Stadium", "right", 1, 8),
    ],
  },
  {
    round: "Round of 16",
    matches: [
      makeKnockoutMatch(89, "Winner Match 74", "Winner Match 77", "2026-07-04", "Philadelphia Stadium", "left", 2, 1),
      makeKnockoutMatch(90, "Winner Match 73", "Winner Match 75", "2026-07-04", "Houston Stadium", "left", 2, 2),
      makeKnockoutMatch(93, "Winner Match 83", "Winner Match 84", "2026-07-06", "Dallas Stadium", "left", 2, 3),
      makeKnockoutMatch(94, "Winner Match 81", "Winner Match 82", "2026-07-06", "Seattle Stadium", "left", 2, 4),
      makeKnockoutMatch(91, "Winner Match 76", "Winner Match 78", "2026-07-05", "New York New Jersey Stadium", "right", 2, 1),
      makeKnockoutMatch(92, "Winner Match 79", "Winner Match 80", "2026-07-05", "Mexico City Stadium", "right", 2, 2),
      makeKnockoutMatch(95, "Winner Match 86", "Winner Match 88", "2026-07-07", "Atlanta Stadium", "right", 2, 3),
      makeKnockoutMatch(96, "Winner Match 85", "Winner Match 87", "2026-07-07", "BC Place Vancouver", "right", 2, 4),
    ],
  },
  {
    round: "Quarter-finals",
    matches: [
      makeKnockoutMatch(97, "Winner Match 89", "Winner Match 90", "2026-07-09", "Boston Stadium", "left", 3, 1),
      makeKnockoutMatch(98, "Winner Match 93", "Winner Match 94", "2026-07-10", "Los Angeles Stadium", "left", 3, 2),
      makeKnockoutMatch(99, "Winner Match 91", "Winner Match 92", "2026-07-11", "Miami Stadium", "right", 3, 1),
      makeKnockoutMatch(100, "Winner Match 95", "Winner Match 96", "2026-07-11", "Kansas City Stadium", "right", 3, 2),
    ],
  },
  {
    round: "Semi-finals",
    matches: [
      makeKnockoutMatch(101, "Winner Match 97", "Winner Match 98", "2026-07-14", "Dallas Stadium", "left", 4, 1),
      makeKnockoutMatch(102, "Winner Match 99", "Winner Match 100", "2026-07-15", "Atlanta Stadium", "right", 4, 1),
    ],
  },
  {
    round: "Finals",
    matches: [
      makeKnockoutMatch(104, "Winner Match 101", "Winner Match 102", "2026-07-19", "New York New Jersey Stadium", "center", 1, 1, "FINAL"),
      makeKnockoutMatch(103, "Runner-up Match 101", "Runner-up Match 102", "2026-07-18", "Miami Stadium", "center", 1, 2, "BRONZE-FINAL"),
    ],
  },
];
