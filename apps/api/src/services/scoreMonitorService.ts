import { randomUUID } from "node:crypto";
import { getFixtures } from "./selectionService.js";
import { addNotification } from "./notificationService.js";
import type { NotificationItem } from "./notificationService.js";

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "P", "LIVE"]);
const POLL_INTERVAL_MS = 30_000;

const scoreSnapshot = new Map<string, { homeScore: number; awayScore: number }>();
let intervalId: ReturnType<typeof setInterval> | null = null;

export async function checkScores() {
  const allFixtures = await getFixtures();
  const liveFixtureIds = new Set<string>();

  for (const fixture of allFixtures) {
    if (!fixture.statusShort || !LIVE_STATUSES.has(fixture.statusShort)) {
      continue;
    }

    liveFixtureIds.add(fixture.id);

    const homeScore = fixture.homeScore ?? 0;
    const awayScore = fixture.awayScore ?? 0;
    const previous = scoreSnapshot.get(fixture.id);

    if (!previous) {
      scoreSnapshot.set(fixture.id, { homeScore, awayScore });
      continue;
    }

    if (previous.homeScore !== homeScore || previous.awayScore !== awayScore) {
      const previousTotal = previous.homeScore + previous.awayScore;
      const currentTotal = homeScore + awayScore;
      const type: NotificationItem["type"] = currentTotal > previousTotal ? "goal" : "var_cancel";
      const minute = String(fixture.statusElapsed ?? "?");

      const message =
        type === "goal"
          ? `⚽ ${fixture.homeTeamName} ${homeScore} - ${awayScore} ${fixture.awayTeamName} (${minute}')`
          : `🚫 VAR: ${fixture.homeTeamName} ${homeScore} - ${awayScore} ${fixture.awayTeamName} (${minute}')`;

      const notification: NotificationItem = {
        id: randomUUID(),
        type,
        message,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        homeFlag: fixture.homeFlag,
        awayFlag: fixture.awayFlag,
        homeScore,
        awayScore,
        minute,
        round: fixture.round,
        matchId: fixture.id,
        timestamp: Date.now(),
      };

      addNotification(notification);
      scoreSnapshot.set(fixture.id, { homeScore, awayScore });
    }
  }

  // Remove fixtures that are no longer live
  for (const id of scoreSnapshot.keys()) {
    if (!liveFixtureIds.has(id)) {
      scoreSnapshot.delete(id);
    }
  }
}

export function startScoreMonitor() {
  if (intervalId) return;
  console.info("[score-monitor] started (polling every 30s)");
  intervalId = setInterval(() => {
    checkScores().catch((error) => {
      console.error("[score-monitor] error checking scores:", error);
    });
  }, POLL_INTERVAL_MS);
}

export function stopScoreMonitor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.info("[score-monitor] stopped");
  }
}
