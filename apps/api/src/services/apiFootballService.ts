import { teams } from "../data/teams";
import type { Fixture, GroupStanding, TeamRecord } from "../types";

export type ApiFootballConfig = {
  apiKey: string;
  baseUrl: string;
  cacheTtlMs: number;
  leagueId: string;
  season: string;
};

type ApiFootballTeam = {
  code?: string | null;
  name?: string | null;
  winner?: boolean | null;
};

type ApiFootballFixture = {
  fixture?: {
    id?: number | string;
    date?: string | null;
    status?: {
      elapsed?: number | null;
      extra?: number | null;
      long?: string | null;
      short?: string | null;
    } | null;
    venue?: {
      name?: string | null;
    } | null;
  };
  goals?: {
    away?: number | null;
    home?: number | null;
  } | null;
  score?: {
    penalty?: {
      home?: number | null;
      away?: number | null;
    } | null;
  } | null;
  league?: {
    round?: string | null;
  };
  teams?: {
    away?: ApiFootballTeam | null;
    home?: ApiFootballTeam | null;
  };
};

type ApiFootballStats = {
  draw?: number | null;
  goals?: {
    against?: number | null;
    for?: number | null;
  } | null;
  lose?: number | null;
  played?: number | null;
  win?: number | null;
};

type ApiFootballStandingRow = {
  all?: ApiFootballStats | null;
  away?: ApiFootballStats | null;
  goalsDiff?: number | null;
  group?: string | null;
  home?: ApiFootballStats | null;
  points?: number | null;
  rank?: number | null;
  team?: ApiFootballTeam | null;
};

type ApiFootballStandingResponse = {
  league?: {
    standings?: ApiFootballStandingRow[][];
  };
};

type ApiFootballResponse<T> = {
  errors?: unknown;
  response?: T[];
};

const teamAliases = new Map<string, string>([
  ["bosnia", "BIH"],
  ["bosnia herzegovina", "BIH"],
  ["bosnia and herzegovina", "BIH"],
  ["bosniaherzegovina", "BIH"],
  ["cabo verde", "CPV"],
  ["cape verde", "CPV"],
  ["cape verde islands", "CPV"],
  ["congo dr", "COD"],
  ["cote divoire", "CIV"],
  ["cotedivoire", "CIV"],
  ["curacao", "CUW"],
  ["czechia", "CZE"],
  ["czech republic", "CZE"],
  ["democratic republic of congo", "COD"],
  ["dr congo", "COD"],
  ["ivory coast", "CIV"],
  ["korea republic", "KOR"],
  ["rsa", "ZAF"],
  ["saudi arabia", "KSA"],
  ["south korea", "KOR"],
  ["turkiye", "TUR"],
  ["united states", "USA"],
  ["united states of america", "USA"],
  ["usa", "USA"],
]);

const teamCodeAliases = new Map<string, string>([
  ["RSA", "ZAF"],
  ["USA", "USA"],
]);

const teamByCode = new Map(teams.map((team) => [team.code, team]));
const teamByName = new Map(teams.map((team) => [normalizeTeamKey(team.name), team]));
const cache = new Map<string, { expiresAt: number; value: unknown }>();

function normalizeTeamKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getTeamFromApiTeam(apiTeam?: ApiFootballTeam | null): TeamRecord | undefined {
  const rawCode = apiTeam?.code?.trim().toUpperCase();
  const code = rawCode ? (teamCodeAliases.get(rawCode) ?? rawCode) : "";

  if (code && teamByCode.has(code)) {
    return teamByCode.get(code);
  }

  const rawName = apiTeam?.name?.trim();

  if (!rawName) {
    return undefined;
  }

  const normalizedName = normalizeTeamKey(rawName);
  const aliasCode = teamAliases.get(normalizedName);

  if (aliasCode) {
    return teamByCode.get(aliasCode);
  }

  return teamByName.get(normalizedName);
}

function getApiFootballErrorCount(errors: unknown) {
  if (!errors) {
    return 0;
  }

  if (Array.isArray(errors)) {
    return errors.length;
  }

  if (typeof errors === "object") {
    return Object.keys(errors).length;
  }

  return 1;
}

function shouldUseResponse<T>(payload: ApiFootballResponse<T>) {
  return getApiFootballErrorCount(payload.errors) === 0 && Array.isArray(payload.response);
}

function extractGroupLetter(groupLabel?: string | null) {
  const match = groupLabel?.match(/\bGroup\s+([A-L])\b/i);
  return match?.[1]?.toUpperCase();
}

function inferFixtureGroup(homeTeam?: TeamRecord, awayTeam?: TeamRecord, roundLabel?: string | null) {
  const roundGroup = extractGroupLetter(roundLabel);

  if (roundGroup) {
    return roundGroup;
  }

  if (homeTeam?.group && homeTeam.group === awayTeam?.group) {
    return homeTeam.group;
  }

  return homeTeam?.group ?? awayTeam?.group ?? "";
}

function normalizeRoundLabel(roundLabel?: string | null, group?: string) {
  const normalized = roundLabel?.toLowerCase() ?? "";

  if (normalized.includes("round of 16")) {
    return "Round of 16";
  }

  if (normalized.includes("quarter")) {
    return "Quarter-finals";
  }

  if (normalized.includes("semi")) {
    return "Semi-finals";
  }

  if (normalized.includes("final")) {
    return "Finals";
  }

  return group ? `Group ${group}` : roundLabel ?? "";
}

function sortApiFootballFixtures(fixtures: ApiFootballFixture[]) {
  return [...fixtures].sort((left, right) => {
    const leftDate = left.fixture?.date ?? "";
    const rightDate = right.fixture?.date ?? "";

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    return String(left.fixture?.id ?? "").localeCompare(String(right.fixture?.id ?? ""));
  });
}

export function mapApiFootballFixtures(apiFixtures: ApiFootballFixture[]): Fixture[] {
  return sortApiFootballFixtures(apiFixtures).flatMap((fixture, index) => {
    const homeTeam = getTeamFromApiTeam(fixture.teams?.home);
    const awayTeam = getTeamFromApiTeam(fixture.teams?.away);
    const group = inferFixtureGroup(homeTeam, awayTeam, fixture.league?.round);

    if (!homeTeam || !awayTeam || !group) {
      return [];
    }

    return {
      awayFlag: awayTeam.flag,
      awayScore: fixture.goals?.away ?? null,
      awayTeam: awayTeam.code,
      awayTeamName: awayTeam.name,
      awayWinner: fixture.teams?.away?.winner ?? null,
      group,
      homeFlag: homeTeam.flag,
      homeScore: fixture.goals?.home ?? null,
      homeTeam: homeTeam.code,
      homeTeamName: homeTeam.name,
      homeWinner: fixture.teams?.home?.winner ?? null,
      id: `api-football-${fixture.fixture?.id ?? index + 1}`,
      kickoff: fixture.fixture?.date ?? "",
      matchNumber: index + 1,
      penaltyHomeScore: fixture.score?.penalty?.home ?? null,
      penaltyAwayScore: fixture.score?.penalty?.away ?? null,
      round: normalizeRoundLabel(fixture.league?.round, group),
      statusElapsed: fixture.fixture?.status?.elapsed ?? null,
      statusExtra: fixture.fixture?.status?.extra ?? null,
      statusLong: fixture.fixture?.status?.long ?? "",
      statusShort: fixture.fixture?.status?.short ?? "",
      venue: fixture.fixture?.venue?.name ?? "",
    };
  });
}

function mapStats(stats: ApiFootballStats | null | undefined, points?: number | null) {
  const goalsFor = stats?.goals?.for ?? 0;
  const goalsAgainst = stats?.goals?.against ?? 0;
  const wins = stats?.win ?? 0;
  const draws = stats?.draw ?? 0;

  return {
    draws,
    goalDiff: goalsFor - goalsAgainst,
    goalsAgainst,
    goalsFor,
    losses: stats?.lose ?? 0,
    played: stats?.played ?? 0,
    points: points ?? wins * 3 + draws,
    wins,
  };
}

export function mapApiFootballStandings(
  apiStandings: ApiFootballStandingResponse[],
): GroupStanding[] {
  const rows = apiStandings.flatMap((item) => item.league?.standings?.flat() ?? []);
  const byGroup = new Map<string, GroupStanding["rows"]>();

  rows
    .slice()
    .sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999))
    .forEach((row) => {
      const team = getTeamFromApiTeam(row.team);
      const group = extractGroupLetter(row.group);

      if (!team || !group) {
        return;
      }

      const groupRows = byGroup.get(group) ?? [];
      groupRows.push({
        flag: team.flag,
        stats: {
          away: mapStats(row.away),
          home: mapStats(row.home),
          overall: mapStats(row.all, row.points ?? 0),
        },
        team: team.name,
        teamCode: team.code,
      });
      byGroup.set(group, groupRows);
    });

  return [...byGroup.entries()]
    .sort(([leftGroup], [rightGroup]) => leftGroup.localeCompare(rightGroup))
    .map(([group, groupRows]) => ({ group, rows: groupRows }));
}

export function readApiFootballConfig(): ApiFootballConfig | null {
  const apiKey = process.env.FOOTBALL_API_KEY?.trim() ?? "";
  const baseUrl =
    process.env.FOOTBALL_API_BASE_URL?.trim() || "https://v3.football.api-sports.io";
  const leagueId = process.env.FOOTBALL_WORLD_CUP_LEAGUE_ID?.trim() ?? "";
  const season = process.env.FOOTBALL_WORLD_CUP_SEASON?.trim() || "2026";

  if (!apiKey || !leagueId || !season) {
    return null;
  }

  return {
    apiKey,
    baseUrl,
    cacheTtlMs: Number(process.env.FOOTBALL_API_CACHE_TTL_MS ?? 60 * 1000),
    leagueId,
    season,
  };
}

async function requestApiFootball<T>(
  config: ApiFootballConfig,
  path: string,
  fetchFn: typeof fetch = fetch,
) {
  const response = await fetchFn(`${config.baseUrl}${path}`, {
    headers: {
      "x-apisports-key": config.apiKey,
    },
  });
  const payload = (await response.json()) as ApiFootballResponse<T>;

  if (!response.ok || !shouldUseResponse(payload) || !payload.response?.length) {
    return null;
  }

  return payload.response;
}

export async function fetchApiFootballFixtures(
  config: ApiFootballConfig,
  fetchFn: typeof fetch = fetch,
) {
  const response = await requestApiFootball<ApiFootballFixture>(
    config,
    `/fixtures?league=${encodeURIComponent(config.leagueId)}&season=${encodeURIComponent(
      config.season,
    )}`,
    fetchFn,
  );

  if (!response) {
    return null;
  }

  const fixtures = mapApiFootballFixtures(response);
  return fixtures.length ? fixtures : null;
}

export async function fetchApiFootballStandings(
  config: ApiFootballConfig,
  fetchFn: typeof fetch = fetch,
) {
  const response = await requestApiFootball<ApiFootballStandingResponse>(
    config,
    `/standings?league=${encodeURIComponent(config.leagueId)}&season=${encodeURIComponent(
      config.season,
    )}`,
    fetchFn,
  );

  if (!response) {
    return null;
  }

  const standings = mapApiFootballStandings(response);
  return standings.length ? standings : null;
}

async function getCached<T>(key: string, ttlMs: number, load: () => Promise<T | null>) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value as T | null;
  }

  const value = await load();
  cache.set(key, { expiresAt: now + ttlMs, value });
  return value;
}

export async function getApiFootballFixtures() {
  const config = readApiFootballConfig();

  if (!config) {
    return null;
  }

  return getCached("api-football-fixtures", config.cacheTtlMs, () =>
    fetchApiFootballFixtures(config),
  );
}

export async function getApiFootballStandings() {
  const config = readApiFootballConfig();

  if (!config) {
    return null;
  }

  return getCached("api-football-standings", config.cacheTtlMs, () =>
    fetchApiFootballStandings(config),
  );
}

export function resetApiFootballCacheForTests() {
  cache.clear();
}
