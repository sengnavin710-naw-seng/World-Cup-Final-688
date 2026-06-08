const DEVICE_KEY = "wcf688-device-id";
const SESSION_KEY = "wcf688-session";

function createDeviceId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function getOrCreateDeviceId() {
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;

  const next = createDeviceId();
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
