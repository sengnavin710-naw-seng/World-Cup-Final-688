import { Router } from "express";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  getVapidPublicKey,
} from "../services/notificationService.js";

export const pushRouter = Router();

pushRouter.get("/vapid-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

pushRouter.post("/subscribe", (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ code: "INVALID_BODY", message: "Missing endpoint or keys" });
    return;
  }
  registerPushSubscription({ endpoint, keys });
  res.json({ ok: true });
});

pushRouter.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ code: "INVALID_BODY", message: "Missing endpoint" });
    return;
  }
  unregisterPushSubscription(endpoint);
  res.json({ ok: true });
});
