import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams
} from "./api";
import { prefetchTabData, tournamentQueries } from "./tournamentQueries";

vi.mock("./api", () => ({
  fetchFixtures: vi.fn(async () => ({ fixtures: [] })),
  fetchKnockout: vi.fn(async () => ({ knockout: [] })),
  fetchNews: vi.fn(async () => ({ news: [] })),
  fetchStandings: vi.fn(async () => ({ companyPicks: [], standings: [] })),
  fetchTeams: vi.fn(async () => ({ teams: [] }))
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tournament query options", () => {
  test("uses the approved freshness windows", () => {
    expect(tournamentQueries.teams.staleTime).toBe(24 * 60 * 60 * 1000);
    expect(tournamentQueries.knockout.staleTime).toBe(30 * 1000);
    expect(tournamentQueries.knockout.refetchInterval).toBe(60 * 1000);
    expect(tournamentQueries.fixtures.staleTime).toBe(30 * 1000);
    expect(tournamentQueries.table.staleTime).toBe(30 * 1000);
    expect(tournamentQueries.news.staleTime).toBe(5 * 60 * 1000);
    expect(tournamentQueries.fixtures.refetchInterval).toBe(60 * 1000);
    expect(tournamentQueries.table.refetchInterval).toBe(2 * 60 * 1000);
  });

  test("deduplicates repeated fixtures-tab prefetches", async () => {
    const client = new QueryClient();

    await Promise.all([
      prefetchTabData(client, "Fixtures"),
      prefetchTabData(client, "Fixtures")
    ]);

    expect(fetchFixtures).toHaveBeenCalledTimes(1);
    expect(fetchStandings).toHaveBeenCalledTimes(1);
    expect(fetchTeams).not.toHaveBeenCalled();
    expect(fetchKnockout).not.toHaveBeenCalled();
    expect(fetchNews).not.toHaveBeenCalled();
  });
});
