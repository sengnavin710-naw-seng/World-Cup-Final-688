import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const STORAGE_KEY = "wcf688_notif_subscribed";
const MAX_RECONNECT = 10;
const RECONNECT_DELAY = 3000;

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

function getWsUrl() {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  return url.toString();
}

async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/vapid-key`);
    const data = await res.json();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "recent" && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          } else if (data.type === "notification" && data.notification) {
            setNotifications((prev) => [data.notification, ...prev].slice(0, 50));
          }
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        wsRef.current = null;

        if (
          localStorage.getItem(STORAGE_KEY) === "true" &&
          reconnectCountRef.current < MAX_RECONNECT
        ) {
          reconnectCountRef.current++;
          reconnectTimerRef.current = setTimeout(connectWs, RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      /* ignore connection errors */
    }
  }, []);

  const disconnectWs = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectCountRef.current = MAX_RECONNECT;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribePush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = await fetchVapidKey();
      if (!vapidKey) return false;

      // Permission already granted in toggle() — proceed directly

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch(`${API_BASE_URL}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  const unsubscribePush = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch(`${API_BASE_URL}/api/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      // Unsubscribe
      setIsSubscribed(false);
      localStorage.setItem(STORAGE_KEY, "false");
      await unsubscribePush();
      disconnectWs();
      return;
    }

    // Subscribe flow: ask for permission FIRST via native browser popup
    if (!("Notification" in window)) {
      // Browser doesn't support notifications — still connect WS for in-app
      setIsSubscribed(true);
      localStorage.setItem(STORAGE_KEY, "true");
      reconnectCountRef.current = 0;
      connectWs();
      return;
    }

    // This triggers the native mobile/browser popup:
    // "worldcup688.com wants to send you notifications  [Allow] [Block]"
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      // User denied or dismissed — don't subscribe
      return;
    }

    // Permission granted! Now subscribe
    setIsSubscribed(true);
    localStorage.setItem(STORAGE_KEY, "true");
    reconnectCountRef.current = 0;
    connectWs();
    await subscribePush();
  }, [isSubscribed, connectWs, disconnectWs, subscribePush, unsubscribePush]);

  // Auto-connect on mount if subscribed
  useEffect(() => {
    mountedRef.current = true;
    if (isSubscribed) {
      connectWs();
    }
    return () => {
      mountedRef.current = false;
      disconnectWs();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifications,
    isSubscribed,
    isConnected,
    toggle,
  };
}
