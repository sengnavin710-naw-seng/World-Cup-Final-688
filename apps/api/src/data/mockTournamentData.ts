import type { Fixture, GroupStanding, KnockoutRound, NewsItem, TeamRecord } from "../types";

export const teams: TeamRecord[] = [
  { code: "MEX", name: "Mexico", thaiAlias: "Mexico", group: "A", flag: "🇲🇽" },
  { code: "KOR", name: "South Korea", thaiAlias: "South Korea", group: "A", flag: "🇰🇷" },
  { code: "ZAF", name: "South Africa", thaiAlias: "South Africa", group: "A", flag: "🇿🇦" },
  { code: "CZE", name: "Czech Republic", thaiAlias: "Czech Republic", group: "A", flag: "🇨🇿" },
  { code: "CAN", name: "Canada", thaiAlias: "Canada", group: "B", flag: "🇨🇦" },
  { code: "SUI", name: "Switzerland", thaiAlias: "Switzerland", group: "B", flag: "🇨🇭" },
  { code: "QAT", name: "Qatar", thaiAlias: "Qatar", group: "B", flag: "🇶🇦" },
  { code: "BIH", name: "Bosnia and Herzegovina", thaiAlias: "Bosnia", group: "B", flag: "🇧🇦" },
  { code: "BRA", name: "Brazil", thaiAlias: "Brazil", group: "C", flag: "🇧🇷" },
  { code: "MAR", name: "Morocco", thaiAlias: "Morocco", group: "C", flag: "🇲🇦" },
  { code: "SCO", name: "Scotland", thaiAlias: "Scotland", group: "C", flag: "🏴" },
  { code: "HTI", name: "Haiti", thaiAlias: "Haiti", group: "C", flag: "🇭🇹" },
  { code: "USA", name: "United States", thaiAlias: "United States", group: "D", flag: "🇺🇸" },
  { code: "AUS", name: "Australia", thaiAlias: "Australia", group: "D", flag: "🇦🇺" },
  { code: "PAR", name: "Paraguay", thaiAlias: "Paraguay", group: "D", flag: "🇵🇾" },
  { code: "TUR", name: "Turkey", thaiAlias: "Turkey", group: "D", flag: "🇹🇷" },
  { code: "GER", name: "Germany", thaiAlias: "Germany", group: "E", flag: "🇩🇪" },
  { code: "ECU", name: "Ecuador", thaiAlias: "Ecuador", group: "E", flag: "🇪🇨" },
  { code: "CIV", name: "Ivory Coast", thaiAlias: "Ivory Coast", group: "E", flag: "🇨🇮" },
  { code: "CUW", name: "Curaçao", thaiAlias: "Curacao", group: "E", flag: "🇨🇼" },
  { code: "NED", name: "Netherlands", thaiAlias: "Netherlands", group: "F", flag: "🇳🇱" },
  { code: "JPN", name: "Japan", thaiAlias: "Japan", group: "F", flag: "🇯🇵" },
  { code: "TUN", name: "Tunisia", thaiAlias: "Tunisia", group: "F", flag: "🇹🇳" },
  { code: "SWE", name: "Sweden", thaiAlias: "Sweden", group: "F", flag: "🇸🇪" },
  { code: "BEL", name: "Belgium", thaiAlias: "Belgium", group: "G", flag: "🇧🇪" },
  { code: "IRN", name: "Iran", thaiAlias: "Iran", group: "G", flag: "🇮🇷" },
  { code: "EGY", name: "Egypt", thaiAlias: "Egypt", group: "G", flag: "🇪🇬" },
  { code: "NZL", name: "New Zealand", thaiAlias: "New Zealand", group: "G", flag: "🇳🇿" },
  { code: "ESP", name: "Spain", thaiAlias: "Spain", group: "H", flag: "🇪🇸" },
  { code: "URU", name: "Uruguay", thaiAlias: "Uruguay", group: "H", flag: "🇺🇾" },
  { code: "KSA", name: "Saudi Arabia", thaiAlias: "Saudi Arabia", group: "H", flag: "🇸🇦" },
  { code: "CPV", name: "Cabo Verde", thaiAlias: "Cabo Verde", group: "H", flag: "🇨🇻" },
  { code: "FRA", name: "France", thaiAlias: "France", group: "I", flag: "🇫🇷" },
  { code: "SEN", name: "Senegal", thaiAlias: "Senegal", group: "I", flag: "🇸🇳" },
  { code: "NOR", name: "Norway", thaiAlias: "Norway", group: "I", flag: "🇳🇴" },
  { code: "IRQ", name: "Iraq", thaiAlias: "Iraq", group: "I", flag: "🇮🇶" },
  { code: "ARG", name: "Argentina", thaiAlias: "Argentina", group: "J", flag: "🇦🇷" },
  { code: "AUT", name: "Austria", thaiAlias: "Austria", group: "J", flag: "🇦🇹" },
  { code: "ALG", name: "Algeria", thaiAlias: "Algeria", group: "J", flag: "🇩🇿" },
  { code: "JOR", name: "Jordan", thaiAlias: "Jordan", group: "J", flag: "🇯🇴" },
  { code: "POR", name: "Portugal", thaiAlias: "Portugal", group: "K", flag: "🇵🇹" },
  { code: "COL", name: "Colombia", thaiAlias: "Colombia", group: "K", flag: "🇨🇴" },
  { code: "UZB", name: "Uzbekistan", thaiAlias: "Uzbekistan", group: "K", flag: "🇺🇿" },
  { code: "COD", name: "DR Congo", thaiAlias: "CR Congo", group: "K", flag: "🇨🇩" },
  { code: "ENG", name: "England", thaiAlias: "England", group: "L", flag: "🏴" },
  { code: "CRO", name: "Croatia", thaiAlias: "Croatia", group: "L", flag: "🇭🇷" },
  { code: "PAN", name: "Panama", thaiAlias: "Panama", group: "L", flag: "🇵🇦" },
  { code: "GHA", name: "Ghana", thaiAlias: "Ghana", group: "L", flag: "🇬🇭" },
];

const makeKnockoutMatch = (
  id: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
  side: "left" | "right" | "center",
  bracketColumn: number,
  bracketSlot: number,
  badge?: string,
) => ({
  id,
  homeTeam,
  awayTeam,
  homeScore: 0,
  awayScore: 0,
  kickoff,
  side,
  bracketColumn,
  bracketSlot,
  badge,
});

export const knockout: KnockoutRound[] = [
  {
    round: "Round of 32",
    matches: [
      makeKnockoutMatch("r32-l1", "1E", "3AB", "Jun 30", "left", 1, 1),
      makeKnockoutMatch("r32-l2", "1I", "3CD", "Jul 1", "left", 1, 2),
      makeKnockoutMatch("r32-l3", "2A", "2B", "Jun 28", "left", 1, 3),
      makeKnockoutMatch("r32-l4", "1F", "2C", "Jun 30", "left", 1, 4),
      makeKnockoutMatch("r32-l5", "2K", "2L", "Jul 3", "left", 1, 5),
      makeKnockoutMatch("r32-l6", "1H", "2J", "Jul 2", "left", 1, 6),
      makeKnockoutMatch("r32-l7", "1D", "3BE", "Jul 2", "left", 1, 7),
      makeKnockoutMatch("r32-l8", "1G", "3AF", "Jul 2", "left", 1, 8),
      makeKnockoutMatch("r32-r1", "1C", "2F", "Jun 29", "right", 1, 1),
      makeKnockoutMatch("r32-r2", "2E", "2I", "Jun 30", "right", 1, 2),
      makeKnockoutMatch("r32-r3", "1A", "3CE", "Jul 1", "right", 1, 3),
      makeKnockoutMatch("r32-r4", "1L", "3EH", "Jul 1", "right", 1, 4),
      makeKnockoutMatch("r32-r5", "1J", "2H", "Jul 4", "right", 1, 5),
      makeKnockoutMatch("r32-r6", "2D", "2G", "Jul 3", "right", 1, 6),
      makeKnockoutMatch("r32-r7", "1B", "3EF", "Jul 3", "right", 1, 7),
      makeKnockoutMatch("r32-r8", "1K", "3DE", "Jul 4", "right", 1, 8),
    ],
  },
  {
    round: "Round of 16",
    matches: [
      makeKnockoutMatch("r16-l1", "1EA", "1C", "Jul 5", "left", 2, 1),
      makeKnockoutMatch("r16-l2", "2AB", "1FC", "Jul 4", "left", 2, 2),
      makeKnockoutMatch("r16-l3", "2KL", "1HJ", "Jul 6", "left", 2, 3),
      makeKnockoutMatch("r16-l4", "1DB", "1GA", "Jul 7", "left", 2, 4),
      makeKnockoutMatch("r16-r1", "1CF", "2EI", "Jul 6", "right", 2, 1),
      makeKnockoutMatch("r16-r2", "1AC", "1LE", "Jul 6", "right", 2, 2),
      makeKnockoutMatch("r16-r3", "1JH", "2DG", "Jul 7", "right", 2, 3),
      makeKnockoutMatch("r16-r4", "1BE", "1KD", "Jul 8", "right", 2, 4),
    ],
  },
  {
    round: "Quarter-finals",
    matches: [
      makeKnockoutMatch("qf-l1", "EF1", "EF2", "Jul 10", "left", 3, 1),
      makeKnockoutMatch("qf-l2", "EF5", "EF6", "Jul 10", "left", 3, 2),
      makeKnockoutMatch("qf-r1", "EF3", "EF4", "Jul 12", "right", 3, 1),
      makeKnockoutMatch("qf-r2", "EF7", "EF8", "Jul 12", "right", 3, 2),
    ],
  },
  {
    round: "Semi-finals",
    matches: [
      makeKnockoutMatch("sf-l1", "WQ1", "WQ2", "Jul 14", "left", 4, 1),
      makeKnockoutMatch("sf-r1", "WQ3", "WQ4", "Jul 15", "right", 4, 1),
    ],
  },
  {
    round: "Finals",
    matches: [
      makeKnockoutMatch("final", "WS1", "WS2", "Jul 19", "center", 1, 1, "FINAL"),
      makeKnockoutMatch("bronze", "LS1", "LS2", "Jul 18", "center", 1, 2, "BRONZE-FINAL"),
    ],
  },
];

export const fixtures: Fixture[] = [
  { id: "fx-1", round: "Round of 16", homeTeam: "MEX", awayTeam: "SUI", homeFlag: "🇲🇽", awayFlag: "🇨🇭", kickoff: "2026-06-28 20:00" },
  { id: "fx-2", round: "Round of 16", homeTeam: "BRA", awayTeam: "AUS", homeFlag: "🇧🇷", awayFlag: "🇦🇺", kickoff: "2026-06-28 23:00" },
  { id: "fx-3", round: "Quarter-finals", homeTeam: "FRA", awayTeam: "ARG", homeFlag: "🇫🇷", awayFlag: "🇦🇷", kickoff: "2026-07-10 20:00" },
];

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

const makeStandingRow = (teamCode: string, team: string, flag: string) => ({
  teamCode,
  team,
  flag,
  stats: {
    overall: emptyStats(),
    home: emptyStats(),
    away: emptyStats(),
  },
});

export const standings: GroupStanding[] = [
  {
    group: "A",
    rows: [
      makeStandingRow("MEX", "Mexico", "🇲🇽"),
      makeStandingRow("KOR", "South Korea", "🇰🇷"),
      makeStandingRow("ZAF", "South Africa", "🇿🇦"),
      makeStandingRow("CZE", "Czech Republic", "🇨🇿"),
    ],
  },
  {
    group: "B",
    rows: [
      makeStandingRow("CAN", "Canada", "🇨🇦"),
      makeStandingRow("SUI", "Switzerland", "🇨🇭"),
      makeStandingRow("QAT", "Qatar", "🇶🇦"),
      makeStandingRow("BIH", "Bosnia and Herzegovina", "🇧🇦"),
    ],
  },
  {
    group: "C",
    rows: [
      makeStandingRow("BRA", "Brazil", "🇧🇷"),
      makeStandingRow("MAR", "Morocco", "🇲🇦"),
      makeStandingRow("SCO", "Scotland", "🏴"),
      makeStandingRow("HTI", "Haiti", "🇭🇹"),
    ],
  },
  {
    group: "D",
    rows: [
      makeStandingRow("USA", "United States", "🇺🇸"),
      makeStandingRow("AUS", "Australia", "🇦🇺"),
      makeStandingRow("PAR", "Paraguay", "🇵🇾"),
      makeStandingRow("TUR", "Turkey", "🇹🇷"),
    ],
  },
  {
    group: "E",
    rows: [
      makeStandingRow("GER", "Germany", "🇩🇪"),
      makeStandingRow("ECU", "Ecuador", "🇪🇨"),
      makeStandingRow("CIV", "Ivory Coast", "🇨🇮"),
      makeStandingRow("CUW", "Curaçao", "🇨🇼"),
    ],
  },
  {
    group: "F",
    rows: [
      makeStandingRow("NED", "Netherlands", "🇳🇱"),
      makeStandingRow("JPN", "Japan", "🇯🇵"),
      makeStandingRow("TUN", "Tunisia", "🇹🇳"),
      makeStandingRow("SWE", "Sweden", "🇸🇪"),
    ],
  },
  {
    group: "G",
    rows: [
      makeStandingRow("BEL", "Belgium", "🇧🇪"),
      makeStandingRow("IRN", "Iran", "🇮🇷"),
      makeStandingRow("EGY", "Egypt", "🇪🇬"),
      makeStandingRow("NZL", "New Zealand", "🇳🇿"),
    ],
  },
  {
    group: "H",
    rows: [
      makeStandingRow("ESP", "Spain", "🇪🇸"),
      makeStandingRow("URU", "Uruguay", "🇺🇾"),
      makeStandingRow("KSA", "Saudi Arabia", "🇸🇦"),
      makeStandingRow("CPV", "Cabo Verde", "🇨🇻"),
    ],
  },
  {
    group: "I",
    rows: [
      makeStandingRow("FRA", "France", "🇫🇷"),
      makeStandingRow("SEN", "Senegal", "🇸🇳"),
      makeStandingRow("NOR", "Norway", "🇳🇴"),
      makeStandingRow("IRQ", "Iraq", "🇮🇶"),
    ],
  },
  {
    group: "J",
    rows: [
      makeStandingRow("ARG", "Argentina", "🇦🇷"),
      makeStandingRow("AUT", "Austria", "🇦🇹"),
      makeStandingRow("ALG", "Algeria", "🇩🇿"),
      makeStandingRow("JOR", "Jordan", "🇯🇴"),
    ],
  },
  {
    group: "K",
    rows: [
      makeStandingRow("POR", "Portugal", "🇵🇹"),
      makeStandingRow("COL", "Colombia", "🇨🇴"),
      makeStandingRow("UZB", "Uzbekistan", "🇺🇿"),
      makeStandingRow("COD", "DR Congo", "🇨🇩"),
    ],
  },
  {
    group: "L",
    rows: [
      makeStandingRow("ENG", "England", "🏴"),
      makeStandingRow("CRO", "Croatia", "🇭🇷"),
      makeStandingRow("PAN", "Panama", "🇵🇦"),
      makeStandingRow("GHA", "Ghana", "🇬🇭"),
    ],
  },
];

export const news: NewsItem[] = [
  {
    id: "news-1",
    title: "Final draw complete as all twelve groups are locked in for 2026",
    summary: "The expanded 48-team field is now set, giving supporters a full look at every group from A through L.",
    isFeatured: true,
  },
  {
    id: "news-2",
    title: "Argentina spotlight: Group J already looks like one of the most competitive sections",
    summary: "Argentina, Austria, Algeria, and Jordan give Group J a balanced mix of pedigree, structure, and upset potential.",
    teamCode: "ARG",
  },
  {
    id: "news-3",
    title: "Company picks will move quickly now that the official group lineup is clearer",
    summary: "With the 48-team board now aligned to the latest field, participants can make cleaner choices before fixtures begin.",
  },
];
