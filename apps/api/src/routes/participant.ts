import { Router } from "express";
import {
  changeSelection,
  createSelection,
  getParticipantByDeviceId,
  resetSelection,
  updateDisplayName,
} from "../services/selectionService";

export const participantRouter = Router();

participantRouter.get("/session/:deviceId", async (req, res, next) => {
  try {
    const participant = await getParticipantByDeviceId(req.params.deviceId);
    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.post("/select", async (req, res, next) => {
  try {
    const participant = await createSelection(req.body);
    res.status(201).json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.post("/change", async (req, res, next) => {
  try {
    const participant = await changeSelection(req.body);
    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.patch("/display-name", async (req, res, next) => {
  try {
    const participant = await updateDisplayName(req.body.deviceId, req.body.displayName);
    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

participantRouter.post("/reset", async (req, res, next) => {
  try {
    await resetSelection(req.body.deviceId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
