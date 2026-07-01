import { Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, TouchEvent } from "react";
import type { KnockoutRound, Team } from "../../lib/types";

type KnockoutMatch = KnockoutRound["matches"][number];
type BracketSide = "left" | "right";
type BracketMatch = KnockoutMatch & { round: string };
type MobilePositionedMatch = BracketMatch & {
  height: number;
  opacity: number;
  roundIndex: number;
  width: number;
  x: number;
  y: number;
};
type MobileConnectorPath = {
  d: string;
  opacity: number;
  sourceRoundIndex: number;
  targetRoundIndex: number;
};
type MobileRoundMotion = {
  fromRoundIndex: number;
  progress: number;
  toRoundIndex: number;
};
type MobileTouchStart = {
  axis: "pending" | "horizontal" | "vertical";
  clientX: number;
  clientY?: number;
  roundIndex: number;
  scrollLeft: number;
  scrollTop: number;
  startedAt: number;
};
type MobileSnapTarget = {
  roundIndex: number;
  startScrollLeft: number;
  targetScrollLeft: number;
};
type ResolvedKnockoutTeam = {
  fullLabel: string;
  label: string;
  ownerName?: string;
  team?: Team;
};

// ─── Desktop board geometry ───────────────────────────────────────────────
// Card:  130 × 104 px
// Board: 1600 × 1050 px
//
// Col-1: 8 matches, pitch = 131px, centers = 65,196,327,458,589,720,851,982
//   gap between cards = 131 - 104 = 27px ✓
// Col-2: 4 matches, centers = midpoint of each col-1 pair
// Col-3: 2 matches
// Col-4: 1 match (center of board)
const board = {
  width: 1600,
  height: 1050,
  cardWidth: 130,
  cardHeight: 104,
};

// Add 12px inner horizontal padding so cards at board edges
// are not clipped by the board's border-radius.
const BOARD_H_PAD = 12;

const leftColumnX = new Map([
  [1, BOARD_H_PAD],
  [2, BOARD_H_PAD + 212],
  [3, BOARD_H_PAD + 412],
  [4, BOARD_H_PAD + 598],
]);

const rightColumnX = new Map([
  [1, 1600 - board.cardWidth - BOARD_H_PAD],
  [2, 1600 - board.cardWidth - BOARD_H_PAD - 212],
  [3, 1600 - board.cardWidth - BOARD_H_PAD - 412],
  [4, 1600 - board.cardWidth - BOARD_H_PAD - 598],
]);

// pitch = 1050/8 = 131.25 → centers at 65, 196, 327, 458, 589, 720, 851, 982
// col-2 centers = midpoints of col-1 pairs: 131, 393, 655, 917
// col-3 centers: 262, 786  → rounded to 262, 786
// col-4 center: 524
const rowCenters = new Map([
  [1, [65, 196, 327, 458, 589, 720, 851, 982]],
  [2, [131, 393, 655, 917]],
  [3, [262, 786]],
  [4, [524]],
]);

const mobileBoard = {
  cardWidth: 240,
  cardHeight: 108,
  finalCardHeight: 220,
  bronzeCardHeight: 136,
  bronzeCardWidthRatio: 0.82,
  columnGap: 16,
  rowGap: 18,
  finalCardGap: 28,
  branchGap: 50,
  left: 8,
  top: 14,
  bottom: 80,
};

const mobileRoundSnapThreshold = 32;
const mobileRoundSnapDuration = 180;
const mobileFastSwipeDistance = 180;
const mobileFastSwipeVelocity = 1.8;
const mobileGestureAxisThreshold = 6;

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const defaultKnockoutKickoffTime = "03:00";

function getSideColumnX(side: BracketSide, column: number) {
  return (side === "left" ? leftColumnX : rightColumnX).get(column) ?? 0;
}

function getRowCenter(column: number, slot: number) {
  return rowCenters.get(column)?.[slot - 1] ?? board.height / 2;
}

function getMatchPosition(match: KnockoutMatch) {
  const slot = match.bracketSlot ?? 1;

  if (match.side === "center") {
    return {
      x: (board.width - board.cardWidth) / 2,
      // Final at ~55% height, Bronze at ~72% height
      y: (slot === 1 ? Math.round(board.height * 0.55) : Math.round(board.height * 0.72)) - board.cardHeight / 2,
    };
  }

  const side = match.side === "right" ? "right" : "left";
  const column = match.bracketColumn ?? 1;

  return {
    x: getSideColumnX(side, column),
    y: getRowCenter(column, slot) - board.cardHeight / 2,
  };
}

function getBracketMatches(rounds: KnockoutRound[]) {
  return rounds.flatMap((round) =>
    round.matches.map((match) => ({
      ...match,
      round: round.round,
    })),
  );
}

function isFinalRound(round: string) {
  const normalizedRound = round.trim().toLowerCase();

  return normalizedRound === "final" || normalizedRound === "finals";
}

function isRoundOf16(round: string) {
  return round.trim().toLowerCase() === "round of 16";
}

function getMobileCardHeight(match: KnockoutMatch) {
  if (match.badge === "FINAL") {
    return mobileBoard.finalCardHeight;
  }

  if (match.badge === "BRONZE-FINAL") {
    return mobileBoard.bronzeCardHeight;
  }

  return mobileBoard.cardHeight;
}

function getMobileCardWidth(match: KnockoutMatch, finalCardWidth: number) {
  if (match.badge === "FINAL") {
    return finalCardWidth;
  }

  if (match.badge === "BRONZE-FINAL") {
    return Math.max(
      mobileBoard.cardWidth,
      Math.round(finalCardWidth * mobileBoard.bronzeCardWidthRatio),
    );
  }

  return mobileBoard.cardWidth;
}

function getMobileMatchLabel(match: BracketMatch) {
  if (match.badge === "FINAL") {
    return "World Cup Final";
  }

  if (match.badge === "BRONZE-FINAL") {
    return "Bronze-final";
  }

  return match.round;
}

function getMobileBranchKey(match: KnockoutMatch) {
  return match.side && match.side !== "center" ? match.side : "main";
}

function getMobileBranchMatchIndexes(matches: KnockoutRound["matches"]) {
  const branchOrder: string[] = [];
  const branchIndexes = new Map<string, number[]>();

  matches.forEach((match, matchIndex) => {
    const branchKey = getMobileBranchKey(match);

    if (!branchIndexes.has(branchKey)) {
      branchOrder.push(branchKey);
      branchIndexes.set(branchKey, []);
    }

    branchIndexes.get(branchKey)?.push(matchIndex);
  });

  return branchOrder.map((branchKey) => branchIndexes.get(branchKey) ?? []);
}

function getMobileSourcePairIndexes(
  previousRound: KnockoutRound | undefined,
  targetRound: KnockoutRound,
  targetIndex: number,
) {
  const sequentialPair = [targetIndex * 2, targetIndex * 2 + 1] as const;
  const targetMatch = targetRound.matches[targetIndex];

  if (!previousRound || !targetMatch) {
    return sequentialPair;
  }

  const targetBranchKey = getMobileBranchKey(targetMatch);

  if (targetBranchKey === "main") {
    return sequentialPair;
  }

  const sameBranchTargetsBefore = targetRound.matches
    .slice(0, targetIndex)
    .filter((match) => getMobileBranchKey(match) === targetBranchKey).length;
  const sameBranchSourceIndexes = previousRound.matches
    .map((match, matchIndex) => ({
      branchKey: getMobileBranchKey(match),
      matchIndex,
    }))
    .filter(({ branchKey }) => branchKey === targetBranchKey)
    .map(({ matchIndex }) => matchIndex);
  const first = sameBranchSourceIndexes[sameBranchTargetsBefore * 2];
  const second = sameBranchSourceIndexes[sameBranchTargetsBefore * 2 + 1];

  return typeof first === "number" && typeof second === "number"
    ? [first, second]
    : sequentialPair;
}

function formatKnockoutKickoff(kickoff: string) {
  const normalized = kickoff.trim();

  // Full ISO datetime (e.g. "2026-06-29T20:30:00+00:00") → convert to local timezone
  if (normalized.includes("T")) {
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      const time = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
      }).format(date);
      return {
        dateTime: normalized,
        label: `${weekdayLabels[date.getDay()]}, ${monthLabels[date.getMonth()]} ${date.getDate()}\n${time}`,
      };
    }
  }

  // Date-only fallback (e.g. "2026-06-29") — no timezone conversion needed
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return { dateTime: undefined, label: normalized };
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return {
    dateTime: `${year}-${month}-${day}T${defaultKnockoutKickoffTime}`,
    label: `${weekdayLabels[date.getUTCDay()]}, ${monthLabels[date.getUTCMonth()]} ${Number(day)}\n${defaultKnockoutKickoffTime}`,
  };
}

function resolveKnockoutTeam(value: string, teams: Team[]): ResolvedKnockoutTeam {
  const normalizedValue = value.trim().toLowerCase();
  const team = teams.find(
    (candidate) =>
      candidate.code.toLowerCase() === normalizedValue ||
      candidate.name.toLowerCase() === normalizedValue,
  );

  // Use 3-letter code for known teams on desktop, shorten placeholder names
  const label = team
    ? team.code
    : value
        .replace(/group ([a-z])/i, "Grp $1")
        .replace(/winners?/i, "W")
        .replace(/runners?-?up/i, "RU")
        .replace(/best third/i, "3rd")
        .replace(/winner match/i, "W.M")
        .trim();

  // Use full name for mobile; fallback to shortened label for placeholders
  const fullLabel = team ? team.name : label;

  return {
    fullLabel,
    label,
    ownerName: team?.ownedByName,
    team,
  };
}

function KnockoutCrest({ teams, value, faded }: { teams: Team[]; value: string; faded?: boolean }) {
  const [hasImageError, setHasImageError] = useState(false);
  const { team } = resolveKnockoutTeam(value, teams);

  if (!team) {
    return <span className="knockout-crest" aria-hidden="true" />;
  }

  return (
    <span className={`knockout-crest${faded ? " knockout-crest-faded" : ""}`} aria-hidden="true">
      {hasImageError ? (
        <span className="knockout-crest-fallback">{team.flag}</span>
      ) : (
        <img
          alt=""
          className="knockout-crest-image"
          src={`/team-logos/${team.code.toLowerCase()}.png`}
          onError={() => setHasImageError(true)}
        />
      )}
    </span>
  );
}

function KnockoutTeamName({ mobile, teams, value, loser }: { mobile?: boolean; teams: Team[]; value: string; loser?: boolean }) {
  const resolved = resolveKnockoutTeam(value, teams);
  const displayLabel = mobile ? resolved.fullLabel : resolved.label;

  return (
    <span className={`knockout-team-name${loser ? " knockout-team-loser" : ""}`}>
      <span className="knockout-team-label">{displayLabel}</span>
      {resolved.ownerName ? (
        <small className="knockout-owner-name">({resolved.ownerName})</small>
      ) : null}
    </span>
  );
}


function getIndependentMobileRoundCenters(matches: KnockoutRound["matches"]) {
  const centers = new Array<number>(matches.length);
  let cursor = mobileBoard.top;

  getMobileBranchMatchIndexes(matches).forEach((branchMatchIndexes, branchIndex) => {
    if (branchIndex > 0) {
      cursor += mobileBoard.branchGap;
    }

    branchMatchIndexes.forEach((matchIndex) => {
      const match = matches[matchIndex];
      const height = match ? getMobileCardHeight(match) : mobileBoard.cardHeight;

      centers[matchIndex] = cursor + height / 2;
      cursor +=
        height +
        (match?.badge === "FINAL" ? mobileBoard.finalCardGap : mobileBoard.rowGap);
    });
  });

  return centers;
}

function getMobileRoundCenters(rounds: KnockoutRound[], activeRoundIndex: number) {
  const centers: number[][] = [];

  rounds.forEach((round, roundIndex) => {
    if (isFinalRound(round.round)) {
      centers.push(getIndependentMobileRoundCenters(round.matches));
      return;
    }

    if (roundIndex <= activeRoundIndex) {
      centers.push(getIndependentMobileRoundCenters(round.matches));
      return;
    }

    const previousCenters = centers[roundIndex - 1] ?? [];

    centers.push(
      round.matches.map((_, matchIndex) => {
        const [firstIndex, secondIndex] = getMobileSourcePairIndexes(
          rounds[roundIndex - 1],
          round,
          matchIndex,
        );
        const first = previousCenters[firstIndex];
        const second = previousCenters[secondIndex];

        if (typeof first === "number" && typeof second === "number") {
          return (first + second) / 2;
        }

        return mobileBoard.top + mobileBoard.cardHeight / 2 + matchIndex * (mobileBoard.cardHeight + mobileBoard.rowGap);
      }),
    );
  });

  return centers;
}

function makeMobilePairPath(
  sourceA: MobilePositionedMatch,
  sourceB: MobilePositionedMatch,
  target: MobilePositionedMatch,
) {
  const sourceX = sourceA.x + sourceA.width;
  const targetX = target.x;
  const midX = sourceX + (targetX - sourceX) / 2;
  const sourceY1 = sourceA.y + sourceA.height / 2;
  const sourceY2 = sourceB.y + sourceB.height / 2;
  const targetY = target.y + target.height / 2;
  const direction = sourceY2 >= sourceY1 ? 1 : -1;
  const radius = Math.min(14, Math.abs(sourceY2 - sourceY1) / 3, Math.abs(targetX - sourceX) / 3);

  return [
    `M ${sourceX} ${sourceY1} H ${midX - radius}`,
    `Q ${midX} ${sourceY1} ${midX} ${sourceY1 + direction * radius}`,
    `V ${sourceY2 - direction * radius}`,
    `Q ${midX} ${sourceY2} ${midX - radius} ${sourceY2}`,
    `H ${sourceX}`,
    `M ${midX} ${targetY} H ${targetX}`,
  ].join(" ");
}

function getMobileRoundOffsets(rounds: KnockoutRound[]) {
  return rounds.map(
    (_, roundIndex) => mobileBoard.left + roundIndex * (mobileBoard.cardWidth + mobileBoard.columnGap),
  );
}

function getMobileViewportAnchor(scrollLeft: number) {
  return scrollLeft + mobileBoard.left;
}

function getMobileRoundScrollLeft(roundOffsets: number[], roundIndex: number) {
  return Math.max(0, (roundOffsets[roundIndex] ?? 0) - mobileBoard.left);
}

function getClosestMobileRoundIndex(roundOffsets: number[], viewportAnchor: number) {
  return roundOffsets.reduce(
    (closestIndex, offset, roundIndex) =>
      Math.abs(offset - viewportAnchor) <
      Math.abs((roundOffsets[closestIndex] ?? 0) - viewportAnchor)
        ? roundIndex
        : closestIndex,
    0,
  );
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getMobileSnapEaseOut(progress: number) {
  const targetX = clampUnit(progress);
  let lowerBound = 0;
  let upperBound = 1;
  let parameter = targetX;

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const inverse = 1 - parameter;
    const curveX =
      3 * inverse * inverse * parameter * 0.22 +
      3 * inverse * parameter * parameter * 0.36 +
      parameter * parameter * parameter;

    if (curveX < targetX) {
      lowerBound = parameter;
    } else {
      upperBound = parameter;
    }

    parameter = (lowerBound + upperBound) / 2;
  }

  const inverse = 1 - parameter;
  return clampUnit(
    3 * inverse * inverse * parameter +
      3 * inverse * parameter * parameter +
      parameter * parameter * parameter,
  );
}

function getMobileRoundMotion(
  roundOffsets: number[],
  viewportAnchor: number,
): MobileRoundMotion {
  const firstOffset = roundOffsets[0] ?? mobileBoard.left;
  const lastOffset = roundOffsets.at(-1) ?? firstOffset;
  const clampedAnchor = Math.min(lastOffset, Math.max(firstOffset, viewportAnchor));
  const fromRoundIndex = Math.max(
    0,
    roundOffsets.findIndex((offset, roundIndex) => {
      const nextOffset = roundOffsets[roundIndex + 1];

      return typeof nextOffset !== "number" || clampedAnchor <= nextOffset;
    }),
  );
  const toRoundIndex = Math.min(fromRoundIndex + 1, roundOffsets.length - 1);
  const fromOffset = roundOffsets[fromRoundIndex] ?? firstOffset;
  const toOffset = roundOffsets[toRoundIndex] ?? fromOffset;
  const progress =
    toOffset === fromOffset
      ? 0
      : clampUnit((clampedAnchor - fromOffset) / (toOffset - fromOffset));

  return { fromRoundIndex, progress, toRoundIndex };
}

function getRoundSelectionProgress(motion: MobileRoundMotion, roundIndex: number) {
  if (roundIndex === motion.fromRoundIndex) {
    return 1 - motion.progress;
  }

  if (roundIndex === motion.toRoundIndex) {
    return motion.progress;
  }

  return 0;
}

function getMobileConnectorPaths(matchesByRound: MobilePositionedMatch[][], rounds: KnockoutRound[]) {
  const mobileConnectorPaths: MobileConnectorPath[] = [];

  matchesByRound.forEach((roundMatches, roundIndex) => {
    const nextRoundMatches = matchesByRound[roundIndex + 1];
    const nextRound = rounds[roundIndex + 1];

    if (!nextRoundMatches?.length || !nextRound) {
      return;
    }

    if (isFinalRound(nextRound.round)) {
      const finalMatch = nextRoundMatches.find((match) => match.badge === "FINAL") ?? nextRoundMatches[0];

      if (roundMatches.length >= 2 && finalMatch) {
        mobileConnectorPaths.push({
          d: makeMobilePairPath(roundMatches[0], roundMatches[1], finalMatch),
          opacity: Math.min(roundMatches[0].opacity, roundMatches[1].opacity, finalMatch.opacity),
          sourceRoundIndex: roundIndex,
          targetRoundIndex: roundIndex + 1,
        });
      }

      return;
    }

    nextRoundMatches.forEach((target, targetIndex) => {
      const [sourceAIndex, sourceBIndex] = getMobileSourcePairIndexes(
        rounds[roundIndex],
        nextRound,
        targetIndex,
      );
      const sourceA = roundMatches[sourceAIndex];
      const sourceB = roundMatches[sourceBIndex];

      if (sourceA && sourceB) {
        mobileConnectorPaths.push({
          d: makeMobilePairPath(sourceA, sourceB, target),
          opacity: Math.min(sourceA.opacity, sourceB.opacity, target.opacity),
          sourceRoundIndex: roundIndex,
          targetRoundIndex: roundIndex + 1,
        });
      }
    });
  });

  return mobileConnectorPaths;
}

function getMobileLayoutHeight(matches: MobilePositionedMatch[]) {
  return (
    Math.max(
      mobileBoard.top + mobileBoard.cardHeight,
      ...matches.map((match) => match.y + match.height),
    ) + mobileBoard.bottom
  );
}

function interpolateNumber(start: number, end: number, progress: number) {
  return Math.round((start + (end - start) * progress) * 1000) / 1000;
}

function getAnchoredMobileBracketLayout(
  rounds: KnockoutRound[],
  activeRoundIndex = 0,
  expandedFinalWidth = mobileBoard.cardWidth,
) {
  const safeActiveRoundIndex =
    activeRoundIndex >= 0 && activeRoundIndex < rounds.length ? activeRoundIndex : 0;
  const roundCenters = getMobileRoundCenters(rounds, safeActiveRoundIndex);
  const roundOffsets = getMobileRoundOffsets(rounds);
  const matchesByRound = rounds.map((round, roundIndex) =>
    round.matches.map((match, matchIndex) => {
      const height = getMobileCardHeight(match);
      const width = getMobileCardWidth(match, expandedFinalWidth);
      const centerInFinalColumn =
        match.badge === "FINAL" || match.badge === "BRONZE-FINAL";
      const x =
        (roundOffsets[roundIndex] ?? mobileBoard.left) +
        (centerInFinalColumn ? (expandedFinalWidth - width) / 2 : 0);

      return {
        ...match,
        round: round.round,
        height,
        opacity: 1,
        roundIndex,
        width,
        x,
        y: (roundCenters[roundIndex]?.[matchIndex] ?? mobileBoard.top + height / 2) - height / 2,
      };
    }),
  );

  const positionedMatches = matchesByRound.flat();
  const heightSourceMatches = matchesByRound[safeActiveRoundIndex] ?? positionedMatches;
  const width = Math.max(
    (roundOffsets.at(-1) ?? 0) + mobileBoard.cardWidth + mobileBoard.left,
    ...positionedMatches.map((match) => match.x + match.width + mobileBoard.left),
  );
  const quarterFinalsIndex = rounds.findIndex(
    (round) => round.round.trim().toLowerCase() === "quarter-finals",
  );
  const retainedHeightMatches =
    quarterFinalsIndex >= 0 && safeActiveRoundIndex > quarterFinalsIndex
      ? matchesByRound[quarterFinalsIndex]
      : undefined;
  const height = Math.max(
    getMobileLayoutHeight(heightSourceMatches),
    retainedHeightMatches ? getMobileLayoutHeight(retainedHeightMatches) : 0,
  );

  return {
    connectorPaths: getMobileConnectorPaths(matchesByRound, rounds),
    height,
    matches: positionedMatches,
    matchesByRound,
    roundOffsets,
    width,
  };
}

function getMobileBracketLayout(
  rounds: KnockoutRound[],
  scrollLeft = 0,
  expandedFinalWidth = mobileBoard.cardWidth,
) {
  const roundOffsets = getMobileRoundOffsets(rounds);

  if (rounds.length <= 1) {
    return getAnchoredMobileBracketLayout(rounds, 0, expandedFinalWidth);
  }

  const { fromRoundIndex, progress, toRoundIndex } = getMobileRoundMotion(
    roundOffsets,
    getMobileViewportAnchor(scrollLeft),
  );
  const fromLayout = getAnchoredMobileBracketLayout(
    rounds,
    fromRoundIndex,
    expandedFinalWidth,
  );
  const toLayout =
    progress > 0
      ? getAnchoredMobileBracketLayout(rounds, toRoundIndex, expandedFinalWidth)
      : fromLayout;
  const matchesByRound = fromLayout.matchesByRound.map((roundMatches, roundIndex) =>
    roundMatches.map((match, matchIndex) => {
      const toMatch = toLayout.matchesByRound[roundIndex]?.[matchIndex] ?? match;

      return {
        ...match,
        height: interpolateNumber(match.height, toMatch.height, progress),
        opacity:
          roundIndex < fromRoundIndex
            ? 0
            : roundIndex === fromRoundIndex
              ? 1 - progress
              : 1,
        width: interpolateNumber(match.width, toMatch.width, progress),
        x: interpolateNumber(match.x, toMatch.x, progress),
        y: interpolateNumber(match.y, toMatch.y, progress),
      };
    }),
  );
  const positionedMatches = matchesByRound.flat();
  const height = interpolateNumber(fromLayout.height, toLayout.height, progress);
  const interpolatedWidth = interpolateNumber(fromLayout.width, toLayout.width, progress);

  return {
    connectorPaths: getMobileConnectorPaths(matchesByRound, rounds),
    height,
    matches: positionedMatches,
    roundOffsets,
    width: interpolatedWidth,
  };
}

function makeElbowPath(side: BracketSide, column: number, targetSlot: number) {
  const nextColumn = column + 1;
  const firstSourceSlot = targetSlot * 2 - 1;
  const secondSourceSlot = targetSlot * 2;
  const sourceY1 = getRowCenter(column, firstSourceSlot);
  const sourceY2 = getRowCenter(column, secondSourceSlot);
  const targetY = getRowCenter(nextColumn, targetSlot);

  const sourceX =
    side === "left"
      ? getSideColumnX(side, column) + board.cardWidth
      : getSideColumnX(side, column);
  const targetX =
    side === "left"
      ? getSideColumnX(side, nextColumn)
      : getSideColumnX(side, nextColumn) + board.cardWidth;
  const midX = sourceX + (targetX - sourceX) / 2;

  return [
    `M ${sourceX} ${sourceY1} H ${midX}`,
    `M ${sourceX} ${sourceY2} H ${midX}`,
    `M ${midX} ${sourceY1} V ${sourceY2}`,
    `M ${midX} ${targetY} H ${targetX}`,
  ].join(" ");
}

function makeSemiFinalPath(side: BracketSide) {
  const sourceX =
    side === "left"
      ? getSideColumnX(side, 4) + board.cardWidth
      : getSideColumnX(side, 4);
  const targetX =
    side === "left"
      ? (board.width - board.cardWidth) / 2
      : (board.width + board.cardWidth) / 2;
  const y = getRowCenter(4, 1);

  return `M ${sourceX} ${y} H ${targetX}`;
}

function getConnectorPaths() {
  const paths: string[] = [];

  (["left", "right"] as const).forEach((side) => {
    [1, 2, 3].forEach((column) => {
      const targetSlots = (rowCenters.get(column + 1)?.length ?? 0);

      for (let slot = 1; slot <= targetSlots; slot += 1) {
        paths.push(makeElbowPath(side, column, slot));
      }
    });

    paths.push(makeSemiFinalPath(side));
  });

  return paths;
}

const TERMINAL_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

function isFinished(statusShort?: string) {
  return TERMINAL_STATUSES.has(statusShort ?? "");
}

function getLoser(match: KnockoutMatch): "home" | "away" | null {
  if (!isFinished(match.statusShort)) return null;
  if (match.homeWinner === true && match.awayWinner !== true) return "away";
  if (match.awayWinner === true && match.homeWinner !== true) return "home";
  if (
    match.statusShort === "PEN" &&
    match.penaltyHomeScore != null &&
    match.penaltyAwayScore != null &&
    match.penaltyHomeScore !== match.penaltyAwayScore
  ) {
    return match.penaltyHomeScore > match.penaltyAwayScore ? "away" : "home";
  }
  if (match.homeScore > match.awayScore) return "away";
  if (match.awayScore > match.homeScore) return "home";
  return null; // draw (shouldn't happen in knockout, but safe)
}

function MatchCard({ match, teams }: { match: BracketMatch; teams: Team[] }) {
  const position = getMatchPosition(match);
  const kickoff = formatKnockoutKickoff(match.kickoff);
  const finished = isFinished(match.statusShort);
  const loser = getLoser(match);
  const style = {
    left: position.x,
    top: position.y,
  } satisfies CSSProperties;

  return (
    <article
      aria-label={`${match.round}: ${match.homeTeam} vs ${match.awayTeam}, ${finished ? `${match.homeScore}-${match.awayScore}` : kickoff.label.replace("\n", " ")}`}
      className={`knockout-card${match.badge ? " knockout-card-featured" : ""}${finished ? " knockout-card-finished" : ""}`}
      data-badge={match.badge}
      style={style}
    >
      <div className="knockout-card-crests" aria-hidden="true">
        <KnockoutCrest teams={teams} value={match.homeTeam} faded={loser === "home"} />
        <KnockoutCrest teams={teams} value={match.awayTeam} faded={loser === "away"} />
      </div>
      <div className="knockout-card-teams">
        <KnockoutTeamName teams={teams} value={match.homeTeam} loser={loser === "home"} />
        <KnockoutTeamName teams={teams} value={match.awayTeam} loser={loser === "away"} />
      </div>
      {finished ? (
        <div className="knockout-card-score">
          <span>{match.homeScore}</span>
          <span className="knockout-card-score-sep">–</span>
          <span>{match.awayScore}</span>
        </div>
      ) : (
        <time className="knockout-card-date" dateTime={kickoff.dateTime}>{kickoff.label}</time>
      )}
      {match.badge ? <span className="knockout-card-badge">{match.badge}</span> : null}
    </article>
  );
}

function MobileBracketMatchCard({ match, teams }: { match: MobilePositionedMatch; teams: Team[] }) {
  const kickoff = formatKnockoutKickoff(match.kickoff);
  const finished = isFinished(match.statusShort);
  const loser = getLoser(match);
  const style = {
    "--knockout-mobile-card-height": `${match.height}px`,
    left: match.x,
    opacity: match.opacity,
    top: match.y,
    width: match.width,
  } as CSSProperties & Record<"--knockout-mobile-card-height", string>;

  return (
    <article
      aria-label={`${match.round}: ${match.homeTeam} vs ${match.awayTeam}, ${finished ? `${match.homeScore}-${match.awayScore}` : kickoff.label.replace("\n", " ")}`}
      className={`knockout-mobile-bracket-card${match.badge === "FINAL" ? " knockout-mobile-bracket-final" : ""}${finished ? " knockout-card-finished" : ""}`}
      data-badge={match.badge}
      data-round-index={match.roundIndex}
      style={style}
    >
      {match.badge === "FINAL" ? (
        <>
          <div className="knockout-mobile-final-stage">
            <div className="knockout-mobile-final-contender">
              <KnockoutCrest teams={teams} value={match.homeTeam} faded={loser === "home"} />
              <KnockoutTeamName mobile teams={teams} value={match.homeTeam} loser={loser === "home"} />
            </div>
            <div className="knockout-mobile-final-trophy" aria-hidden="true">
              <Trophy size={64} strokeWidth={1.35} />
            </div>
            <div className="knockout-mobile-final-contender">
              <KnockoutCrest teams={teams} value={match.awayTeam} faded={loser === "away"} />
              <KnockoutTeamName mobile teams={teams} value={match.awayTeam} loser={loser === "away"} />
            </div>
          </div>
          <div className="knockout-mobile-final-meta">
            <strong>{match.venue}</strong>
            {finished ? (
              <div className="knockout-card-score knockout-card-score-final">
                <span>{match.homeScore}</span>
                <span className="knockout-card-score-sep">–</span>
                <span>{match.awayScore}</span>
              </div>
            ) : (
              <time dateTime={kickoff.dateTime}>{kickoff.label.replace("\n", ", ")}</time>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="knockout-mobile-card-label">
            <span aria-hidden="true" />
            <strong>{getMobileMatchLabel(match)}</strong>
          </div>
          {match.badge === "BRONZE-FINAL" ? (
            <strong className="knockout-mobile-bronze-venue">{match.venue}</strong>
          ) : null}
          <div className="knockout-mobile-card-body">
            <div className="knockout-mobile-card-teams">
              <div className="knockout-mobile-card-team">
                <KnockoutCrest teams={teams} value={match.homeTeam} faded={loser === "home"} />
                <KnockoutTeamName mobile teams={teams} value={match.homeTeam} loser={loser === "home"} />
              </div>
              <div className="knockout-mobile-card-team">
                <KnockoutCrest teams={teams} value={match.awayTeam} faded={loser === "away"} />
                <KnockoutTeamName mobile teams={teams} value={match.awayTeam} loser={loser === "away"} />
              </div>
            </div>
            {finished ? (
              <div className="knockout-card-score">
                <span>{match.homeScore}</span>
                <span className="knockout-card-score-sep">–</span>
                <span>{match.awayScore}</span>
              </div>
            ) : (
              <time dateTime={kickoff.dateTime}>{kickoff.label}</time>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export function KnockoutTab({
  onFastForwardSwipe,
  rounds,
  teams,
}: {
  onFastForwardSwipe?: () => void;
  rounds: KnockoutRound[];
  teams: Team[];
}) {
  const [activeMobileRound, setActiveMobileRound] = useState("");
  const [mobileScrollLeft, setMobileScrollLeft] = useState(0);
  const [mobileViewportWidth, setMobileViewportWidth] = useState(0);
  const mobileBoardScrollRef = useRef<HTMLDivElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const [boardScale, setBoardScale] = useState(1);
  const mobileRoundButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileTouchStartRef = useRef<MobileTouchStart | null>(null);
  const mobileSnapTargetRef = useRef<MobileSnapTarget | null>(null);
  const mobileSnapAnimationFrameRef = useRef<number | null>(null);
  const mobileScrollFrameRef = useRef<number | null>(null);
  const latestMobileScrollLeftRef = useRef(0);
  const matches = useMemo(() => getBracketMatches(rounds), [rounds]);
  const connectorPaths = useMemo(() => getConnectorPaths(), []);
  const expandedFinalWidth = Math.max(
    mobileBoard.cardWidth,
    mobileViewportWidth - mobileBoard.left * 2,
  );
  const mobileLayout = useMemo(
    () => getMobileBracketLayout(rounds, mobileScrollLeft, expandedFinalWidth),
    [rounds, expandedFinalWidth, mobileScrollLeft],
  );
  const mobileRoundMotion = useMemo(
    () =>
      getMobileRoundMotion(
        mobileLayout.roundOffsets,
        getMobileViewportAnchor(mobileScrollLeft),
      ),
    [mobileLayout.roundOffsets, mobileScrollLeft],
  );

  // Auto-scale desktop board to fit container width without horizontal scroll
  useEffect(() => {
    const el = boardScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const containerWidth = entries[0]?.contentRect.width ?? el.clientWidth;
      if (containerWidth > 0) {
        setBoardScale(Math.min(1, containerWidth / board.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rounds.length) {
      setActiveMobileRound("");
      setMobileScrollLeft(0);
      return;
    }

    setActiveMobileRound((currentRound) =>
      rounds.some((round) => round.round === currentRound) ? currentRound : rounds[0].round,
    );
  }, [rounds]);

  useEffect(
    () => () => {
      if (mobileScrollFrameRef.current !== null) {
        cancelAnimationFrame(mobileScrollFrameRef.current);
      }
      if (mobileSnapAnimationFrameRef.current !== null) {
        cancelAnimationFrame(mobileSnapAnimationFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const updateMobileViewportWidth = () => {
      const nextWidth = mobileBoardScrollRef.current?.clientWidth ?? 0;
      setMobileViewportWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateMobileViewportWidth();
    window.addEventListener("resize", updateMobileViewportWidth);
    return () => window.removeEventListener("resize", updateMobileViewportWidth);
  }, []);

  const selectedMobileRound = rounds.find((round) => round.round === activeMobileRound) ?? rounds[0];
  const settleMobileRound = (roundIndex: number) => {
    const targetRound = rounds[roundIndex];

    if (!targetRound) {
      return;
    }

    mobileSnapTargetRef.current = null;
    setActiveMobileRound(targetRound.round);
    mobileRoundButtonRefs.current[roundIndex]?.scrollIntoView?.({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
  };

  const scheduleMobileScrollUpdate = (scrollLeft: number) => {
    latestMobileScrollLeftRef.current = scrollLeft;

    if (mobileScrollFrameRef.current !== null) {
      return;
    }

    mobileScrollFrameRef.current = requestAnimationFrame(() => {
      mobileScrollFrameRef.current = null;
      // debug removed from rAF to reduce noise
      setMobileScrollLeft(latestMobileScrollLeftRef.current);
    });
  };

  const cancelMobileSnapAnimation = () => {
    if (mobileSnapAnimationFrameRef.current === null) {
      return;
    }

    cancelAnimationFrame(mobileSnapAnimationFrameRef.current);
    mobileSnapAnimationFrameRef.current = null;
  };

  const animateMobileSnap = (
    targetScrollLeft: number,
    targetScrollTop: number,
    targetRoundIndex: number,
  ) => {
    const scroller = mobileBoardScrollRef.current;

    if (!scroller) {
      return;
    }

    cancelMobileSnapAnimation();
    const startScrollLeft = latestMobileScrollLeftRef.current;
    const startScrollTop = scroller.scrollTop;
    let startedAt: number | null = null;

    const animateFrame = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = clampUnit((timestamp - startedAt) / mobileRoundSnapDuration);
      const easedProgress = getMobileSnapEaseOut(progress);
      const nextScrollLeft =
        startScrollLeft + (targetScrollLeft - startScrollLeft) * easedProgress;
      const nextScrollTop =
        startScrollTop + (targetScrollTop - startScrollTop) * easedProgress;

      scroller.scrollTop = nextScrollTop;
      latestMobileScrollLeftRef.current = nextScrollLeft;
      scheduleMobileScrollUpdate(nextScrollLeft);

      if (progress < 1) {
        mobileSnapAnimationFrameRef.current = requestAnimationFrame(animateFrame);
        return;
      }

      mobileSnapAnimationFrameRef.current = null;
      scroller.scrollTop = targetScrollTop;
      latestMobileScrollLeftRef.current = targetScrollLeft;
      setMobileScrollLeft(targetScrollLeft);
      settleMobileRound(targetRoundIndex);
    };

    mobileSnapAnimationFrameRef.current = requestAnimationFrame(animateFrame);
  };

  const snapToMobileRound = (roundIndex: number, scrollTop = 0) => {
    const targetRound = rounds[roundIndex];

    if (!targetRound) {
      return;
    }

    const nextScrollLeft = getMobileRoundScrollLeft(mobileLayout.roundOffsets, roundIndex);

    const currentScrollLeft = latestMobileScrollLeftRef.current;
    mobileSnapTargetRef.current = {
      roundIndex,
      startScrollLeft: currentScrollLeft,
      targetScrollLeft: nextScrollLeft,
    };
    animateMobileSnap(nextScrollLeft, scrollTop, roundIndex);
  };

  const handleMobileBracketScroll = (scroller: HTMLDivElement) => {
    const scrollLeft = latestMobileScrollLeftRef.current;
    const touching = mobileTouchStartRef.current;

    if (touching) {
      return;
    }

    const shouldThrottle = mobileSnapTargetRef.current !== null;

    if (shouldThrottle) {
      scheduleMobileScrollUpdate(scrollLeft);
    } else {
      setMobileScrollLeft(scrollLeft);
    }

    const targetRoundIndex =
      mobileSnapTargetRef.current?.roundIndex ??
      getClosestMobileRoundIndex(
        mobileLayout.roundOffsets,
        getMobileViewportAnchor(scrollLeft),
      );
    const targetScrollLeft = getMobileRoundScrollLeft(
      mobileLayout.roundOffsets,
      targetRoundIndex,
    );

    if (Math.abs(scrollLeft - targetScrollLeft) <= 1) {

      if (mobileScrollFrameRef.current !== null) {
        cancelAnimationFrame(mobileScrollFrameRef.current);
        mobileScrollFrameRef.current = null;
      }
      latestMobileScrollLeftRef.current = targetScrollLeft;
      setMobileScrollLeft(targetScrollLeft);
      settleMobileRound(targetRoundIndex);
    }
  };

  const handleMobileBracketTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();

    cancelMobileSnapAnimation();
    const scrollLeft = latestMobileScrollLeftRef.current;
    const touch = event.touches[0];
    const roundIndex = getClosestMobileRoundIndex(
      mobileLayout.roundOffsets,
      getMobileViewportAnchor(scrollLeft),
    );



    mobileSnapTargetRef.current = null;
    mobileTouchStartRef.current = {
      axis: "pending",
      clientX: touch?.clientX ?? 0,
      clientY: touch?.clientY,
      roundIndex,
      scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      startedAt: event.timeStamp,
    };
  };

  const handleMobileBracketTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();

    const gestureStart = mobileTouchStartRef.current;
    const touch = event.touches[0];

    if (!gestureStart || !touch) {
      return;
    }

    const horizontalDelta = gestureStart.clientX - touch.clientX;
    const verticalDelta =
      gestureStart.clientY === undefined ? 0 : gestureStart.clientY - touch.clientY;

    if (gestureStart.axis === "pending") {
      if (
        Math.abs(horizontalDelta) < mobileGestureAxisThreshold &&
        Math.abs(verticalDelta) < mobileGestureAxisThreshold
      ) {
        return;
      }

      gestureStart.axis =
        Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? "horizontal" : "vertical";
    }

    if (gestureStart.axis !== "horizontal") {

      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    const lastRoundIndex = Math.max(0, mobileLayout.roundOffsets.length - 1);
    const maxScrollLeft = getMobileRoundScrollLeft(
      mobileLayout.roundOffsets,
      lastRoundIndex,
    );
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, gestureStart.scrollLeft + horizontalDelta),
    );


    scheduleMobileScrollUpdate(nextScrollLeft);
  };

  const finishMobileBracketGesture = (
    event: TouchEvent<HTMLDivElement>,
    allowFastForward: boolean,
  ) => {
    event.stopPropagation();

    const gestureStart = mobileTouchStartRef.current;
    mobileTouchStartRef.current = null;

    if (!gestureStart) {
      return;
    }

    const changedTouch = event.changedTouches[0];
    const scrollHorizontalDelta = latestMobileScrollLeftRef.current - gestureStart.scrollLeft;
    const scrollVerticalDelta = event.currentTarget.scrollTop - gestureStart.scrollTop;
    const touchHorizontalDelta = changedTouch
      ? gestureStart.clientX - changedTouch.clientX
      : scrollHorizontalDelta;
    const horizontalDelta =
      Math.abs(scrollHorizontalDelta) > Math.abs(touchHorizontalDelta)
        ? scrollHorizontalDelta
        : touchHorizontalDelta;
    const verticalDelta =
      changedTouch && gestureStart.clientY !== undefined && changedTouch.clientY !== undefined
        ? gestureStart.clientY - changedTouch.clientY
        : scrollVerticalDelta;
    const gestureDuration = Math.max(1, event.timeStamp - gestureStart.startedAt);
    const horizontalVelocity = Math.abs(horizontalDelta) / gestureDuration;

    if (
      gestureStart.axis === "vertical" ||
      Math.abs(verticalDelta) > Math.abs(horizontalDelta)
    ) {
      const targetScrollLeft = getMobileRoundScrollLeft(
        mobileLayout.roundOffsets,
        gestureStart.roundIndex,
      );

      latestMobileScrollLeftRef.current = targetScrollLeft;
      setMobileScrollLeft(targetScrollLeft);
      settleMobileRound(gestureStart.roundIndex);
      return;
    }

    if (
      horizontalDelta >= mobileFastSwipeDistance &&
      horizontalVelocity >= mobileFastSwipeVelocity &&
      allowFastForward &&
      onFastForwardSwipe
    ) {
      mobileSnapTargetRef.current = null;
      onFastForwardSwipe();
      return;
    }

    let targetRoundIndex = gestureStart.roundIndex;

    if (Math.abs(horizontalDelta) >= mobileRoundSnapThreshold) {
      targetRoundIndex += horizontalDelta > 0 ? 1 : -1;
    }

    const nextRoundIndex = Math.min(rounds.length - 1, Math.max(0, targetRoundIndex));

    if (
      nextRoundIndex === rounds.length - 1 &&
      targetRoundIndex > rounds.length - 1 &&
      allowFastForward &&
      onFastForwardSwipe
    ) {
      mobileSnapTargetRef.current = null;
      onFastForwardSwipe();
      return;
    }



    snapToMobileRound(
      nextRoundIndex,
      nextRoundIndex === gestureStart.roundIndex ? event.currentTarget.scrollTop : 0,
    );
  };

  const handleMobileBracketTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    finishMobileBracketGesture(event, true);
  };

  const handleMobileBracketTouchCancel = (event: TouchEvent<HTMLDivElement>) => {
    finishMobileBracketGesture(event, false);
  };

  const handleMobileRoundSelect = (roundIndex: number) => {
    snapToMobileRound(roundIndex);
  };

  return (
    <div className="knockout-shell">

      <div
        className="knockout-board-scroll"
        ref={boardScrollRef}
        style={{ height: `${Math.round(board.height * boardScale)}px` }}
      >
        <section
          aria-label="World Cup knockout bracket"
          className="knockout-board"
          style={{
            "--knockout-board-width": `${board.width}px`,
            "--knockout-board-height": `${board.height}px`,
            transform: boardScale < 1 ? `scale(${boardScale})` : undefined,
            transformOrigin: "top left",
          } as CSSProperties}
        >
          <svg
            aria-hidden="true"
            className="knockout-connectors"
            focusable="false"
            viewBox={`0 0 ${board.width} ${board.height}`}
          >
            {connectorPaths.map((path, index) => (
              <path key={`${path}-${index}`} d={path} />
            ))}
          </svg>

          <div className="knockout-champion-node" aria-hidden="true">
            <Trophy size={82} strokeWidth={1.45} />
            <span className="knockout-champion-help">?</span>
            <strong>CHAMPION</strong>
          </div>

          {matches.map((match) => (
            <MatchCard key={match.id} match={match} teams={teams} />
          ))}
        </section>
      </div>

      <section className="knockout-mobile" aria-label="World Cup knockout rounds">
        <div className="knockout-round-strip" role="tablist" aria-label="Knockout rounds">
          {rounds.map((round, roundIndex) => {
            const selectionProgress = getRoundSelectionProgress(
              mobileRoundMotion,
              roundIndex,
            );

            return (
              <button
                key={round.round}
                ref={(node) => {
                  mobileRoundButtonRefs.current[roundIndex] = node;
                }}
                aria-selected={selectedMobileRound?.round === round.round}
                className="knockout-round-chip"
                role="tab"
                type="button"
                aria-label={round.round}
                onClick={() => handleMobileRoundSelect(roundIndex)}
                style={
                  {
                    "--round-selection-progress": selectionProgress,
                    "--round-selection-percent": `${selectionProgress * 100}%`,
                  } as CSSProperties
                }
              >
                <strong>{round.round}</strong>
              </button>
            );
          })}
        </div>

        <div
          className="knockout-mobile-bracket-scroll"
          data-tab-swipe-ignore="true"
          ref={mobileBoardScrollRef}
          onScroll={(event) => handleMobileBracketScroll(event.currentTarget)}
          onTouchCancel={handleMobileBracketTouchCancel}
          onTouchEnd={handleMobileBracketTouchEnd}
          onTouchMove={handleMobileBracketTouchMove}
          onTouchStart={handleMobileBracketTouchStart}
        >
          <div
            className="knockout-mobile-bracket-board"
            style={
              {
                "--knockout-mobile-board-height": `${mobileLayout.height}px`,
                "--knockout-mobile-board-width": `${mobileLayout.width}px`,
                transform: `translateX(-${mobileScrollLeft}px)`,
              } as CSSProperties
            }
          >
            <svg
              aria-hidden="true"
              className="knockout-mobile-connectors"
              focusable="false"
              viewBox={`0 0 ${mobileLayout.width} ${mobileLayout.height}`}
            >
              {mobileLayout.connectorPaths.map((connector, index) => (
                <path
                  data-source-round-index={connector.sourceRoundIndex}
                  data-target-round-index={connector.targetRoundIndex}
                  key={`${connector.d}-${index}`}
                  d={connector.d}
                  style={{ opacity: connector.opacity }}
                />
              ))}
            </svg>

            {mobileLayout.matches.map((match) => (
              <MobileBracketMatchCard
                key={`mobile-${match.id}`}
                match={match}
                teams={teams}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
