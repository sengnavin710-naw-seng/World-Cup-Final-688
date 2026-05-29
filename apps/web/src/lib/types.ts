export type ParticipantSession = {
  deviceId: string;
  displayName: string;
  teamCode: string;
};

export type Team = {
  code: string;
  name: string;
  thaiAlias?: string;
  group: string;
  flag: string;
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

export type CompanyPick = {
  displayName: string;
  teamCode: string;
  teamName: string;
  flag: string;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  isFeatured?: boolean;
  teamCode?: string;
};

export type TournamentPayload = {
  teams: Team[];
  knockout: KnockoutRound[];
  fixtures: Fixture[];
  standings: GroupStanding[];
  companyPicks: CompanyPick[];
  news: NewsItem[];
};
