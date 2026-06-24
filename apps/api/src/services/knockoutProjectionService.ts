import { getThirdPlaceAllocation } from "../data/thirdPlaceAllocation";
import type { Fixture, GroupStanding, KnockoutRound } from "../types";

const terminalFixtureStatuses = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
const worldCupGroups = "ABCDEFGHIJKL".split("");

export type RankedThirdPlacedTeam = {
  goalDiff: number;
  goalsFor: number;
  group: string;
  points: number;
  teamCode: string;
  wins: number;
};

type ThirdPlaceSlot = {
  candidates: Set<string>;
  key: string;
  winnerGroup: string;
};

function compareThirdPlacedTeams(
  left: RankedThirdPlacedTeam,
  right: RankedThirdPlacedTeam,
) {
  return (
    right.points - left.points ||
    right.goalDiff - left.goalDiff ||
    right.goalsFor - left.goalsFor ||
    right.wins - left.wins ||
    left.group.localeCompare(right.group)
  );
}

export function rankThirdPlacedTeams(
  standings: GroupStanding[],
): RankedThirdPlacedTeam[] {
  return standings
    .flatMap((standing) => {
      const row = standing.rows[2];

      if (!row) {
        return [];
      }

      const stats = row.stats.overall;
      return [
        {
          goalDiff: stats.goalDiff,
          goalsFor: stats.goalsFor,
          group: standing.group,
          points: stats.points,
          teamCode: row.teamCode,
          wins: stats.wins,
        },
      ];
    })
    .sort(compareThirdPlacedTeams)
    .slice(0, 8);
}

function parseThirdPlaceCandidates(label: string) {
  const match = label.match(/^Best third\s+([A-L/]+)$/i);
  return match?.[1]?.toUpperCase().split("/").filter(Boolean) ?? [];
}

function parseGroupWinner(label: string) {
  const match = label.match(/^Group\s+([A-L])\s+winners$/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function collectThirdPlaceSlots(round: KnockoutRound | undefined): ThirdPlaceSlot[] {
  if (!round) {
    return [];
  }

  return round.matches.flatMap((match) => {
    const labels = {
      away: match.awayTeamPlaceholder ?? match.awayTeam,
      home: match.homeTeamPlaceholder ?? match.homeTeam,
    };

    return (["home", "away"] as const).flatMap((side) => {
      const label =
        side === "home"
          ? labels.home
          : labels.away;
      const opponentLabel = side === "home" ? labels.away : labels.home;
      const candidates = parseThirdPlaceCandidates(label);
      const winnerGroup = parseGroupWinner(opponentLabel);

      return candidates.length && winnerGroup
        ? [{ candidates: new Set(candidates), key: `${match.id}:${side}`, winnerGroup }]
        : [];
    });
  });
}

function assignThirdPlacedTeams(
  slots: ThirdPlaceSlot[],
  teams: RankedThirdPlacedTeam[],
) {
  if (slots.length !== 8 || teams.length !== 8) {
    return new Map<string, string>();
  }

  const officialAllocation = getThirdPlaceAllocation(teams.map((team) => team.group));

  if (officialAllocation) {
    const teamsByGroup = new Map(teams.map((team) => [team.group, team.teamCode]));
    const assignments = new Map<string, string>();

    slots.forEach((slot) => {
      const assignedGroup = officialAllocation[slot.winnerGroup as keyof typeof officialAllocation];

      if (!assignedGroup) {
        return;
      }

      const teamCode = teamsByGroup.get(assignedGroup);

      if (teamCode && slot.candidates.has(assignedGroup)) {
        assignments.set(slot.key, teamCode);
      }
    });

    if (assignments.size === slots.length) {
      return assignments;
    }
  }

  const assignments = new Map<string, string>();
  const usedSlots = new Set<string>();

  function assign(teamIndex: number): boolean {
    if (teamIndex === teams.length) {
      return true;
    }

    const team = teams[teamIndex];

    if (!team) {
      return false;
    }

    for (const slot of slots) {
      if (usedSlots.has(slot.key) || !slot.candidates.has(team.group)) {
        continue;
      }

      usedSlots.add(slot.key);
      assignments.set(slot.key, team.teamCode);

      if (assign(teamIndex + 1)) {
        return true;
      }

      usedSlots.delete(slot.key);
      assignments.delete(slot.key);
    }

    return false;
  }

  return assign(0) ? assignments : new Map<string, string>();
}

function getCompletedGroups(fixtures: Fixture[]) {
  const fixturesByGroup = new Map<string, Fixture[]>();

  fixtures.forEach((fixture) => {
    if (!worldCupGroups.includes(fixture.group)) {
      return;
    }

    fixturesByGroup.set(fixture.group, [
      ...(fixturesByGroup.get(fixture.group) ?? []),
      fixture,
    ]);
  });

  return new Set(
    worldCupGroups.filter((group) => {
      const groupFixtures = fixturesByGroup.get(group) ?? [];
      return (
        groupFixtures.length >= 6 &&
        groupFixtures.every((fixture) =>
          terminalFixtureStatuses.has(fixture.statusShort ?? ""),
        )
      );
    }),
  );
}

function resolveDirectGroupSlot(
  label: string,
  standingsByGroup: Map<string, GroupStanding>,
  completedGroups: Set<string>,
) {
  const match = label.match(/^Group\s+([A-L])\s+(winners|runners-up)$/i);

  if (!match) {
    return null;
  }

  const group = match[1]?.toUpperCase() ?? "";
  const rowIndex = match[2]?.toLowerCase() === "winners" ? 0 : 1;
  const row = standingsByGroup.get(group)?.rows[rowIndex];

  if (!row) {
    return null;
  }

  return {
    confirmed: completedGroups.has(group),
    teamCode: row.teamCode,
  };
}

export function projectKnockoutRounds(
  baseRounds: KnockoutRound[],
  standings: GroupStanding[],
  fixtures: Fixture[],
): KnockoutRound[] {
  const standingsByGroup = new Map(
    standings.map((standing) => [standing.group, standing]),
  );
  const completedGroups = getCompletedGroups(fixtures);
  const allGroupsComplete = worldCupGroups.every((group) => completedGroups.has(group));
  const thirdPlaceAssignments = assignThirdPlacedTeams(
    collectThirdPlaceSlots(baseRounds[0]),
    rankThirdPlacedTeams(standings),
  );

  return baseRounds.map((round, roundIndex) => {
    if (roundIndex !== 0) {
      return {
        ...round,
        matches: round.matches.map((match) => ({ ...match })),
      };
    }

    return {
      ...round,
      matches: round.matches.map((match) => {
        const homePlaceholder = match.homeTeamPlaceholder ?? match.homeTeam;
        const awayPlaceholder = match.awayTeamPlaceholder ?? match.awayTeam;
        const homeDirect = resolveDirectGroupSlot(
          homePlaceholder,
          standingsByGroup,
          completedGroups,
        );
        const awayDirect = resolveDirectGroupSlot(
          awayPlaceholder,
          standingsByGroup,
          completedGroups,
        );
        const homeThird = thirdPlaceAssignments.get(`${match.id}:home`);
        const awayThird = thirdPlaceAssignments.get(`${match.id}:away`);

        return {
          ...match,
          homeTeam: homeDirect?.teamCode ?? homeThird ?? match.homeTeam,
          homeTeamConfirmed: homeDirect?.confirmed ?? (homeThird ? allGroupsComplete : false),
          awayTeam: awayDirect?.teamCode ?? awayThird ?? match.awayTeam,
          awayTeamConfirmed: awayDirect?.confirmed ?? (awayThird ? allGroupsComplete : false),
        };
      }),
    };
  });
}
