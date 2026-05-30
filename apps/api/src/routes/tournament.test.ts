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

test("unknown route returns structured 404", async () => {
  const app = createServer();
  const response = await request(app).get("/api/unknown");

  expect(response.status).toBe(404);
  expect(response.body.code).toBe("NOT_FOUND");
  expect(response.body.requestId).toBeTruthy();
});
