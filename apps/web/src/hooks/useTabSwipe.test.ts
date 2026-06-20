import { describe, expect, test } from "vitest";
import { resolveSwipeDelta } from "./useTabSwipe";

describe("resolveSwipeDelta", () => {
  test("moves one tab after a long fast left swipe", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 0,
        distanceX: -420,
        distanceY: 18,
        elapsedMs: 120,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(1);
  });

  test("stays on the current tab after a short slow swipe", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 1,
        distanceX: -30,
        distanceY: 8,
        elapsedMs: 220,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
  });

  test("ignores vertical scrolling", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 1,
        distanceX: -80,
        distanceY: 220,
        elapsedMs: 250,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
  });

  test("clamps swipes at both ends", () => {
    expect(
      resolveSwipeDelta({
        activeIndex: 0,
        distanceX: 180,
        distanceY: 5,
        elapsedMs: 180,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
    expect(
      resolveSwipeDelta({
        activeIndex: 3,
        distanceX: -180,
        distanceY: 5,
        elapsedMs: 180,
        tabCount: 4,
        viewportWidth: 390,
      }),
    ).toBe(0);
  });
});
