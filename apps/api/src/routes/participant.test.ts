import request from "supertest";
import { createServer } from "../server";

test("cannot assign one team to two participants", async () => {
  const app = createServer();

  await request(app).post("/api/participant/select").send({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "ARG",
  });

  const second = await request(app).post("/api/participant/select").send({
    deviceId: "device-2",
    displayName: "May",
    teamCode: "ARG",
  });

  expect(second.status).toBe(409);
  expect(second.body.code).toBe("SELECTION_CONFLICT");
});
