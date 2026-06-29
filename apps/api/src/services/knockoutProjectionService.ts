import { getThirdPlaceAllocation } from "../data/thirdPlaceAllocation";
import { teamByCode } from "../data/teams";
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
      const label = labels[side];
      const candidates = parseThirdPlaceCandidates(label);

      if (!candidates.length) {
        return [];
      }

      const otherSide = side === "home" ? "away" : "home";
      const otherLabel = labels[otherSide];
      const winnerGroup = parseGroupWinner(otherLabel);

      return [
        {
          candidates: new Set(candidates),
          key: `${match.id}:${side}`,
          winnerGroup,
        },
      ];
    });
  });
}

function assignThirdPlacedTeams(
  slots: ThirdPlaceSlot[],
  teams: RankedThirdPlacedTeam[],
): Map<string, string> {
  if (!slots.length || !teams.length) {
    return new Map<string, string>();
  }

  const thirdPlaceAllocation = getThirdPlaceAllocation(
    teams.map((team) => team.group),
  );

  if (!thirdPlaceAllocation) {
    return new Map<string, string>();
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

/**
 * Derive group stage standings purely from fixture results.
 * Used as fallback when the Football API standings endpoint is unavailable.
 */
export function computeStandingsFromFixtures(fixtures: Fixture[]): GroupStanding[] {
  type TeamStat = {
    draws: number;
    goalsAgainst: number;
    goalsFor: number;
    losses: number;
    played: number;
    points: number;
    teamCode: string;
    wins: number;
  };

  const statsByGroup = new Map<string, Map<string, TeamStat>>();

  for (const fixture of fixtures) {
    if (!worldCupGroups.includes(fixture.group)) continue; // skip knockout rows
    if (!terminalFixtureStatuses.has(fixture.statusShort ?? "")) continue;
    if (fixture.homeScore == null || fixture.awayScore == null) continue;

    const { group, homeTeam, awayTeam, homeScore, awayScore } = fixture;
    if (!homeTeam || !awayTeam) continue;

    // Skip cross-group fixtures (mislabeled knockout matches)
    const homeRec = teamByCode.get(homeTeam);
    const awayRec = teamByCode.get(awayTeam);
    if (!homeRec || !awayRec || homeRec.group !== awayRec.group) continue;


    if (!statsByGroup.has(group)) statsByGroup.set(group, new Map());
    const gs = statsByGroup.get(group)!;

    const blank = (code: string): TeamStat => ({
      draws: 0, goalsAgainst: 0, goalsFor: 0, losses: 0,
      played: 0, points: 0, teamCode: code, wins: 0,
    });
    if (!gs.has(homeTeam)) gs.set(homeTeam, blank(homeTeam));
    if (!gs.has(awayTeam)) gs.set(awayTeam, blank(awayTeam));

    const h = gs.get(homeTeam)!;
    const a = gs.get(awayTeam)!;
    h.played++; a.played++;
    h.goalsFor += homeScore; h.goalsAgainst += awayScore;
    a.goalsFor += awayScore; a.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      h.wins++; h.points += 3; a.losses++;
    } else if (homeScore < awayScore) {
      a.wins++; a.points += 3; h.losses++;
    } else {
      h.draws++; h.points++; a.draws++; a.points++;
    }
  }

  const result: GroupStanding[] = [];
  for (const group of worldCupGroups) {
    const gs = statsByGroup.get(group);
    if (!gs || gs.size === 0) continue;

    const rows = [...gs.values()]
      .sort((a, b) =>
        b.points - a.points ||
        (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor ||
        b.wins - a.wins,
      )
      .map((stat) => {
        const rec = teamByCode.get(stat.teamCode);
        const gd = stat.goalsFor - stat.goalsAgainst;
        return {
          flag: rec?.flag ?? "",
          stats: {
            away: { draws: 0, goalDiff: 0, goalsAgainst: 0, goalsFor: 0, losses: 0, played: 0, points: 0, wins: 0 },
            home: { draws: 0, goalDiff: 0, goalsAgainst: 0, goalsFor: 0, losses: 0, played: 0, points: 0, wins: 0 },
            overall: {
              draws: stat.draws, goalDiff: gd, goalsAgainst: stat.goalsAgainst,
              goalsFor: stat.goalsFor, losses: stat.losses, played: stat.played,
              points: stat.points, wins: stat.wins,
            },
          },
          team: rec?.name ?? stat.teamCode,
          teamCode: stat.teamCode,
        };
      });

    result.push({ group, rows });
  }
  return result;
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

  // Build team-pair lookup: sorted "CODE1:CODE2" -> Fixture
  const fixtureByTeamPair = new Map<string, Fixture>();
  for (const fixture of fixtures) {
    if (fixture.homeTeam && fixture.awayTeam) {
      const key = [fixture.homeTeam, fixture.awayTeam].sort().join(":");
      fixtureByTeamPair.set(key, fixture);
    }
  }

  // Track winner of each match number so "Winner Match N" placeholders can be resolved
  const winnerByMatchNumber = new Map<number, string>();

  function isTeamCode(s: string): boolean {
    return s.length > 0 && !/^(Winner|Runner-up|Best third|Group|TBD)/i.test(s);
  }

  function liveForPair(teamA: string, teamB: string): Fixture | undefined {
    if (!isTeamCode(teamA) || !isTeamCode(teamB)) return undefined;
    return fixtureByTeamPair.get([teamA, teamB].sort().join(":"));
  }

  function resolveWinnerSlot(placeholder: string): string {
    const m = placeholder.match(/^Winner Match (\d+)$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      return winnerByMatchNumber.get(num) ?? placeholder;
    }
    return placeholder;
  }

  function recordWinner(
    matchNumber: number,
    resolvedHome: string,
    resolvedAway: string,
    live: Fixture | undefined,
  ) {
    if (!live?.statusShort || !terminalFixtureStatuses.has(live.statusShort)) return;
    const h = live.homeScore ?? 0;
    const a = live.awayScore ?? 0;
    if (h === a) return; // draw should not occur in knockout (PEN = draw in regular time only)
    if (h > a) {
      // home side of fixture won — find which resolved code that is
      const winner = live.homeTeam === resolvedHome || live.homeTeam === resolvedAway
        ? live.homeTeam
        : resolvedHome;
      winnerByMatchNumber.set(matchNumber, winner);
    } else {
      const winner = live.awayTeam === resolvedAway || live.awayTeam === resolvedHome
        ? live.awayTeam
        : resolvedAway;
      winnerByMatchNumber.set(matchNumber, winner);
    }
  }

  return baseRounds.map((round, roundIndex) => {
    if (roundIndex === 0) {
      // Round of 32: resolve teams from group standings, then look up live fixture by team pair
      return {
        ...round,
        matches: round.matches.map((match) => {
          const homePlaceholder = match.homeTeamPlaceholder ?? match.homeTeam;
          const awayPlaceholder = match.awayTeamPlaceholder ?? match.awayTeam;
          const homeDirect = resolveDirectGroupSlot(homePlaceholder, standingsByGroup, completedGroups);
          const awayDirect = resolveDirectGroupSlot(awayPlaceholder, standingsByGroup, completedGroups);
          const homeThird = thirdPlaceAssignments.get(`${match.id}:home`);
          const awayThird = thirdPlaceAssignments.get(`${match.id}:away`);

          const resolvedHome = homeDirect?.teamCode ?? homeThird ?? match.homeTeam;
          const resolvedAway = awayDirect?.teamCode ?? awayThird ?? match.awayTeam;

          const live = liveForPair(resolvedHome, resolvedAway);
          recordWinner(match.matchNumber, resolvedHome, resolvedAway, live);

          return {
            ...match,
            homeTeam: resolvedHome,
            homeTeamConfirmed: homeDirect?.confirmed ?? (homeThird ? allGroupsComplete : false),
            awayTeam: resolvedAway,
            awayTeamConfirmed: awayDirect?.confirmed ?? (awayThird ? allGroupsComplete : false),
            homeScore: live?.homeScore ?? match.homeScore,
            awayScore: live?.awayScore ?? match.awayScore,
            statusShort: live?.statusShort ?? match.statusShort,
            kickoff: live?.kickoff ?? match.kickoff,
          };
        }),
      };
    }

    // Round of 16 and beyond: resolve "Winner Match N" → actual team code, then live lookup
    return {
      ...round,
      matches: round.matches.map((match) => {
        const homePlaceholder = match.homeTeamPlaceholder ?? match.homeTeam;
        const awayPlaceholder = match.awayTeamPlaceholder ?? match.awayTeam;

        const resolvedHome = resolveWinnerSlot(homePlaceholder);
        const resolvedAway = resolveWinnerSlot(awayPlaceholder);

        const live = liveForPair(resolvedHome, resolvedAway);
        recordWinner(match.matchNumber, resolvedHome, resolvedAway, live);

        return {
          ...match,
          homeTeam: resolvedHome,
          homeTeamConfirmed: isTeamCode(resolvedHome),
          awayTeam: resolvedAway,
          awayTeamConfirmed: isTeamCode(resolvedAway),
          homeScore: live?.homeScore ?? match.homeScore,
          awayScore: live?.awayScore ?? match.awayScore,
          statusShort: live?.statusShort ?? match.statusShort,
          kickoff: live?.kickoff ?? match.kickoff,
        };
      }),
    };
  });
}
