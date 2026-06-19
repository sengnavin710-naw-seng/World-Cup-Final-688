import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams
} from "../lib/api";
import { useHomeTabQueries } from "./useHomeTabQueries";

vi.mock("../lib/api", () => ({
  fetchFixtures: vi.fn(async () => ({ fixtures: [] })),
  fetchKnockout: vi.fn(async () => ({ knockout: [] })),
  fetchNews: vi.fn(async () => ({ news: [] })),
  fetchStandings: vi.fn(async () => ({ companyPicks: [], standings: [] })),
  fetchTeams: vi.fn(async () => ({ teams: [] }))
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useHomeTabQueries", () => {
  test("requests only active and adjacent tab data", async () => {
    renderHook(() => useHomeTabQueries(0), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetchKnockout).toHaveBeenCalledTimes(1);
      expect(fetchFixtures).toHaveBeenCalledTimes(1);
      expect(fetchStandings).toHaveBeenCalledTimes(1);
      expect(fetchTeams).toHaveBeenCalledTimes(1);
    });

    expect(fetchNews).not.toHaveBeenCalled();
  });

  test("requests only the right-edge active and adjacent tab data", async () => {
    renderHook(() => useHomeTabQueries(3), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetchNews).toHaveBeenCalledTimes(1);
      expect(fetchStandings).toHaveBeenCalledTimes(1);
      expect(fetchTeams).toHaveBeenCalledTimes(1);
    });

    expect(fetchFixtures).not.toHaveBeenCalled();
    expect(fetchKnockout).not.toHaveBeenCalled();
  });
});
