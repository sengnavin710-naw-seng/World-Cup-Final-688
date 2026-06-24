import { WebSocket } from "ws";
import webPush from "web-push";

export type NotificationItem = {
  id: string;
  type: "goal" | "var_cancel";
  message: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  round: string;
  matchId: string;
  timestamp: number;
};

type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const MAX_NOTIFICATIONS = 50;

const vapidKeys = webPush.generateVAPIDKeys();
webPush.setVapidDetails("mailto:admin@worldcup688.com", vapidKeys.publicKey, vapidKeys.privateKey);

const wsClients = new Set<WebSocket>();
const notifications: NotificationItem[] = [];
const pushSubscriptions: PushSubscription[] = [];

export function registerClient(ws: WebSocket) {
  wsClients.add(ws);
}

export function unregisterClient(ws: WebSocket) {
  wsClients.delete(ws);
}

export function broadcastToWebSockets(notification: NotificationItem) {
  const payload = JSON.stringify({ type: "notification", notification });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function getRecentNotifications(limit = 30): NotificationItem[] {
  return notifications.slice(-limit);
}

export function addNotification(notification: NotificationItem) {
  notifications.push(notification);
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.splice(0, notifications.length - MAX_NOTIFICATIONS);
  }
  broadcastToWebSockets(notification);
  sendPushToAll(notification);
}

export function registerPushSubscription(sub: PushSubscription) {
  const existing = pushSubscriptions.find((s) => s.endpoint === sub.endpoint);
  if (!existing) {
    pushSubscriptions.push(sub);
  }
}

export function unregisterPushSubscription(endpoint: string) {
  const index = pushSubscriptions.findIndex((s) => s.endpoint === endpoint);
  if (index !== -1) {
    pushSubscriptions.splice(index, 1);
  }
}

export async function sendPushToAll(notification: NotificationItem) {
  const payload = JSON.stringify({
    title: notification.type === "goal" ? "⚽ Goal!" : "🚫 VAR Decision",
    body: notification.message,
    data: notification,
  });

  const failed: number[] = [];

  await Promise.allSettled(
    pushSubscriptions.map(async (sub, index) => {
      try {
        await webPush.sendNotification(sub, payload);
      } catch {
        failed.push(index);
      }
    }),
  );

  // Remove failed subscriptions in reverse order to preserve indices
  for (let i = failed.length - 1; i >= 0; i--) {
    pushSubscriptions.splice(failed[i]!, 1);
  }
}

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}
