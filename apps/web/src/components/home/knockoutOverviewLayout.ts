import type { KnockoutRound } from "../../lib/types";

type KnockoutMatch = KnockoutRound["matches"][number];

export type OverviewPositionedMatch = KnockoutMatch & {
  height: number;
  round: string;
  width: number;
  x: number;
  y: number;
};

export type OverviewConnector = {
  d: string;
  sourceId: string;
  targetId: string;
};

export type KnockoutOverviewLayout = {
  champion: { x: number; y: number };
  connectors: OverviewConnector[];
  height: number;
  matches: OverviewPositionedMatch[];
  width: number;
};

const horizontalPadding = 6;
const compactGap = 6;
const compactCardHeight = 76;
const stageCardHeight = 82;
const stageGap = 48;

function makeConnector(
  source: OverviewPositionedMatch,
  target: OverviewPositionedMatch,
): OverviewConnector {
  const sourceX = source.x + source.width / 2;
  const targetX = target.x + target.width / 2;
  const targetIsBelow = target.y >= source.y;
  const sourceY = targetIsBelow ? source.y + source.height : source.y;
  const targetY = targetIsBelow ? target.y : target.y + target.height;
  const middleY = sourceY + (targetY - sourceY) / 2;

  return {
    d: `M ${sourceX} ${sourceY} V ${middleY} H ${targetX} V ${targetY}`,
    sourceId: source.id,
    targetId: target.id,
  };
}

function bySlot(a: KnockoutMatch, b: KnockoutMatch) {
  return (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0);
}

export function getKnockoutOverviewLayout(
  rounds: KnockoutRound[],
  viewportWidth: number,
): KnockoutOverviewLayout {
  const width = Math.max(1, viewportWidth);

  if (!rounds.length) {
    return {
      champion: { x: width / 2, y: 32 },
      connectors: [],
      height: 160,
      matches: [],
      width,
    };
  }

  const roundByMatchId = new Map<string, string>();
  const allMatches = rounds.flatMap((round) =>
    round.matches.map((match) => {
      roundByMatchId.set(match.id, round.round);
      return match;
    }),
  );
  const sideMatches = (side: "left" | "right", column: number) =>
    allMatches
      .filter(
        (match) => match.side === side && match.bracketColumn === column,
      )
      .sort(bySlot);
  const centerMatches = allMatches.filter((match) => match.side === "center");
  const compactCardWidth =
    (width - horizontalPadding * 2 - compactGap * 3) / 4;
  const stageCardWidth = Math.min(112, (width - horizontalPadding * 2 - 24) / 2);
  const compactXs = Array.from(
    { length: 4 },
    (_, index) => horizontalPadding + index * (compactCardWidth + compactGap),
  );
  const pairCenters = [
    (compactXs[0] + compactCardWidth / 2 + compactXs[1] + compactCardWidth / 2) / 2,
    (compactXs[2] + compactCardWidth / 2 + compactXs[3] + compactCardWidth / 2) / 2,
  ];
  const pairXs = pairCenters.map((center) => center - stageCardWidth / 2);
  const centerX = (width - stageCardWidth) / 2;
  const positionedMatches: OverviewPositionedMatch[] = [];
  const connectors: OverviewConnector[] = [];
  const position = (
    match: KnockoutMatch,
    x: number,
    y: number,
    cardWidth = stageCardWidth,
    height = stageCardHeight,
  ): OverviewPositionedMatch => ({
    ...match,
    height,
    round: roundByMatchId.get(match.id) ?? "",
    width: cardWidth,
    x,
    y,
  });

  const topRoundOf16Y = 16;
  const topQuarterFinalY = topRoundOf16Y + compactCardHeight + stageGap;
  const topSemiFinalY = topQuarterFinalY + stageCardHeight + stageGap;
  const centerStageY = topSemiFinalY + stageCardHeight + stageGap;

  const topRoundOf16 = sideMatches("left", 2).map((match, index) =>
    position(match, compactXs[index] ?? compactXs[0], topRoundOf16Y, compactCardWidth, compactCardHeight),
  );
  const topQuarterFinals = sideMatches("left", 3).map((match, index) =>
    position(match, pairXs[index] ?? centerX, topQuarterFinalY),
  );
  const topSemiFinal = sideMatches("left", 4).map((match) =>
    position(match, centerX, topSemiFinalY),
  );
  const finalMatch = centerMatches.find((match) => match.badge === "FINAL");
  const bronzeMatch = centerMatches.find((match) => match.badge === "BRONZE-FINAL");
  const centerPairWidth = stageCardWidth * 2 + 12;
  const centerPairX = (width - centerPairWidth) / 2;
  const finalPosition = finalMatch
    ? position(finalMatch, centerPairX + stageCardWidth + 12, centerStageY)
    : undefined;
  const bronzePosition = bronzeMatch
    ? position(bronzeMatch, centerPairX, centerStageY)
    : undefined;
  const champion = {
    x: width / 2,
    y: centerStageY + stageCardHeight + 34,
  };
  const bottomSemiFinalY = champion.y + 98;
  const bottomQuarterFinalY = bottomSemiFinalY + stageCardHeight + stageGap;
  const bottomRoundOf16Y = bottomQuarterFinalY + stageCardHeight + stageGap;
  const bottomSemiFinal = sideMatches("right", 4).map((match) =>
    position(match, centerX, bottomSemiFinalY),
  );
  const bottomQuarterFinals = sideMatches("right", 3).map((match, index) =>
    position(match, pairXs[index] ?? centerX, bottomQuarterFinalY),
  );
  const bottomRoundOf16 = sideMatches("right", 2).map((match, index) =>
    position(match, compactXs[index] ?? compactXs[0], bottomRoundOf16Y, compactCardWidth, compactCardHeight),
  );

  positionedMatches.push(
    ...topRoundOf16,
    ...topQuarterFinals,
    ...topSemiFinal,
    ...[bronzePosition, finalPosition].filter(
      (match): match is OverviewPositionedMatch => Boolean(match),
    ),
    ...bottomSemiFinal,
    ...bottomQuarterFinals,
    ...bottomRoundOf16,
  );

  topRoundOf16.forEach((source, index) => {
    const target = topQuarterFinals[Math.floor(index / 2)];
    if (target) connectors.push(makeConnector(source, target));
  });
  topQuarterFinals.forEach((source) => {
    const target = topSemiFinal[0];
    if (target) connectors.push(makeConnector(source, target));
  });
  if (topSemiFinal[0] && finalPosition) {
    connectors.push(makeConnector(topSemiFinal[0], finalPosition));
  }
  if (bottomSemiFinal[0] && finalPosition) {
    connectors.push(makeConnector(bottomSemiFinal[0], finalPosition));
  }
  bottomQuarterFinals.forEach((target) => {
    const source = bottomSemiFinal[0];
    if (source) connectors.push(makeConnector(source, target));
  });
  bottomRoundOf16.forEach((target, index) => {
    const source = bottomQuarterFinals[Math.floor(index / 2)];
    if (source) connectors.push(makeConnector(source, target));
  });

  return {
    champion,
    connectors,
    height: Math.max(160, bottomRoundOf16Y + compactCardHeight + 70),
    matches: positionedMatches,
    width,
  };
}
