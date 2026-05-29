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
});
