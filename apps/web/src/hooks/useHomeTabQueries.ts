import { useQuery } from "@tanstack/react-query";
import { homeTabs, tournamentQueries } from "../lib/tournamentQueries";

export function useHomeTabQueries(activeIndex: number) {
  const enabledTabs = new Set(
    homeTabs.filter((_, index) => Math.abs(index - activeIndex) <= 1),
  );

  const knockoutEnabled = enabledTabs.has("Knockout");
  const fixturesEnabled = enabledTabs.has("Fixtures");
  const tableEnabled = fixturesEnabled || enabledTabs.has("Table");
  const newsEnabled = enabledTabs.has("News");
  const teamsEnabled = knockoutEnabled || newsEnabled;

  const teams = useQuery({
    ...tournamentQueries.teams,
    enabled: teamsEnabled,
  });
  const knockout = useQuery({
    ...tournamentQueries.knockout,
    enabled: knockoutEnabled,
  });
  const fixtures = useQuery({
    ...tournamentQueries.fixtures,
    enabled: fixturesEnabled,
  });
  const table = useQuery({
    ...tournamentQueries.table,
    enabled: tableEnabled,
  });
  const news = useQuery({
    ...tournamentQueries.news,
    enabled: newsEnabled,
  });

  return { fixtures, knockout, news, table, teams };
}
