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

test("advances the penalty shootout winner from Round of 32 into Round of 16", () => {
  const projected = projectKnockoutRounds(
    knockout,
    [
      makeGroup("E", [
        { code: "GER", points: 7 },
        { code: "ECU", points: 5 },
        { code: "CIV", points: 4 },
        { code: "CUW", points: 1 },
      ]),
    ],
    [
      {
        awayFlag: "",
        awayScore: 1,
        awayTeam: "PAR",
        awayTeamName: "Paraguay",
        awayWinner: true,
        group: "E",
        homeFlag: "",
        homeScore: 1,
        homeTeam: "GER",
        homeTeamName: "Germany",
        homeWinner: false,
        id: "api-football-penalty-74",
        kickoff: "2026-06-29T20:30:00+00:00",
        matchNumber: 74,
        penaltyAwayScore: 4,
        penaltyHomeScore: 3,
        round: "Round of 32",
        statusShort: "PEN",
        venue: "Boston Stadium",
      },
    ],
  );

  const match89 = projected
    .find((round) => round.round === "Round of 16")
    ?.matches.find((match) => match.matchNumber === 89);

  expect(match89).toMatchObject({
    homeTeam: "PAR",
    homeTeamConfirmed: true,
  });
});

test("advances both semi-final losers into the Bronze-final", () => {
  const projected = projectKnockoutRounds(knockout, [], [
    {
      awayFlag: "",
      awayScore: 1,
      awayTeam: "FRA",
      awayTeamName: "France",
      awayWinner: false,
      group: "",
      homeFlag: "",
      homeScore: 2,
      homeTeam: "GER",
      homeTeamName: "Germany",
      homeWinner: true,
      id: "api-football-semi-101",
      kickoff: "2026-07-14T19:00:00+00:00",
      matchNumber: 101,
      round: "Semi-finals",
      statusShort: "FT",
      venue: "Dallas Stadium",
    },
    {
      awayFlag: "",
      awayScore: 2,
      awayTeam: "ARG",
      awayTeamName: "Argentina",
      awayWinner: true,
      group: "",
      homeFlag: "",
      homeScore: 0,
      homeTeam: "BRA",
      homeTeamName: "Brazil",
      homeWinner: false,
      id: "api-football-semi-102",
      kickoff: "2026-07-15T19:00:00+00:00",
      matchNumber: 102,
      round: "Semi-finals",
      statusShort: "FT",
      venue: "Mercedes-Benz Stadium",
    },
  ]);
  const bronzeFinal = projected
    .find((round) => round.round === "Finals")
    ?.matches.find((match) => match.matchNumber === 103);

  expect(bronzeFinal).toMatchObject({
    awayTeam: "BRA",
    awayTeamConfirmed: true,
    homeTeam: "FRA",
    homeTeamConfirmed: true,
  });
});

test("does not copy a known Round of 16 fixture into another unresolved bracket slot", () => {
  const projected = projectKnockoutRounds(
    knockout,
    [
      makeGroup("A", [
        { code: "MEX", points: 7 },
        { code: "KOR", points: 5 },
        { code: "ZAF", points: 4 },
        { code: "CZE", points: 1 },
      ]),
      makeGroup("B", [
        { code: "CAN", points: 7 },
        { code: "SUI", points: 5 },
        { code: "BIH", points: 4 },
        { code: "QAT", points: 1 },
      ]),
      makeGroup("E", [
        { code: "GER", points: 7 },
        { code: "ECU", points: 5 },
        { code: "CIV", points: 4 },
        { code: "CUW", points: 1 },
      ]),
      makeGroup("F", [
        { code: "NED", points: 7 },
        { code: "JPN", points: 5 },
        { code: "SWE", points: 4 },
        { code: "TUN", points: 1 },
      ]),
    ],
    [
      {
        awayFlag: "",
        awayScore: 1,
        awayTeam: "PAR",
        awayTeamName: "Paraguay",
        awayWinner: true,
        group: "E",
        homeFlag: "",
        homeScore: 1,
        homeTeam: "GER",
        homeTeamName: "Germany",
        homeWinner: false,
        id: "api-football-penalty-74",
        kickoff: "2026-06-29T20:30:00+00:00",
        matchNumber: 74,
        penaltyAwayScore: 4,
        penaltyHomeScore: 3,
        round: "Round of 32",
        statusShort: "PEN",
        venue: "Boston Stadium",
      },
      {
        awayFlag: "",
        awayScore: 1,
        awayTeam: "MAR",
        awayTeamName: "Morocco",
        awayWinner: true,
        group: "F",
        homeFlag: "",
        homeScore: 1,
        homeTeam: "NED",
        homeTeamName: "Netherlands",
        homeWinner: false,
        id: "api-football-penalty-75",
        kickoff: "2026-06-30T01:00:00+00:00",
        matchNumber: 75,
        penaltyAwayScore: 3,
        penaltyHomeScore: 2,
        round: "Round of 32",
        statusShort: "PEN",
        venue: "Estadio Monterrey",
      },
      {
        awayFlag: "",
        awayScore: 1,
        awayTeam: "CAN",
        awayTeamName: "Canada",
        awayWinner: true,
        group: "A",
        homeFlag: "",
        homeScore: 0,
        homeTeam: "ZAF",
        homeTeamName: "South Africa",
        homeWinner: false,
        id: "api-football-73",
        kickoff: "2026-06-28T19:00:00+00:00",
        matchNumber: 73,
        round: "Round of 32",
        statusShort: "FT",
        venue: "Los Angeles Stadium",
      },
      {
        awayFlag: "",
        awayScore: null,
        awayTeam: "MAR",
        awayTeamName: "Morocco",
        group: "",
        homeFlag: "",
        homeScore: null,
        homeTeam: "CAN",
        homeTeamName: "Canada",
        id: "api-football-r16-90",
        kickoff: "2026-07-04T17:00:00+00:00",
        matchNumber: 90,
        round: "Round of 16",
        statusShort: "NS",
        venue: "Houston Stadium",
      },
    ],
  );

  const r16 = projected.find((round) => round.round === "Round of 16")?.matches;
  const match89 = r16?.find((match) => match.matchNumber === 89);
  const match90 = r16?.find((match) => match.matchNumber === 90);

  expect(match89).toMatchObject({
    awayTeam: "Winner Match 77",
    homeTeam: "PAR",
  });
  expect(match90).toMatchObject({
    awayTeam: "MAR",
    homeTeam: "CAN",
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
      { code: "ZAF", points: 5 },
      { code: "KOR", goalDiff: -1, goalsFor: 2, points: 3, wins: 1 },
      { code: "ZAF", points: 1 },
    ],
    B: [
      { code: "SUI", points: 7 },
      { code: "CAN", points: 5 },
      { code: "BIH", goalDiff: -1, goalsFor: 5, points: 4, wins: 1 },
      { code: "QAT", points: 1 },
    ],
    C: [
      { code: "BRA", points: 7 },
      { code: "MAR", points: 5 },
      { code: "SCO", goalDiff: -3, goalsFor: 1, points: 3, wins: 1 },
      { code: "HTI", points: 1 },
    ],
    D: [
      { code: "USA", points: 7 },
      { code: "AUS", points: 5 },
      { code: "PAR", goalDiff: -2, goalsFor: 2, points: 4, wins: 1 },
      { code: "TUR", points: 0 },
    ],
    E: [
      { code: "GER", points: 7 },
      { code: "CIV", points: 5 },
      { code: "ECU", goalDiff: 0, goalsFor: 2, points: 4, wins: 1 },
      { code: "CUW", points: 1 },
    ],
    F: [
      { code: "NED", points: 7 },
      { code: "JPN", points: 5 },
      { code: "SWE", goalDiff: 0, goalsFor: 7, points: 4, wins: 1 },
      { code: "TUN", points: 1 },
    ],
    G: [
      { code: "BEL", points: 7 },
      { code: "EGY", points: 5 },
      { code: "IRN", goalDiff: 0, goalsFor: 3, points: 3, wins: 0 },
      { code: "NZL", points: 0 },
    ],
    H: [
      { code: "ESP", points: 7 },
      { code: "CPV", points: 5 },
      { code: "URU", goalDiff: -1, goalsFor: 3, points: 2, wins: 0 },
      { code: "CPV", points: 0 },
    ],
    I: [
      { code: "FRA", points: 7 },
      { code: "NOR", points: 5 },
      { code: "SEN", goalDiff: 2, goalsFor: 8, points: 3, wins: 1 },
      { code: "SEN", points: 0 },
    ],
    J: [
      { code: "ARG", points: 7 },
      { code: "AUT", points: 5 },
      { code: "ALG", goalDiff: -2, goalsFor: 5, points: 4, wins: 1 },
      { code: "JOR", points: 1 },
    ],
    K: [
      { code: "COL", points: 7 },
      { code: "POR", points: 5 },
      { code: "COD", goalDiff: 1, goalsFor: 4, points: 4, wins: 1 },
      { code: "COD", points: 1 },
    ],
    L: [
      { code: "ENG", points: 7 },
      { code: "CRO", points: 5 },
      { code: "GHA", goalDiff: 0, goalsFor: 2, points: 4, wins: 1 },
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
    awayTeam: "PAR",
    homeTeam: "GER",
  });
  expect(match77).toMatchObject({
    awayTeam: "SWE",
    homeTeam: "FRA",
  });
});
