import { getOrCreateDeviceId } from "./deviceIdentity";

beforeEach(() => {
  window.localStorage.clear();
});

test("creates and remembers a device id when randomUUID is unavailable", () => {
  const originalRandomUUID = globalThis.crypto.randomUUID;

  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: undefined,
  });

  try {
    const deviceId = getOrCreateDeviceId();

    expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getOrCreateDeviceId()).toBe(deviceId);
    expect(window.localStorage.getItem("wcf688-device-id")).toBe(deviceId);
  } finally {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: originalRandomUUID,
    });
  }
});
