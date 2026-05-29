import type { Fixture, GroupStanding, KnockoutRound, NewsItem, TeamRecord } from "../types";

export const teams: TeamRecord[] = [
  { code: "ARG", name: "Argentina", thaiAlias: "อาร์เจนตินา", group: "A", flag: "🇦🇷" },
  { code: "BRA", name: "Brazil", thaiAlias: "บราซิล", group: "A", flag: "🇧🇷" },
  { code: "FRA", name: "France", thaiAlias: "ฝรั่งเศส", group: "A", flag: "🇫🇷" },
  { code: "ESP", name: "Spain", thaiAlias: "สเปน", group: "A", flag: "🇪🇸" },
  { code: "GER", name: "Germany", thaiAlias: "เยอรมนี", group: "B", flag: "🇩🇪" },
  { code: "POR", name: "Portugal", thaiAlias: "โปรตุเกส", group: "B", flag: "🇵🇹" },
  { code: "NED", name: "Netherlands", thaiAlias: "เนเธอร์แลนด์", group: "B", flag: "🇳🇱" },
  { code: "ENG", name: "England", thaiAlias: "อังกฤษ", group: "B", flag: "🏴" },
  { code: "ITA", name: "Italy", thaiAlias: "อิตาลี", group: "C", flag: "🇮🇹" },
  { code: "BEL", name: "Belgium", thaiAlias: "เบลเยียม", group: "C", flag: "🇧🇪" },
  { code: "CRO", name: "Croatia", thaiAlias: "โครเอเชีย", group: "C", flag: "🇭🇷" },
  { code: "URU", name: "Uruguay", thaiAlias: "อุรุกวัย", group: "C", flag: "🇺🇾" },
  { code: "JPN", name: "Japan", thaiAlias: "ญี่ปุ่น", group: "D", flag: "🇯🇵" },
  { code: "KOR", name: "South Korea", thaiAlias: "เกาหลีใต้", group: "D", flag: "🇰🇷" },
  { code: "USA", name: "United States", thaiAlias: "สหรัฐอเมริกา", group: "D", flag: "🇺🇸" },
  { code: "MEX", name: "Mexico", thaiAlias: "เม็กซิโก", group: "D", flag: "🇲🇽" },
  { code: "CAN", name: "Canada", thaiAlias: "แคนาดา", group: "E", flag: "🇨🇦" },
  { code: "MAR", name: "Morocco", thaiAlias: "โมร็อกโก", group: "E", flag: "🇲🇦" },
  { code: "SEN", name: "Senegal", thaiAlias: "เซเนกัล", group: "E", flag: "🇸🇳" },
  { code: "EGY", name: "Egypt", thaiAlias: "อียิปต์", group: "E", flag: "🇪🇬" },
  { code: "NGA", name: "Nigeria", thaiAlias: "ไนจีเรีย", group: "F", flag: "🇳🇬" },
  { code: "CMR", name: "Cameroon", thaiAlias: "แคเมอรูน", group: "F", flag: "🇨🇲" },
  { code: "GHA", name: "Ghana", thaiAlias: "กานา", group: "F", flag: "🇬🇭" },
  { code: "TUN", name: "Tunisia", thaiAlias: "ตูนิเซีย", group: "F", flag: "🇹🇳" },
  { code: "AUS", name: "Australia", thaiAlias: "ออสเตรเลีย", group: "G", flag: "🇦🇺" },
  { code: "NZL", name: "New Zealand", thaiAlias: "นิวซีแลนด์", group: "G", flag: "🇳🇿" },
  { code: "IRN", name: "Iran", thaiAlias: "อิหร่าน", group: "G", flag: "🇮🇷" },
  { code: "KSA", name: "Saudi Arabia", thaiAlias: "ซาอุดีอาระเบีย", group: "G", flag: "🇸🇦" },
  { code: "QAT", name: "Qatar", thaiAlias: "กาตาร์", group: "H", flag: "🇶🇦" },
  { code: "UAE", name: "United Arab Emirates", thaiAlias: "สหรัฐอาหรับเอมิเรตส์", group: "H", flag: "🇦🇪" },
  { code: "CHN", name: "China", thaiAlias: "จีน", group: "H", flag: "🇨🇳" },
  { code: "IND", name: "India", thaiAlias: "อินเดีย", group: "H", flag: "🇮🇳" },
  { code: "DEN", name: "Denmark", thaiAlias: "เดนมาร์ก", group: "I", flag: "🇩🇰" },
  { code: "SUI", name: "Switzerland", thaiAlias: "สวิตเซอร์แลนด์", group: "I", flag: "🇨🇭" },
  { code: "AUT", name: "Austria", thaiAlias: "ออสเตรีย", group: "I", flag: "🇦🇹" },
  { code: "SWE", name: "Sweden", thaiAlias: "สวีเดน", group: "I", flag: "🇸🇪" },
  { code: "NOR", name: "Norway", thaiAlias: "นอร์เวย์", group: "J", flag: "🇳🇴" },
  { code: "POL", name: "Poland", thaiAlias: "โปแลนด์", group: "J", flag: "🇵🇱" },
  { code: "CZE", name: "Czechia", thaiAlias: "เช็กเกีย", group: "J", flag: "🇨🇿" },
  { code: "SRB", name: "Serbia", thaiAlias: "เซอร์เบีย", group: "J", flag: "🇷🇸" },
  { code: "COL", name: "Colombia", thaiAlias: "โคลอมเบีย", group: "K", flag: "🇨🇴" },
  { code: "CHI", name: "Chile", thaiAlias: "ชิลี", group: "K", flag: "🇨🇱" },
  { code: "PER", name: "Peru", thaiAlias: "เปรู", group: "K", flag: "🇵🇪" },
  { code: "ECU", name: "Ecuador", thaiAlias: "เอกวาดอร์", group: "K", flag: "🇪🇨" },
  { code: "CRC", name: "Costa Rica", thaiAlias: "คอสตาริกา", group: "L", flag: "🇨🇷" },
  { code: "PAN", name: "Panama", thaiAlias: "ปานามา", group: "L", flag: "🇵🇦" },
  { code: "HON", name: "Honduras", thaiAlias: "ฮอนดูรัส", group: "L", flag: "🇭🇳" },
  { code: "JAM", name: "Jamaica", thaiAlias: "จาเมกา", group: "L", flag: "🇯🇲" }
];

export const knockout: KnockoutRound[] = [
  {
    round: "Round of 16",
    matches: [
      { id: "r16-1", homeTeam: "ARG", awayTeam: "GER", homeScore: 2, awayScore: 1, kickoff: "Sat 20:00" },
      { id: "r16-2", homeTeam: "BRA", awayTeam: "USA", homeScore: 3, awayScore: 0, kickoff: "Sat 23:00" },
    ],
  },
  {
    round: "Quarter-finals",
    matches: [
      { id: "qf-1", homeTeam: "ARG", awayTeam: "BRA", homeScore: 1, awayScore: 1, kickoff: "Tue 20:00" },
    ],
  },
  {
    round: "Semi-finals",
    matches: [
      { id: "sf-1", homeTeam: "ARG", awayTeam: "FRA", homeScore: 0, awayScore: 0, kickoff: "Fri 20:00" },
    ],
  },
];

export const fixtures: Fixture[] = [
  { id: "fx-1", round: "Round of 16", homeTeam: "ARG", awayTeam: "GER", homeFlag: "🇦🇷", awayFlag: "🇩🇪", kickoff: "2026-06-28 20:00" },
  { id: "fx-2", round: "Round of 16", homeTeam: "BRA", awayTeam: "USA", homeFlag: "🇧🇷", awayFlag: "🇺🇸", kickoff: "2026-06-28 23:00" },
  { id: "fx-3", round: "Quarter-finals", homeTeam: "ARG", awayTeam: "BRA", homeFlag: "🇦🇷", awayFlag: "🇧🇷", kickoff: "2026-07-02 20:00" },
];

export const standings: GroupStanding[] = [
  {
    group: "A",
    rows: [
      { team: "Argentina", played: 3, points: 7, goalDiff: 5 },
      { team: "Brazil", played: 3, points: 6, goalDiff: 3 },
      { team: "France", played: 3, points: 4, goalDiff: 1 },
      { team: "Spain", played: 3, points: 0, goalDiff: -4 },
    ],
  },
  {
    group: "B",
    rows: [
      { team: "Germany", played: 3, points: 7, goalDiff: 4 },
      { team: "Portugal", played: 3, points: 5, goalDiff: 1 },
      { team: "Netherlands", played: 3, points: 3, goalDiff: -1 },
      { team: "England", played: 3, points: 1, goalDiff: -4 },
    ],
  },
];

export const news: NewsItem[] = [
  {
    id: "news-1",
    title: "Quarter-final bracket begins to settle after a dramatic final day",
    summary: "The bracket now has enough shape to show likely heavyweight clashes, with South American sides dominating the top half of the draw.",
    isFeatured: true,
  },
  {
    id: "news-2",
    title: "Argentina spotlight: midfield balance becomes the key talking point",
    summary: "Argentina's route through the knockout stage now depends on controlling tempo against more physical opponents in the next round.",
    teamCode: "ARG",
  },
  {
    id: "news-3",
    title: "Company picks tighten as popular teams disappear from the board",
    summary: "More of the marquee nations are now locked by participants, leaving late pickers to search deeper into the field.",
  },
];
