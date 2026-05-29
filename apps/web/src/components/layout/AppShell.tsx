import { Bell, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFixtures,
  fetchKnockout,
  fetchNews,
  fetchStandings,
  fetchTeams,
} from "../../lib/api";
import type {
  CompanyPick,
  Fixture,
  GroupStanding,
  KnockoutRound,
  NewsItem,
  ParticipantSession,
  Team,
} from "../../lib/types";
import { KnockoutTab } from "../home/KnockoutTab";
import { FixturesTab } from "../home/FixturesTab";
import { NewsTab } from "../home/NewsTab";
import { TableTab } from "../home/TableTab";
import { BrandHeader } from "../ui/BrandHeader";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { NotificationPanel } from "../ui/NotificationPanel";

const tabs = ["Knockout", "Fixtures", "Table", "News"] as const;

type AppShellProps = {
  brandName: string;
  participant: ParticipantSession;
  onChangeTeam: () => void;
  onResetDevice: () => Promise<void>;
};

export function AppShell({
  brandName,
  onChangeTeam,
  onResetDevice,
  participant,
}: AppShellProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Knockout");
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [knockout, setKnockout] = useState<KnockoutRound[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [companyPicks, setCompanyPicks] = useState<CompanyPick[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    void Promise.all([fetchTeams(), fetchKnockout(), fetchFixtures(), fetchStandings(), fetchNews()]).then(
      ([teamsData, knockoutData, fixturesData, tableData, newsData]) => {
        setTeams(teamsData.teams);
        setKnockout(knockoutData.knockout);
        setFixtures(fixturesData.fixtures);
        setStandings(tableData.standings);
        setCompanyPicks(tableData.companyPicks);
        setNews(newsData.news);
      },
    );
  }, []);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.code === participant.teamCode) ?? null,
    [participant.teamCode, teams],
  );

  const content = {
    Knockout: <KnockoutTab rounds={knockout} />,
    Fixtures: <FixturesTab fixtures={fixtures} participantTeamCode={participant.teamCode} />,
    Table: <TableTab companyPicks={companyPicks} standings={standings} />,
    News: <NewsTab news={news} selectedTeam={selectedTeam} />,
  }[activeTab];

  useEffect(() => {
    const activeButton = tabRefs.current[tabs.indexOf(activeTab)];
    if (activeButton && typeof activeButton.scrollIntoView === "function") {
      activeButton.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeTab]);

  return (
    <main className="app-shell">
      <div className="container">
        <header className="topbar">
          <BrandHeader brandName={brandName} compact showMark={false} />
          <div className="topbar-actions">
            <button
              aria-label="Notifications"
              className="icon-button"
              type="button"
              onClick={() => {
                setShowMenu(false);
                setShowNotifications((current) => !current);
              }}
            >
              <Bell size={18} />
            </button>
            <button
              aria-label="More options"
              className="icon-button"
              type="button"
              onClick={() => {
                setShowNotifications(false);
                setShowMenu((current) => !current);
              }}
            >
              <MoreHorizontal size={18} />
            </button>
            {showNotifications ? <NotificationPanel /> : null}
            {showMenu ? (
              <div className="menu-panel">
                <div className="menu-panel-label">Selected Team</div>
                <div className="menu-panel-value">
                  <span aria-hidden="true">{selectedTeam?.flag ?? "🏳️"}</span>
                  <span>{selectedTeam?.name ?? "Unknown Team"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowChangeConfirm(true);
                  }}
                >
                  Change Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowResetConfirm(true);
                  }}
                >
                  Reset this device
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <nav aria-label="Home tabs" className="tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              aria-selected={activeTab === tab}
              className="tab-button"
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <section className="tab-panel">{content}</section>
      </div>

      <ConfirmDialog
        confirmLabel="Change Team"
        description="Do you want to return to the selection screen and pick another team?"
        onCancel={() => setShowChangeConfirm(false)}
        onConfirm={() => {
          setShowChangeConfirm(false);
          onChangeTeam();
        }}
        open={showChangeConfirm}
        title="Change Team"
      />

      <ConfirmDialog
        confirmLabel="Reset Device"
        description="This will clear your remembered session and release your team back to available."
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false);
          void onResetDevice();
        }}
        open={showResetConfirm}
        title="Reset This Device"
      />
    </main>
  );
}
