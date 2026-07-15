import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams
} from "./api";
import {
  getFixturesRefetchInterval,
  prefetchTabData,
  tournamentQueries,
} from "./tournamentQueries";

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
    expect(tournamentQueries.knockout.staleTime).toBe(5 * 1000);
    expect(tournamentQueries.knockout.refetchInterval).toBe(60 * 1000);
    expect(tournamentQueries.fixtures.staleTime).toBe(1 * 1000);
    expect(tournamentQueries.table.staleTime).toBe(10 * 1000);
    expect(tournamentQueries.news.staleTime).toBe(5 * 60 * 1000);
    expect(tournamentQueries.fixtures.refetchInterval).toEqual(expect.any(Function));
    expect(tournamentQueries.table.refetchInterval).toBe(2 * 60 * 1000);
  });

  test("refreshes fixtures faster only while a match is active", () => {
    expect(getFixturesRefetchInterval([{ statusShort: "2H" }])).toBe(15 * 1000);
    expect(getFixturesRefetchInterval([{ statusShort: "HT" }])).toBe(15 * 1000);
    expect(getFixturesRefetchInterval([{ statusShort: "FT" }])).toBe(60 * 1000);
    expect(getFixturesRefetchInterval([])).toBe(60 * 1000);
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
