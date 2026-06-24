/// <reference lib="webworker" />

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const title = data.type === "var_cancel" ? "🚫 VAR — Goal Cancelled" : "⚽ GOAL!";
  const body = `${data.homeTeam} ${data.homeScore} - ${data.awayScore} ${data.awayTeam}`;
  const tag = data.matchId || "goal-notification";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag,
      renotify: true,
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
