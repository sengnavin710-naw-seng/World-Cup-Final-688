const DEVICE_KEY = "wcf688-device-id";
const SESSION_KEY = "wcf688-session";

export function getOrCreateDeviceId() {
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;

  const next = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, next);
  return next;
}

export function clearDeviceIdentity() {
  window.localStorage.removeItem(DEVICE_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}

export function saveSession(value: { deviceId: string; displayName: string; teamCode: string }) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

export function readSession() {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { deviceId: string; displayName: string; teamCode: string };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}
