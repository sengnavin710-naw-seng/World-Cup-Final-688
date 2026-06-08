export type ParticipantRecord = {
  deviceId: string;
  displayName: string;
  teamCode: string;
};

export type TeamRecord = {
  code: string;
  name: string;
  thaiAlias?: string;
  group: string;
  flag: string;
};

export type TeamView = TeamRecord & {
  isOwned: boolean;
  ownedByName?: string;
};

export type KnockoutRound = {
  round: string;
  matches: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    kickoff: string;
    side?: "left" | "right" | "center";
    bracketColumn?: number;
    bracketSlot?: number;
    badge?: string;
    matchNumber: number;
    venue: string;
  }>;
};

export type Fixture = {
  id: string;
  matchNumber: number;
  group: string;
  round: string;
  homeTeam: string;
  homeTeamName: string;
  awayTeam: string;
  awayTeamName: string;
  homeFlag: string;
  awayFlag: string;
  kickoff: string;
  venue: string;
};

export type GroupStanding = {
  group: string;
  rows: Array<{
    teamCode: string;
    team: string;
    flag: string;
    stats: {
      overall: {
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDiff: number;
        points: number;
      };
      home: {
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDiff: number;
        points: number;
      };
      away: {
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDiff: number;
        points: number;
      };
    };
  }>;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  isFeatured?: boolean;
  teamCode?: string;
};
