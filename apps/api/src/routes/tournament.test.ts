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
  expect(matches.some((match: { badge?: string }) => match.badge === "FINAL")).toBe(true);
  expect(matches.some((match: { badge?: string }) => match.badge === "BRONZE-FINAL")).toBe(true);
});

test("unknown route returns structured 404", async () => {
  const app = createServer();
  const response = await request(app).get("/api/unknown");

  expect(response.status).toBe(404);
  expect(response.body.code).toBe("NOT_FOUND");
  expect(response.body.requestId).toBeTruthy();
});
