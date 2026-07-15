import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams
} from "./api";

export const homeTabs = ["Knockout", "Fixtures", "Table", "News"] as const;
export type HomeTab = (typeof homeTabs)[number];

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const activeFixtureStatuses = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"]);

export function getFixturesRefetchInterval(
  fixtures: Array<{ statusShort?: string | null }> | undefined,
) {
  return fixtures?.some((fixture) => activeFixtureStatuses.has(fixture.statusShort ?? ""))
    ? 15 * SECOND
    : MINUTE;
}

export const tournamentQueries = {
  teams: queryOptions({
    queryKey: ["tournament", "teams"] as const,
    queryFn: fetchTeams,
    select: (result) => result.teams,
    staleTime: 24 * HOUR
  }),
  knockout: queryOptions({
    queryKey: ["tournament", "knockout"] as const,
    queryFn: fetchKnockout,
    select: (result) => result.knockout,
    refetchInterval: MINUTE,
    staleTime: 5 * SECOND
  }),
  fixtures: queryOptions({
    queryKey: ["tournament", "fixtures"] as const,
    queryFn: fetchFixtures,
    select: (result) => result.fixtures,
    refetchInterval: (query) =>
      getFixturesRefetchInterval(query.state.data?.fixtures),
    staleTime: 1 * SECOND
  }),
  table: queryOptions({
    queryKey: ["tournament", "table"] as const,
    queryFn: fetchStandings,
    refetchInterval: 2 * MINUTE,
    staleTime: 10 * SECOND
  }),
  news: queryOptions({
    queryKey: ["tournament", "news"] as const,
    queryFn: fetchNews,
    select: (result) => result.news,
    staleTime: 5 * MINUTE
  })
} as const;

export function prefetchTabData(client: QueryClient, tab: HomeTab) {
  if (tab === "Knockout") {
    return Promise.all([
      client.prefetchQuery(tournamentQueries.teams),
      client.prefetchQuery(tournamentQueries.knockout)
    ]);
  }

  if (tab === "Fixtures") {
    return Promise.all([
      client.prefetchQuery(tournamentQueries.fixtures),
      client.prefetchQuery(tournamentQueries.table)
    ]);
  }

  if (tab === "Table") {
    return Promise.all([client.prefetchQuery(tournamentQueries.table)]);
  }

  return Promise.all([
    client.prefetchQuery(tournamentQueries.teams),
    client.prefetchQuery(tournamentQueries.news)
  ]);
}
