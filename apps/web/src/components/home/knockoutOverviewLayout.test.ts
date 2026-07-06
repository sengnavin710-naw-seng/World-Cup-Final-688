import { describe, expect, it } from "vitest";
import type { KnockoutRound } from "../../lib/types";
import { getKnockoutOverviewLayout } from "./knockoutOverviewLayout";

function makeMatch(
  id: string,
  side: "left" | "right" | "center",
  column: number,
  slot: number,
  badge?: string,
): KnockoutRound["matches"][number] {
  return {
    id,
    matchNumber: Number(id.replace(/\D/g, "")) || 1,
    homeTeam: "AAA",
    awayTeam: "BBB",
    homeScore: 0,
    awayScore: 0,
    kickoff: "2026-07-10",
    venue: "Test Stadium",
    side,
    bracketColumn: column,
    bracketSlot: slot,
    badge,
  };
}

const rounds: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: [
      ...Array.from({ length: 8 }, (_, index) =>
        makeMatch(`l1-${index + 1}`, "left", 1, index + 1),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        makeMatch(`r1-${index + 1}`, "right", 1, index + 1),
      ),
    ],
  },
  {
    round: "Round of 16",
    matches: [
      ...Array.from({ length: 4 }, (_, index) =>
        makeMatch(`l2-${index + 1}`, "left", 2, index + 1),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeMatch(`r2-${index + 1}`, "right", 2, index + 1),
      ),
    ],
  },
  {
    round: "Quarter-finals",
    matches: [
      makeMatch("l3-1", "left", 3, 1),
      makeMatch("l3-2", "left", 3, 2),
      makeMatch("r3-1", "right", 3, 1),
      makeMatch("r3-2", "right", 3, 2),
    ],
  },
  {
    round: "Semi-finals",
    matches: [
      makeMatch("l4-1", "left", 4, 1),
      makeMatch("r4-1", "right", 4, 1),
    ],
  },
  {
    round: "Finals",
    matches: [
      makeMatch("final", "center", 1, 1, "FINAL"),
      makeMatch("bronze", "center", 1, 2, "BRONZE-FINAL"),
    ],
  },
];

describe("getKnockoutOverviewLayout", () => {
  it.each([320, 375, 390, 430])("fits every match within a %ipx viewport", (width) => {
    const layout = getKnockoutOverviewLayout(rounds, width);
    const topRoundOf16 = layout.matches.filter(
      (match) => match.side === "left" && match.bracketColumn === 2,
    );
    const bottomRoundOf16 = layout.matches.filter(
      (match) => match.side === "right" && match.bracketColumn === 2,
    );

    expect(layout.width).toBe(width);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.connectors.length).toBeGreaterThan(0);
    expect(layout.matches).toHaveLength(16);
    expect(
      layout.matches.some(
        (match) => match.side !== "center" && match.bracketColumn === 1,
      ),
    ).toBe(false);
    expect(topRoundOf16).toHaveLength(4);
    expect(bottomRoundOf16).toHaveLength(4);
    expect(new Set(topRoundOf16.map((match) => match.y)).size).toBe(1);
    expect(new Set(bottomRoundOf16.map((match) => match.y)).size).toBe(1);
    expect(Math.min(...bottomRoundOf16.map((match) => match.y))).toBeGreaterThan(
      Math.max(...topRoundOf16.map((match) => match.y)),
    );
    expect(
      layout.matches.every(
        (match) => match.x >= 0 && match.x + match.width <= width,
      ),
    ).toBe(true);
  });

  it("places the two branches on opposite sides of the final stage", () => {
    const layout = getKnockoutOverviewLayout(rounds, 390);
    const leftSemi = layout.matches.find((match) => match.id === "l4-1");
    const final = layout.matches.find((match) => match.id === "final");
    const rightSemi = layout.matches.find((match) => match.id === "r4-1");

    expect(leftSemi?.y).toBeLessThan(final?.y ?? 0);
    expect(rightSemi?.y).toBeGreaterThan(final?.y ?? Number.POSITIVE_INFINITY);
  });

  it("returns stable empty geometry when no rounds are available", () => {
    expect(getKnockoutOverviewLayout([], 375)).toEqual({
      champion: { x: 187.5, y: 32 },
      connectors: [],
      height: 160,
      matches: [],
      width: 375,
    });
  });
});
