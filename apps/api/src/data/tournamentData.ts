import type { GroupStanding, NewsItem } from "../types";
import { fixtures } from "./fixtures";
import { knockout } from "./knockout";
import { teams } from "./teams";

const emptyStats = () => ({
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
});

export const standings: GroupStanding[] = Array.from(
  new Set(teams.map((team) => team.group)),
  (group) => ({
    group,
    rows: teams
      .filter((team) => team.group === group)
      .map((team) => ({
        teamCode: team.code,
        team: team.name,
        flag: team.flag,
        stats: {
          overall: emptyStats(),
          home: emptyStats(),
          away: emptyStats(),
        },
      })),
  }),
);

export const news: NewsItem[] = [
  {
    id: "schedule-2026",
    title: "FIFA World Cup 2026 begins in Mexico City on 11 June",
    summary: "Mexico face South Africa in the opening match of the first 48-team FIFA World Cup.",
    isFeatured: true,
    teamCode: "MEX",
  },
  {
    id: "format-2026",
    title: "The official tournament schedule features 104 matches",
    summary: "The group stage contains 72 fixtures before the new Round of 32 begins on 28 June.",
  },
  {
    id: "final-2026",
    title: "New York New Jersey will host the final on 19 July",
    summary: "The title match is Match 104, with the bronze final taking place in Miami one day earlier.",
  },
];

export { fixtures, knockout, teams };
