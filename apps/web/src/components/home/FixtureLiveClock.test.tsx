import { describe, expect, test } from "vitest";
import { getFixtureStatusText } from "./FixtureLiveClock";

describe("fixture status text", () => {
  test.each([
    ["FT", "Full Time"],
    ["AET", "After Extra Time"],
    ["PEN", "After Penalties"],
  ])("explains the terminal %s status", (status, expected) => {
    expect(getFixtureStatusText(status)).toBe(expected);
  });
});
