import request from "supertest";
import { createServer } from "../server";
import { resetApiFootballCacheForTests } from "../services/apiFootballService";

const footballEnvKeys = [
  "FOOTBALL_API_BASE_URL",
  "FOOTBALL_API_KEY",
  "FOOTBALL_WORLD_CUP_LEAGUE_ID",
  "FOOTBALL_WORLD_CUP_SEASON",
] as const;

afterEach(() => {
  vi.restoreAllMocks();
  resetApiFootballCacheForTests();
  footballEnvKeys.forEach((key) => {
    delete process.env[key];
  });
});

test("health endpoint returns ok", async () => {
  const app = createServer();
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("teams endpoint returns 48 teams", async () => {
  const app = createServer();
  const response = await request(app).get("/api/tournament/teams");
  expect(response.status).toBe(200);
  expect(response.body.teams).toHaveLength(48);
  expect(response.body.teams).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "KOR", group: "A", name: "South Korea" }),
      expect.objectContaining({ code: "CZE", group: "A", name: "Czech Republic" }),
      expect.objectContaining({ code: "TUR", group: "D", name: "Turkey" }),
      expect.objectContaining({ code: "CIV", group: "E", name: "Ivory Coast" }),
      expect.objectContaining({ code: "CUW", group: "E", name: "Curaçao" }),
      expect.objectContaining({ code: "IRN", group: "G", name: "Iran" }),
      expect.objectContaining({ code: "COD", group: "K", name: "DR Congo" }),
    ]),
  );
  expect(response.headers["x-request-id"]).toBeTruthy();
});

test("knockout endpoint returns the full bracket layout", async () => {
  const app = createServer();
  const response = await request(app).get("/api/tournament/knockout");
  const quarterFinals = response.body.knockout.find(
    (round: { round: string }) => round.round === "Quarter-finals",
  );
  const matches = response.body.knockout.flatMap(
    (round: { matches: Array<{ badge?: string; side?: string }> }) => round.matches,
  );

  expect(response.status).toBe(200);
  expect(response.body.knockout).toHaveLength(5);
  expect(quarterFinals.matches).toHaveLength(4);
  expect(matches).toHaveLength(32);
  expect(matches.filter((match: { side?: string }) => match.side === "center")).toHaveLength(2);
  expect(matches[0]).toMatchObject({
    awayTeamConfirmed: false,
    awayTeamPlaceholder: "Best third A/B/C/D/F",
    homeTeamConfirmed: false,
    homeTeamPlaceholder: "Group E winners",
  });
  expect(matches).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        badge: "FINAL",
        homeTeam: "Winner Match 101",
        awayTeam: "Winner Match 102",
        kickoff: "2026-07-19",
        matchNumber: 104,
        venue: "New York New Jersey Stadium",
      }),
      expect.objectContaining({
        badge: "BRONZE-FINAL",
        kickoff: "2026-07-18",
        matchNumber: 103,
        venue: "Miami Stadium",
      }),
    ]),
  );
});

test("fixtures endpoint returns all 72 official group-stage matches", async () => {
  const app = createServer();
  const response = await request(app).get("/api/tournament/fixtures");

  expect(response.status).toBe(200);
  expect(response.body.fixtures).toHaveLength(72);
  expect(response.body.fixtures[0]).toMatchObject({
    matchNumber: 1,
    group: "A",
    homeTeam: "MEX",
    awayTeam: "ZAF",
    kickoff: "2026-06-11",
    venue: "Mexico City Stadium",
  });
  expect(response.body.fixtures[71]).toMatchObject({
    matchNumber: 72,
    group: "K",
    homeTeam: "COD",
    awayTeam: "UZB",
    kickoff: "2026-06-27",
    venue: "Atlanta Stadium",
  });
});

test("fixtures endpoint uses API-Football data when it is available", async () => {
  process.env.FOOTBALL_API_BASE_URL = "https://v3.football.api-sports.io";
  process.env.FOOTBALL_API_KEY = "test-key";
  process.env.FOOTBALL_WORLD_CUP_LEAGUE_ID = "1";
  process.env.FOOTBALL_WORLD_CUP_SEASON = "2026";
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: async () => ({
      errors: [],
      response: [
        {
          fixture: {
            date: "2026-06-11T19:00:00+00:00",
            id: 1001,
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
      ],
    }),
    ok: true,
  } as Response);

  const app = createServer();
  const response = await request(app).get("/api/tournament/fixtures");

  expect(response.status).toBe(200);
  expect(response.body.fixtures).toEqual([
    expect.objectContaining({
      awayTeam: "ZAF",
      group: "A",
      homeTeam: "MEX",
      homeScore: null,
      id: "api-football-1001",
      kickoff: "2026-06-11T19:00:00+00:00",
      statusShort: "NS",
    }),
  ]);
});

test("knockout endpoint projects confirmed group positions from API-Football", async () => {
  process.env.FOOTBALL_API_BASE_URL = "https://v3.football.api-sports.io";
  process.env.FOOTBALL_API_KEY = "test-key";
  process.env.FOOTBALL_WORLD_CUP_LEAGUE_ID = "1";
  process.env.FOOTBALL_WORLD_CUP_SEASON = "2026";

  const makeApiFixture = (
    id: number,
    home: { code: string; name: string },
    away: { code: string; name: string },
  ) => ({
    fixture: {
      date: "2026-06-20T12:00:00+00:00",
      id,
      status: { elapsed: 90, long: "Match Finished", short: "FT" },
      venue: { name: "Test Stadium" },
    },
    goals: { away: 0, home: 1 },
    league: { round: "Group Stage - 3" },
    teams: { away, home },
  });
  const groupAFixtures = Array.from({ length: 6 }, (_, index) =>
    makeApiFixture(
      2000 + index,
      { code: "MEX", name: "Mexico" },
      { code: "RSA", name: "South Africa" },
    ),
  );
  const groupBFixtures = Array.from({ length: 6 }, (_, index) =>
    makeApiFixture(
      3000 + index,
      { code: "CAN", name: "Canada" },
      { code: "SUI", name: "Switzerland" },
    ),
  );
  const makeStanding = (
    group: string,
    rank: number,
    team: { code: string; name: string },
    points: number,
  ) => ({
    all: {
      draw: 0,
      goals: { against: 1, for: points },
      lose: 0,
      played: 3,
      win: 2,
    },
    away: { played: 1 },
    goalsDiff: points - 1,
    group: `Group ${group}`,
    home: { played: 2 },
    points,
    rank,
    team,
  });

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.includes("/fixtures?")) {
      return {
        json: async () => ({
          errors: [],
          response: [...groupAFixtures, ...groupBFixtures],
        }),
        ok: true,
      } as Response;
    }

    return {
      json: async () => ({
        errors: [],
        response: [
          {
            league: {
              standings: [
                [
                  makeStanding("A", 1, { code: "MEX", name: "Mexico" }, 7),
                  makeStanding("A", 2, { code: "KOR", name: "South Korea" }, 6),
                  makeStanding("A", 3, { code: "CZE", name: "Czechia" }, 2),
                  makeStanding("A", 4, { code: "RSA", name: "South Africa" }, 1),
                ],
                [
                  makeStanding("B", 1, { code: "CAN", name: "Canada" }, 7),
                  makeStanding("B", 2, { code: "SUI", name: "Switzerland" }, 5),
                  makeStanding("B", 3, { code: "BIH", name: "Bosnia & Herzegovina" }, 3),
                  makeStanding("B", 4, { code: "QAT", name: "Qatar" }, 1),
                ],
              ],
            },
          },
        ],
      }),
      ok: true,
    } as Response;
  });

  const app = createServer();
  const response = await request(app).get("/api/tournament/knockout");
  const match73 = response.body.knockout[0].matches.find(
    (match: { matchNumber: number }) => match.matchNumber === 73,
  );

  expect(response.status).toBe(200);
  expect(match73).toMatchObject({
    awayTeam: "SUI",
    awayTeamConfirmed: true,
    homeTeam: "KOR",
    homeTeamConfirmed: true,
  });
});

test("knockout endpoint falls back to the static bracket when API-Football is unreachable", async () => {
  process.env.FOOTBALL_API_BASE_URL = "https://v3.football.api-sports.io";
  process.env.FOOTBALL_API_KEY = "test-key";
  process.env.FOOTBALL_WORLD_CUP_LEAGUE_ID = "1";
  process.env.FOOTBALL_WORLD_CUP_SEASON = "2026";
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));

  const app = createServer();
  const response = await request(app).get("/api/tournament/knockout");

  expect(response.status).toBe(200);
  expect(response.body.knockout[0].matches[0]).toMatchObject({
    awayTeam: "Best third A/B/C/D/F",
    homeTeam: "Group E winners",
  });
});

test("tournament endpoints cover the official 104-match format", async () => {
  const app = createServer();
  const [fixturesResponse, knockoutResponse] = await Promise.all([
    request(app).get("/api/tournament/fixtures"),
    request(app).get("/api/tournament/knockout"),
  ]);
  const knockoutMatches = knockoutResponse.body.knockout.flatMap(
    (round: { matches: unknown[] }) => round.matches,
  );

  expect(fixturesResponse.body.fixtures.length + knockoutMatches.length).toBe(104);
});

test("unknown route returns structured 404", async () => {
  const app = createServer();
  const response = await request(app).get("/api/unknown");

  expect(response.status).toBe(404);
  expect(response.body.code).toBe("NOT_FOUND");
  expect(response.body.requestId).toBeTruthy();
});
