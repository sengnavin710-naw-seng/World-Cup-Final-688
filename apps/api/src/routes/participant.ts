import { Router } from "express";
import {
  changeSelection,
  createSelection,
  getParticipantByDeviceId,
  resetSelection,
  updateDisplayName,
} from "../services/selectionService";

export const participantRouter = Router();

function invalidRequest(message: string) {
  const error = new Error(message);
  (error as Error & { code?: string; status?: number }).code = "INVALID_REQUEST";
  (error as Error & { code?: string; status?: number }).status = 400;
  return error;
}

function parseNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidRequest(`${fieldName} is required.`);
  }

  return value.trim();
}

function parseDisplayName(value: unknown) {
  const displayName = parseNonEmptyString(value, "displayName");

  if (displayName.length > 80) {
    throw invalidRequest("displayName is too long.");
  }

  return displayName;
}

function parseParticipantPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw invalidRequest("Request body must be an object.");
  }

  const payload = body as Record<string, unknown>;
  const deviceId = parseNonEmptyString(payload.deviceId, "deviceId");
  const displayName = parseDisplayName(payload.displayName);
  const teamCode = parseNonEmptyString(payload.teamCode, "teamCode").toUpperCase();

  if (!/^[A-Z]{3}$/.test(teamCode)) {
    throw invalidRequest("teamCode must be a 3-letter team code.");
  }

  if (deviceId.length > 128) {
    throw invalidRequest("deviceId is too long.");
  }

  return { deviceId, displayName, teamCode };
}

function parseDeviceIdPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw invalidRequest("Request body must be an object.");
  }

  const payload = body as Record<string, unknown>;
  return parseNonEmptyString(payload.deviceId, "deviceId");
}

participantRouter.get("/session/:deviceId", async (req, res, next) => {
  try {
    const participant = await getParticipantByDeviceId(parseNonEmptyString(req.params.deviceId, "deviceId"));
    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.post("/select", async (req, res, next) => {
  try {
    const participant = await createSelection(parseParticipantPayload(req.body));
    res.status(201).json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.post("/change", async (req, res, next) => {
  try {
    const participant = await changeSelection(parseParticipantPayload(req.body));
    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.patch("/display-name", async (req, res, next) => {
  try {
    const deviceId = parseDeviceIdPayload(req.body);
    const displayName = parseDisplayName((req.body as Record<string, unknown>).displayName);
    const participant = await updateDisplayName(deviceId, displayName);
    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.post("/reset", async (req, res, next) => {
  try {
    await resetSelection(parseDeviceIdPayload(req.body));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
