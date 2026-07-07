import {
  fetchApiFootballFixtures,
  mapApiFootballFixtures,
  mapApiFootballStandings,
} from "./apiFootballService";

const config = {
  apiKey: "test-key",
  baseUrl: "https://v3.football.api-sports.io",
  cacheTtlMs: 60_000,
  leagueId: "1",
  season: "2026",
};

test("maps API-Football fixtures to the app fixture shape", () => {
  const fixtures = mapApiFootballFixtures([
    {
      fixture: {
        id: 1001,
        date: "2026-06-11T19:00:00+00:00",
        status: { elapsed: null, long: "Not Started", short: "NS" },
        venue: { name: "Mexico City Stadium" },
      },
      goals: { away: null, home: null },
      league: { round: "Group Stage - 1" },
      teams: {
        away: { code: "RSA", name: "South Africa" },
        home: { code: "MEX", name: "Mexico" },
      },
    },
  ]);

  expect(fixtures).toEqual([
    expect.objectContaining({
      awayFlag: expect.any(String),
      awayTeam: "ZAF",
      awayTeamName: "South Africa",
      group: "A",
      homeFlag: expect.any(String),
      homeTeam: "MEX",
      homeTeamName: "Mexico",
      homeScore: null,
      id: "api-football-1001",
      kickoff: "2026-06-11T19:00:00+00:00",
      matchNumber: 1,
      round: "Group A",
      statusElapsed: null,
      statusLong: "Not Started",
      statusShort: "NS",
      venue: "Mexico City Stadium",
    }),
  ]);
});

test("preserves scores and live status from API-Football fixtures", () => {
  const fixtures = mapApiFootballFixtures([
    {
      fixture: {
        id: 1002,
        date: "2026-06-11T19:00:00+00:00",
        status: { elapsed: 67, extra: 6, long: "Second Half", short: "2H" },
        venue: { name: "Mexico City Stadium" },
      },
      goals: { away: 1, home: 2 },
      league: { round: "Group Stage - 1" },
      teams: {
        away: { code: "RSA", name: "South Africa" },
        home: { code: "MEX", name: "Mexico" },
      },
    },
  ]);

  expect(fixtures[0]).toMatchObject({
    awayScore: 1,
    homeScore: 2,
    kickoff: "2026-06-11T19:00:00+00:00",
    statusElapsed: 67,
    statusExtra: 6,
    statusLong: "Second Half",
    statusShort: "2H",
  });
});

test("preserves knockout winner and penalty shootout scores from API-Football fixtures", () => {
  const fixtures = mapApiFootballFixtures([
    {
      fixture: {
        id: 1565176,
        date: "2026-06-29T20:30:00+00:00",
        status: { elapsed: 120, long: "Match Finished", short: "PEN" },
        venue: { name: "Boston Stadium" },
      },
      goals: { away: 1, home: 1 },
      league: { round: "Round of 32" },
      score: { penalty: { away: 4, home: 3 } },
      teams: {
        away: { name: "Paraguay", winner: true },
        home: { name: "Germany", winner: false },
      },
    },
  ]);

  expect(fixtures[0]).toMatchObject({
    awayTeam: "PAR",
    awayWinner: true,
    homeTeam: "GER",
    homeWinner: false,
    penaltyAwayScore: 4,
    penaltyHomeScore: 3,
    statusShort: "PEN",
  });
});

test("maps Cape Verde Islands without dropping its fixtures", () => {
  const fixtures = mapApiFootballFixtures([
    {
      fixture: {
        id: 1003,
        date: "2026-06-12T19:00:00+00:00",
        status: { elapsed: null, long: "Not Started", short: "NS" },
      },
      goals: { away: null, home: null },
      league: { round: "Group Stage - 1" },
      teams: {
        away: { name: "Cape Verde Islands" },
        home: { name: "Spain" },
      },
    },
  ]);

  expect(fixtures).toHaveLength(1);
  expect(fixtures[0]).toMatchObject({ awayTeam: "CPV", group: "H", homeTeam: "ESP" });
});

test("maps API-Football standings to the app standings shape", () => {
  const standings = mapApiFootballStandings([
    {
      league: {
        standings: [
          [
            {
              all: {
                draw: 0,
                goals: { against: 1, for: 4 },
                lose: 0,
                played: 2,
                win: 2,
              },
              away: {
                draw: 0,
                goals: { against: 1, for: 2 },
                lose: 0,
                played: 1,
                win: 1,
              },
              goalsDiff: 3,
              group: "Group A",
              home: {
                draw: 0,
                goals: { against: 0, for: 2 },
                lose: 0,
                played: 1,
                win: 1,
              },
              points: 6,
              rank: 1,
              team: { code: "MEX", name: "Mexico" },
            },
          ],
        ],
      },
    },
  ]);

  expect(standings).toEqual([
    {
      group: "A",
      rows: [
        expect.objectContaining({
          flag: expect.any(String),
          stats: expect.objectContaining({
            away: expect.objectContaining({ goalDiff: 1, points: 3 }),
            home: expect.objectContaining({ goalDiff: 2, points: 3 }),
            overall: expect.objectContaining({ goalDiff: 3, played: 2, points: 6 }),
          }),
          team: "Mexico",
          teamCode: "MEX",
        }),
      ],
    },
  ]);
});

test("ignores ranking tables outside World Cup groups A through L", () => {
  const standings = mapApiFootballStandings([
    {
      league: {
        standings: [
          [
            {
              all: { played: 2, win: 2 },
              group: "Group A",
              points: 6,
              rank: 1,
              team: { name: "Mexico" },
            },
          ],
          [
            {
              all: { played: 2, win: 1 },
              group: "Ranking of third-placed teams",
              points: 3,
              rank: 1,
              team: { name: "Czechia" },
            },
          ],
        ],
      },
    },
  ]);

  expect(standings).toHaveLength(1);
  expect(standings[0]?.rows.map((row) => row.teamCode)).toEqual(["MEX"]);
});

test("returns null when API-Football rejects the requested season", async () => {
  const fetchMock = vi.fn(async () => ({
    json: async () => ({
      errors: { plan: "Free plans do not have access to this season." },
      response: [],
    }),
    ok: true,
  })) as unknown as typeof fetch;

  await expect(fetchApiFootballFixtures(config, fetchMock)).resolves.toBeNull();
});
