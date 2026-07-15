import { useEffect, useRef, useState } from "react";

export const liveFixtureStatuses = new Set([
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "INT",
  "LIVE",
]);

export const tickingFixtureStatuses = new Set(["1H", "2H", "ET", "LIVE"]);

const terminalFixtureStatusText: Record<string, string> = {
  AET: "After Extra Time",
  FT: "Full Time",
  PEN: "After Penalties",
};

export function formatFixtureClock(totalSeconds: number, extra?: number | null) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}${extra != null && extra > 0 ? ` +${extra}` : ""}`;
}

export function getFixtureClockBaseSeconds(elapsed: number) {
  return Math.max(0, elapsed * 60);
}

export function getFixtureStatusText(
  status: string,
  elapsed?: number | null,
  extra?: number | null,
) {
  if (status === "HT") return "Half Time";
  if (terminalFixtureStatusText[status]) return terminalFixtureStatusText[status];
  if (liveFixtureStatuses.has(status) && elapsed != null) {
    return formatFixtureClock(getFixtureClockBaseSeconds(elapsed), extra);
  }
  return status;
}

export function FixtureLiveClock({
  elapsed,
  extra,
  status,
}: {
  elapsed: number;
  extra?: number | null;
  status: string;
}) {
  const apiBaseSeconds = getFixtureClockBaseSeconds(elapsed);
  const lastDisplayedSecondsRef = useRef(apiBaseSeconds);
  const [clockSnapshot, setClockSnapshot] = useState(() => ({
    baseSeconds: apiBaseSeconds,
    startedAt: Date.now(),
  }));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const initialSeconds = Math.max(apiBaseSeconds, lastDisplayedSecondsRef.current);
    setClockSnapshot({
      baseSeconds: apiBaseSeconds,
      startedAt: Date.now() - (initialSeconds - apiBaseSeconds) * 1_000,
    });
    setNow(Date.now());
    if (!tickingFixtureStatuses.has(status)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [apiBaseSeconds, status]);

  const secondsSinceSnapshot = tickingFixtureStatuses.has(status)
    ? Math.max(0, Math.floor((now - clockSnapshot.startedAt) / 1_000))
    : 0;
  const totalSeconds = clockSnapshot.baseSeconds + secondsSinceSnapshot;
  lastDisplayedSecondsRef.current = totalSeconds;

  return <>{formatFixtureClock(totalSeconds, extra)}</>;
}
