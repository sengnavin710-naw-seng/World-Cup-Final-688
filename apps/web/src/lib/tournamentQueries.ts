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
    staleTime: 30 * SECOND
  }),
  fixtures: queryOptions({
    queryKey: ["tournament", "fixtures"] as const,
    queryFn: fetchFixtures,
    select: (result) => result.fixtures,
    staleTime: 30 * SECOND
  }),
  table: queryOptions({
    queryKey: ["tournament", "table"] as const,
    queryFn: fetchStandings,
    staleTime: 30 * SECOND
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
