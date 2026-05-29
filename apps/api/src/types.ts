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
  }>;
};

export type Fixture = {
  id: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoff: string;
};

export type GroupStanding = {
  group: string;
  rows: Array<{
    team: string;
    played: number;
    points: number;
    goalDiff: number;
  }>;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  isFeatured?: boolean;
  teamCode?: string;
};
