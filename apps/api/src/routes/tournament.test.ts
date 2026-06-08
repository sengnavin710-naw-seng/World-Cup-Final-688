import request from "supertest";
import { createServer } from "../server";

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
  const matches = response.body.knockout.flatMap(
    (round: { matches: Array<{ badge?: string; side?: string }> }) => round.matches,
  );

  expect(response.status).toBe(200);
  expect(response.body.knockout).toHaveLength(5);
  expect(matches).toHaveLength(32);
  expect(matches.filter((match: { side?: string }) => match.side === "center")).toHaveLength(2);
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
