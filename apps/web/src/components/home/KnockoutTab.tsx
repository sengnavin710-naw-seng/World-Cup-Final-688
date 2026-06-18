import { Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { KnockoutRound, Team } from "../../lib/types";

type KnockoutMatch = KnockoutRound["matches"][number];
type BracketSide = "left" | "right";
type BracketMatch = KnockoutMatch & { round: string };
type MobilePositionedMatch = BracketMatch & {
  height: number;
  x: number;
  y: number;
};
type ResolvedKnockoutTeam = {
  label: string;
  ownerName?: string;
};

const board = {
  width: 1280,
  height: 684,
  cardWidth: 86,
  cardHeight: 80,
};

const leftColumnX = new Map([
  [1, 0],
  [2, 170],
  [3, 330],
  [4, 480],
]);

const rightColumnX = new Map([
  [1, 1194],
  [2, 1024],
  [3, 864],
  [4, 714],
]);

const rowCenters = new Map([
  [1, [44, 128, 212, 296, 388, 472, 556, 640]],
  [2, [86, 254, 430, 598]],
  [3, [170, 514]],
  [4, [342]],
]);

const mobileBoard = {
  cardWidth: 240,
  cardHeight: 82,
  finalCardHeight: 100,
  columnGap: 50,
  rowGap: 14,
  left: 8,
  top: 14,
  bottom: 82,
};

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
      y: (slot === 1 ? 350 : 474) - board.cardHeight / 2,
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
  return round.toLowerCase().includes("final");
}

function getMobileCardHeight(match: KnockoutMatch) {
  return match.badge === "FINAL" ? mobileBoard.finalCardHeight : mobileBoard.cardHeight;
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

function formatKnockoutKickoff(kickoff: string) {
  const normalized = kickoff.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);

  if (!match) {
    return {
      dateTime: undefined,
      label: normalized,
    };
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const time = hour && minute ? `${hour}:${minute}` : defaultKnockoutKickoffTime;

  return {
    dateTime: `${year}-${month}-${day}T${time}`,
    label: `${weekdayLabels[date.getUTCDay()]}, ${monthLabels[date.getUTCMonth()]} ${Number(day)}\n${time}`,
  };
}

function resolveKnockoutTeam(value: string, teams: Team[]): ResolvedKnockoutTeam {
  const normalizedValue = value.trim().toLowerCase();
  const team = teams.find(
    (candidate) =>
      candidate.code.toLowerCase() === normalizedValue ||
      candidate.name.toLowerCase() === normalizedValue,
  );

  return {
    label: team?.name ?? value,
    ownerName: team?.ownedByName,
  };
}

function KnockoutTeamName({ teams, value }: { teams: Team[]; value: string }) {
  const resolved = resolveKnockoutTeam(value, teams);

  return (
    <span className="knockout-team-name">
      <span className="knockout-team-label">{resolved.label}</span>
      {resolved.ownerName ? (
        <small className="knockout-owner-name">{resolved.ownerName}</small>
      ) : null}
    </span>
  );
}

function getMobileRoundCenters(rounds: KnockoutRound[]) {
  const centers: number[][] = [];

  rounds.forEach((round, roundIndex) => {
    if (roundIndex === 0) {
      centers.push(
        round.matches.map(
          (_, matchIndex) =>
            mobileBoard.top +
            mobileBoard.cardHeight / 2 +
            matchIndex * (mobileBoard.cardHeight + mobileBoard.rowGap),
        ),
      );
      return;
    }

    const previousCenters = centers[roundIndex - 1] ?? [];

    if (isFinalRound(round.round)) {
      const finalCenter =
        previousCenters.length >= 2
          ? (previousCenters[0] + previousCenters[1]) / 2
          : previousCenters[0] ?? mobileBoard.top + mobileBoard.finalCardHeight / 2;

      centers.push(
        round.matches.map((_, matchIndex) =>
          matchIndex === 0
            ? finalCenter
            : finalCenter + mobileBoard.finalCardHeight / 2 + mobileBoard.cardHeight / 2 + mobileBoard.rowGap,
        ),
      );
      return;
    }

    centers.push(
      round.matches.map((_, matchIndex) => {
        const first = previousCenters[matchIndex * 2];
        const second = previousCenters[matchIndex * 2 + 1];

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
  const sourceX = sourceA.x + mobileBoard.cardWidth;
  const targetX = target.x;
  const midX = sourceX + (targetX - sourceX) / 2;
  const sourceY1 = sourceA.y + sourceA.height / 2;
  const sourceY2 = sourceB.y + sourceB.height / 2;
  const targetY = target.y + target.height / 2;

  return [
    `M ${sourceX} ${sourceY1} H ${midX}`,
    `M ${sourceX} ${sourceY2} H ${midX}`,
    `M ${midX} ${sourceY1} V ${sourceY2}`,
    `M ${midX} ${targetY} H ${targetX}`,
  ].join(" ");
}

function getMobileBracketLayout(rounds: KnockoutRound[]) {
  const roundCenters = getMobileRoundCenters(rounds);
  const roundOffsets = rounds.map(
    (_, roundIndex) => mobileBoard.left + roundIndex * (mobileBoard.cardWidth + mobileBoard.columnGap),
  );
  const matchesByRound = rounds.map((round, roundIndex) =>
    round.matches.map((match, matchIndex) => {
      const height = getMobileCardHeight(match);

      return {
        ...match,
        round: round.round,
        height,
        x: roundOffsets[roundIndex],
        y: (roundCenters[roundIndex]?.[matchIndex] ?? mobileBoard.top + height / 2) - height / 2,
      };
    }),
  );

  const mobileConnectorPaths: string[] = [];

  matchesByRound.forEach((roundMatches, roundIndex) => {
    const nextRoundMatches = matchesByRound[roundIndex + 1];
    const nextRound = rounds[roundIndex + 1];

    if (!nextRoundMatches?.length || !nextRound) {
      return;
    }

    if (isFinalRound(nextRound.round)) {
      const finalMatch = nextRoundMatches.find((match) => match.badge === "FINAL") ?? nextRoundMatches[0];

      if (roundMatches.length >= 2 && finalMatch) {
        mobileConnectorPaths.push(makeMobilePairPath(roundMatches[0], roundMatches[1], finalMatch));
      }

      return;
    }

    nextRoundMatches.forEach((target, targetIndex) => {
      const sourceA = roundMatches[targetIndex * 2];
      const sourceB = roundMatches[targetIndex * 2 + 1];

      if (sourceA && sourceB) {
        mobileConnectorPaths.push(makeMobilePairPath(sourceA, sourceB, target));
      }
    });
  });

  const positionedMatches = matchesByRound.flat();
  const width = (roundOffsets.at(-1) ?? 0) + mobileBoard.cardWidth + mobileBoard.left;
  const height =
    Math.max(
      mobileBoard.top + mobileBoard.cardHeight,
      ...positionedMatches.map((match) => match.y + match.height),
    ) + mobileBoard.bottom;

  return {
    connectorPaths: mobileConnectorPaths,
    height,
    matches: positionedMatches,
    roundOffsets,
    width,
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

function MatchCard({ match, teams }: { match: BracketMatch; teams: Team[] }) {
  const position = getMatchPosition(match);
  const kickoff = formatKnockoutKickoff(match.kickoff);
  const style = {
    left: position.x,
    top: position.y,
  } satisfies CSSProperties;

  return (
    <article
      aria-label={`${match.round}: ${match.homeTeam} vs ${match.awayTeam}, ${kickoff.label.replace("\n", " ")}`}
      className={`knockout-card${match.badge ? " knockout-card-featured" : ""}`}
      data-badge={match.badge}
      style={style}
    >
      <div className="knockout-card-crests" aria-hidden="true">
        <span className="knockout-crest" />
        <span className="knockout-crest" />
      </div>
      <div className="knockout-card-teams">
        <KnockoutTeamName teams={teams} value={match.homeTeam} />
        <KnockoutTeamName teams={teams} value={match.awayTeam} />
      </div>
      <time className="knockout-card-date" dateTime={kickoff.dateTime}>{kickoff.label}</time>
      {match.badge ? <span className="knockout-card-badge">{match.badge}</span> : null}
    </article>
  );
}

function MobileBracketMatchCard({
  match,
  teams,
}: {
  match: MobilePositionedMatch;
  teams: Team[];
}) {
  const kickoff = formatKnockoutKickoff(match.kickoff);
  const style = {
    "--knockout-mobile-card-height": `${match.height}px`,
    left: match.x,
    top: match.y,
  } as CSSProperties & Record<"--knockout-mobile-card-height", string>;

  return (
    <article
      aria-label={`${match.round}: ${match.homeTeam} vs ${match.awayTeam}, ${kickoff.label.replace("\n", " ")}`}
      className={`knockout-mobile-bracket-card${match.badge === "FINAL" ? " knockout-mobile-bracket-final" : ""}`}
      data-badge={match.badge}
      style={style}
    >
      <div className="knockout-mobile-card-label">
        <span aria-hidden="true" />
        <strong>{getMobileMatchLabel(match)}</strong>
      </div>

      {match.badge === "FINAL" ? (
        <div className="knockout-mobile-final-mark" aria-hidden="true">
          <Trophy size={36} strokeWidth={1.45} />
          <span>?</span>
        </div>
      ) : null}

      <div className="knockout-mobile-card-body">
        <div className="knockout-mobile-card-teams">
          <div className="knockout-mobile-card-team">
            <span className="knockout-crest" aria-hidden="true" />
            <KnockoutTeamName teams={teams} value={match.homeTeam} />
          </div>
          <div className="knockout-mobile-card-team">
            <span className="knockout-crest" aria-hidden="true" />
            <KnockoutTeamName teams={teams} value={match.awayTeam} />
          </div>
        </div>
        <time dateTime={kickoff.dateTime}>{kickoff.label}</time>
      </div>
    </article>
  );
}

export function KnockoutTab({
  rounds,
  teams,
}: {
  rounds: KnockoutRound[];
  teams: Team[];
}) {
  const [activeMobileRound, setActiveMobileRound] = useState("");
  const mobileBoardScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileRoundButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const matches = useMemo(() => getBracketMatches(rounds), [rounds]);
  const connectorPaths = useMemo(() => getConnectorPaths(), []);
  const mobileLayout = useMemo(() => getMobileBracketLayout(rounds), [rounds]);

  useEffect(() => {
    if (!rounds.length) {
      setActiveMobileRound("");
      return;
    }

    setActiveMobileRound((currentRound) =>
      rounds.some((round) => round.round === currentRound) ? currentRound : rounds[0].round,
    );
  }, [rounds]);

  const selectedMobileRound = rounds.find((round) => round.round === activeMobileRound) ?? rounds[0];
  const handleMobileBracketScroll = (scrollLeft: number) => {
    const closestRoundIndex = mobileLayout.roundOffsets.reduce(
      (closestIndex, offset, roundIndex) =>
        Math.abs(offset - scrollLeft) <
        Math.abs((mobileLayout.roundOffsets[closestIndex] ?? 0) - scrollLeft)
          ? roundIndex
          : closestIndex,
      0,
    );
    const closestRound = rounds[closestRoundIndex];

    if (closestRound && closestRound.round !== activeMobileRound) {
      setActiveMobileRound(closestRound.round);
      mobileRoundButtonRefs.current[closestRoundIndex]?.scrollIntoView?.({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  const handleMobileRoundSelect = (round: KnockoutRound, roundIndex: number) => {
    setActiveMobileRound(round.round);
    mobileBoardScrollRef.current?.scrollTo({
      left: Math.max(0, (mobileLayout.roundOffsets[roundIndex] ?? 0) - mobileBoard.left),
      behavior: "smooth",
    });
  };

  return (
    <div className="knockout-shell">
      <div className="knockout-board-scroll">
        <section
          aria-label="World Cup knockout bracket"
          className="knockout-board"
          style={{
            "--knockout-board-width": `${board.width}px`,
            "--knockout-board-height": `${board.height}px`,
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
          {rounds.map((round, roundIndex) => (
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
              onClick={() => handleMobileRoundSelect(round, roundIndex)}
            >
              <strong>{round.round}</strong>
            </button>
          ))}
        </div>

        <div
          className="knockout-mobile-bracket-scroll"
          ref={mobileBoardScrollRef}
          onScroll={(event) => handleMobileBracketScroll(event.currentTarget.scrollLeft)}
          onTouchEnd={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <div
            className="knockout-mobile-bracket-board"
            style={
              {
                "--knockout-mobile-board-height": `${mobileLayout.height}px`,
                "--knockout-mobile-board-width": `${mobileLayout.width}px`,
              } as CSSProperties
            }
          >
            <svg
              aria-hidden="true"
              className="knockout-mobile-connectors"
              focusable="false"
              viewBox={`0 0 ${mobileLayout.width} ${mobileLayout.height}`}
            >
              {mobileLayout.connectorPaths.map((path, index) => (
                <path key={`${path}-${index}`} d={path} />
              ))}
            </svg>

            {mobileLayout.matches.map((match) => (
              <MobileBracketMatchCard key={`mobile-${match.id}`} match={match} teams={teams} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
