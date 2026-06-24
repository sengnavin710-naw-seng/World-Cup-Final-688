import { knockout } from "../data/knockout";
import type { Fixture, GroupStanding } from "../types";
import {
  projectKnockoutRounds,
  rankThirdPlacedTeams,
} from "./knockoutProjectionService";

const emptyScope = {
  draws: 0,
  goalDiff: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  losses: 0,
  played: 2,
  points: 0,
  wins: 0,
};

function makeGroup(
  group: string,
  rows: Array<{ code: string; goalDiff?: number; goalsFor?: number; points: number; wins?: number }>,
): GroupStanding {
  return {
    group,
    rows: rows.map((row) => ({
      flag: row.code,
      stats: {
        away: { ...emptyScope },
        home: { ...emptyScope },
        overall: {
          ...emptyScope,
          goalDiff: row.goalDiff ?? 0,
          goalsFor: row.goalsFor ?? 0,
          points: row.points,
          wins: row.wins ?? 0,
        },
      },
      team: row.code,
      teamCode: row.code,
    })),
  };
}

function makeCompletedGroupFixtures(group: string): Fixture[] {
  return Array.from({ length: 6 }, (_, index) => ({
    awayFlag: "",
    awayTeam: `${group}A${index}`,
    awayTeamName: `${group} away ${index}`,
    awayScore: 0,
    group,
    homeFlag: "",
    homeTeam: `${group}H${index}`,
    homeTeamName: `${group} home ${index}`,
    homeScore: 1,
    id: `${group}-${index}`,
    kickoff: `2026-06-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    matchNumber: index + 1,
    round: `Group ${group}`,
    statusShort: "FT",
    venue: "Test Stadium",
  }));
}

test("projects current group winners and runners-up into Round of 32", () => {
  const projected = projectKnockoutRounds(
    knockout,
    [
      makeGroup("A", [
        { code: "MEX", points: 6 },
        { code: "KOR", points: 3 },
        { code: "CZE", points: 1 },
        { code: "ZAF", points: 1 },
      ]),
      makeGroup("B", [
        { code: "CAN", points: 4 },
        { code: "SUI", points: 4 },
        { code: "BIH", points: 1 },
        { code: "QAT", points: 1 },
      ]),
    ],
    [],
  );
  const match73 = projected[0]?.matches.find((match) => match.matchNumber === 73);

  expect(match73).toMatchObject({
    awayTeam: "SUI",
    awayTeamConfirmed: false,
    awayTeamPlaceholder: "Group B runners-up",
    homeTeam: "KOR",
    homeTeamConfirmed: false,
    homeTeamPlaceholder: "Group A runners-up",
  });
});

test("marks direct group slots confirmed only after all six group fixtures finish", () => {
  const standings = [
    makeGroup("A", [
      { code: "MEX", points: 7 },
      { code: "KOR", points: 6 },
      { code: "CZE", points: 2 },
      { code: "ZAF", points: 1 },
    ]),
    makeGroup("B", [
      { code: "CAN", points: 7 },
      { code: "SUI", points: 5 },
      { code: "BIH", points: 3 },
      { code: "QAT", points: 1 },
    ]),
  ];
  const projected = projectKnockoutRounds(knockout, standings, [
    ...makeCompletedGroupFixtures("A"),
    ...makeCompletedGroupFixtures("B"),
  ]);
  const match73 = projected[0]?.matches.find((match) => match.matchNumber === 73);

  expect(match73).toMatchObject({
    awayTeam: "SUI",
    awayTeamConfirmed: true,
    homeTeam: "KOR",
    homeTeamConfirmed: true,
  });
});

test("ranks the best eight third-placed teams using table statistics", () => {
  const standings = "ABCDEFGHIJKL".split("").map((group, index) =>
    makeGroup(group, [
      { code: `${group}1`, points: 9 },
      { code: `${group}2`, points: 6 },
      {
        code: `${group}3`,
        goalDiff: 12 - index,
        goalsFor: 12 - index,
        points: index < 10 ? 4 : 1,
        wins: 1,
      },
      { code: `${group}4`, points: 0 },
    ]),
  );

  expect(rankThirdPlacedTeams(standings).map((team) => team.group)).toEqual([
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
  ]);
});

test("assigns eight projected third-place teams to eligible slots without duplicates", () => {
  const standings = "ABCDEFGHIJKL".split("").map((group, index) =>
    makeGroup(group, [
      { code: `${group}1`, points: 9 },
      { code: `${group}2`, points: 6 },
      { code: `${group}3`, goalDiff: 12 - index, points: index < 8 ? 4 : 1 },
      { code: `${group}4`, points: 0 },
    ]),
  );
  const projected = projectKnockoutRounds(knockout, standings, []);
  const thirdPlaceTeams = projected[0]?.matches.flatMap((match) =>
    [match.homeTeam, match.awayTeam].filter((team) => /^[A-H]3$/.test(team)),
  );

  expect(thirdPlaceTeams).toHaveLength(8);
  expect(new Set(thirdPlaceTeams).size).toBe(8);
});

test("uses the official third-place allocation table for current as-it-stands pairings", () => {
  const standingInputs: Record<
    string,
    Array<{ code: string; goalDiff?: number; goalsFor?: number; points: number; wins?: number }>
  > = {
    A: [
      { code: "MEX", points: 7 },
      { code: "KOR", points: 5 },
      { code: "CZE", goalDiff: 8, points: 4 },
      { code: "ZAF", points: 1 },
    ],
    B: [
      { code: "CAN", points: 7 },
      { code: "SUI", points: 5 },
      { code: "BIH", goalDiff: 7, points: 4 },
      { code: "QAT", points: 1 },
    ],
    C: [
      { code: "BRA", points: 7 },
      { code: "MAR", points: 5 },
      { code: "SCO", goalDiff: 6, points: 4 },
      { code: "HTI", points: 1 },
    ],
    D: [
      { code: "USA", points: 7 },
      { code: "AUS", points: 5 },
      { code: "PAR", goalDiff: 1, points: 1 },
      { code: "TUR", points: 0 },
    ],
    E: [
      { code: "GER", points: 7 },
      { code: "ECU", points: 5 },
      { code: "CIV", goalDiff: 5, points: 4 },
      { code: "CUW", points: 1 },
    ],
    F: [
      { code: "NED", points: 7 },
      { code: "JPN", points: 5 },
      { code: "SWE", goalDiff: 4, points: 4 },
      { code: "TUN", points: 1 },
    ],
    G: [
      { code: "BEL", points: 7 },
      { code: "IRN", points: 5 },
      { code: "EGY", goalDiff: 1, points: 1 },
      { code: "NZL", points: 0 },
    ],
    H: [
      { code: "ESP", points: 7 },
      { code: "URU", points: 5 },
      { code: "KSA", goalDiff: 1, points: 1 },
      { code: "CPV", points: 0 },
    ],
    I: [
      { code: "NOR", points: 7 },
      { code: "FRA", points: 5 },
      { code: "IRQ", goalDiff: 1, points: 1 },
      { code: "SEN", points: 0 },
    ],
    J: [
      { code: "ARG", points: 7 },
      { code: "AUT", points: 5 },
      { code: "ALG", goalDiff: 3, points: 4 },
      { code: "JOR", points: 1 },
    ],
    K: [
      { code: "POR", points: 7 },
      { code: "COL", points: 5 },
      { code: "UZB", goalDiff: 2, points: 4 },
      { code: "COD", points: 1 },
    ],
    L: [
      { code: "ENG", points: 7 },
      { code: "CRO", points: 5 },
      { code: "PAN", goalDiff: 1, points: 4 },
      { code: "GHA", points: 1 },
    ],
  };
  const projected = projectKnockoutRounds(
    knockout,
    Object.entries(standingInputs).map(([group, rows]) => makeGroup(group, rows)),
    [],
  );
  const match74 = projected[0]?.matches.find((match) => match.matchNumber === 74);
  const match77 = projected[0]?.matches.find((match) => match.matchNumber === 77);

  expect(match74).toMatchObject({
    awayTeam: "SCO",
    homeTeam: "GER",
  });
  expect(match77).toMatchObject({
    awayTeam: "SWE",
    homeTeam: "NOR",
  });
});
