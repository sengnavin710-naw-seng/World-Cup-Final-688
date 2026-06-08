import request from "supertest";
import { createServer } from "../server";
import { resetSelectionStoreForTests } from "../services/selectionService";

const BURMESE_NAME = "\u1019\u1004\u103a\u1038";

beforeEach(() => {
  resetSelectionStoreForTests();
});

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

test("rejects invalid participant payload", async () => {
  const app = createServer();

  const response = await request(app).post("/api/participant/select").send({
    deviceId: "",
    displayName: "",
    teamCode: "arg",
  });

  expect(response.status).toBe(400);
  expect(response.body.code).toBe("INVALID_REQUEST");
});

test("change requires an existing participant session", async () => {
  const app = createServer();

  const response = await request(app).post("/api/participant/change").send({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "BRA",
  });

  expect(response.status).toBe(404);
  expect(response.body.code).toBe("PARTICIPANT_NOT_FOUND");
});

test("failed change keeps the original team owned by the participant", async () => {
  const app = createServer();

  await request(app).post("/api/participant/select").send({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "ARG",
  });

  await request(app).post("/api/participant/select").send({
    deviceId: "device-2",
    displayName: "May",
    teamCode: "BRA",
  });

  const failedChange = await request(app).post("/api/participant/change").send({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "BRA",
  });

  const participantSession = await request(app).get("/api/participant/session/device-1");
  const teams = await request(app).get("/api/tournament/teams");

  expect(failedChange.status).toBe(409);
  expect(participantSession.body.participant.teamCode).toBe("ARG");
  expect(teams.body.teams.find((team: { code: string }) => team.code === "ARG")?.isOwned).toBe(true);
});

test("allows duplicate Burmese display names for different teams", async () => {
  const app = createServer();

  const first = await request(app).post("/api/participant/select").send({
    deviceId: "device-1",
    displayName: `  ${BURMESE_NAME}  `,
    teamCode: "ARG",
  });
  const second = await request(app).post("/api/participant/select").send({
    deviceId: "device-2",
    displayName: BURMESE_NAME,
    teamCode: "BRA",
  });

  expect(first.status).toBe(201);
  expect(first.body.participant.displayName).toBe(BURMESE_NAME);
  expect(second.status).toBe(201);
  expect(second.body.participant.displayName).toBe(BURMESE_NAME);
});

test("rejects display name updates longer than 80 characters after trimming", async () => {
  const app = createServer();

  await request(app).post("/api/participant/select").send({
    deviceId: "device-1",
    displayName: "Seng",
    teamCode: "ARG",
  });

  const response = await request(app).patch("/api/participant/display-name").send({
    deviceId: "device-1",
    displayName: ` ${"a".repeat(81)} `,
  });

  expect(response.status).toBe(400);
  expect(response.body.code).toBe("INVALID_REQUEST");
});
