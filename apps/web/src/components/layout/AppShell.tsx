import { Bell, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  FixtureFilters,
  FixturesTab,
  type FixtureFilter,
} from "../home/FixturesTab";
import { KnockoutTab } from "../home/KnockoutTab";
import { NewsTab } from "../home/NewsTab";
import { TableTab } from "../home/TableTab";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { BrandHeader } from "../ui/BrandHeader";
import { NotificationPanel } from "../ui/NotificationPanel";

const tabs = ["Knockout", "Fixtures", "Table", "News"] as const;
const tableModes = ["Short", "Full"] as const;
const scopeModes = ["Overall", "Home", "Away"] as const;

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
  const swipeStartX = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Knockout");
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>("Date");
  const [fixtureGroupOverride, setFixtureGroupOverride] = useState("");
  const [tableMode, setTableMode] = useState<(typeof tableModes)[number]>("Short");
  const [scopeMode, setScopeMode] = useState<(typeof scopeModes)[number]>("Overall");
  const [transitionDirection, setTransitionDirection] = useState<"left" | "right">("right");
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
  const [homeStatus, setHomeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [homeError, setHomeError] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const loadHomeData = useCallback(() => {
    setHomeStatus("loading");
    setHomeError("");

    void fetchTeams()
      .then((teamsData) => {
        setTeams(teamsData.teams);
      })
      .catch(() => {
        setTeams([]);
      });

    void Promise.all([fetchKnockout(), fetchFixtures(), fetchStandings(), fetchNews()])
      .then(([knockoutData, fixturesData, tableData, newsData]) => {
        setKnockout(knockoutData.knockout);
        setFixtures(fixturesData.fixtures);
        setStandings(tableData.standings);
        setCompanyPicks(tableData.companyPicks);
        setNews(newsData.news);
        setHomeStatus("ready");
      })
      .catch(() => {
        setHomeStatus("error");
        setHomeError("Unable to load the latest tournament dashboard right now.");
      });
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.code === participant.teamCode) ?? null,
    [participant.teamCode, teams],
  );
  const participantFixtureGroup = useMemo(
    () =>
      fixtures.find(
        (fixture) =>
          fixture.homeTeam === participant.teamCode ||
          fixture.awayTeam === participant.teamCode,
      )?.group ??
      fixtures[0]?.group ??
      "A",
    [fixtures, participant.teamCode],
  );
  const selectedFixtureGroup = fixtureGroupOverride || participantFixtureGroup;

  const content = {
    Knockout: <KnockoutTab rounds={knockout} teams={teams} />,
    Fixtures: (
      <FixturesTab
        activeFilter={fixtureFilter}
        companyPicks={companyPicks}
        fixtures={fixtures}
        participantTeamCode={participant.teamCode}
        selectedGroup={selectedFixtureGroup}
        showFilters={false}
      />
    ),
    Table: (
      <TableTab
        companyPicks={companyPicks}
        scopeMode={scopeMode}
        standings={standings}
        tableMode={tableMode}
      />
    ),
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

  const handleTabChange = (nextTab: (typeof tabs)[number]) => {
    if (nextTab === activeTab) {
      return;
    }

    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = tabs.indexOf(nextTab);
    setTransitionDirection(nextIndex > currentIndex ? "right" : "left");
    setActiveTab(nextTab);
  };

  const handleSwipeToTab = (direction: "left" | "right") => {
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex =
      direction === "left"
        ? Math.min(currentIndex + 1, tabs.length - 1)
        : Math.max(currentIndex - 1, 0);

    if (nextIndex !== currentIndex) {
      handleTabChange(tabs[nextIndex]);
    }
  };

  return (
    <main className="app-shell">
      <div className="container">
        <section className="home-chrome">
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
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </section>

        {homeStatus === "ready" && activeTab === "Fixtures" ? (
          <section className="fixture-shell-toolbar">
            <FixtureFilters
              activeFilter={fixtureFilter}
              onFilterChange={setFixtureFilter}
              onGroupChange={setFixtureGroupOverride}
              selectedGroup={selectedFixtureGroup}
            />
          </section>
        ) : null}

        {homeStatus === "ready" && activeTab === "Table" ? (
          <section className="table-shell-toolbar">
            <div className="table-toggle-group" role="tablist" aria-label="Table detail mode">
              {tableModes.map((mode) => (
                <button
                  key={mode}
                  aria-selected={tableMode === mode}
                  className={`table-toggle-button${tableMode === mode ? " active" : ""}`}
                  role="tab"
                  type="button"
                  onClick={() => setTableMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            <label className="scope-select-wrap">
              <span className="sr-only">Scope</span>
              <select
                className="scope-select"
                value={scopeMode}
                onChange={(event) => setScopeMode(event.target.value as (typeof scopeModes)[number])}
              >
                {scopeModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        {homeStatus === "loading" ? (
          <section className="tab-panel state-card">
            <span className="summary-label">Dashboard</span>
            <strong>Loading the latest tournament dashboard...</strong>
            <p className="state-copy">We are fetching knockout, fixtures, standings, and news for your current session.</p>
          </section>
        ) : null}
        {homeStatus === "error" ? (
          <section className="tab-panel state-card">
            <span className="summary-label">Dashboard</span>
            <strong>Unable to load the latest dashboard.</strong>
            <p className="state-copy">{homeError}</p>
            <div className="inline-actions">
              <button className="primary-button" type="button" onClick={loadHomeData}>
                Retry
              </button>
            </div>
          </section>
        ) : null}
        {homeStatus === "ready" ? (
          <section
            className={[
              "tab-panel",
              activeTab === "Knockout" ? "tab-panel-knockout" : "",
              activeTab === "Fixtures" ? "tab-panel-fixtures" : "",
            ].filter(Boolean).join(" ")}
            onTouchStart={(event) => {
              swipeStartX.current = event.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const startX = swipeStartX.current;
              const endX = event.changedTouches[0]?.clientX ?? null;
              swipeStartX.current = null;

              if (startX === null || endX === null) {
                return;
              }

              const distance = endX - startX;
              const threshold = 48;

              if (Math.abs(distance) < threshold) {
                return;
              }

              handleSwipeToTab(distance < 0 ? "left" : "right");
            }}
          >
            <div key={activeTab} className={`tab-panel-content slide-from-${transitionDirection}`}>
              {content}
            </div>
          </section>
        ) : null}
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
        confirmLabel={resetting ? "Resetting..." : "Reset Device"}
        description="This will clear your remembered session and release your team back to available."
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setResetting(true);
          setResetError("");
          void onResetDevice()
            .then(() => {
              setShowResetConfirm(false);
            })
            .catch(() => {
              setResetError("Unable to reset this device right now. Please try again.");
            })
            .finally(() => {
              setResetting(false);
            });
        }}
        open={showResetConfirm}
        title="Reset This Device"
      />
      {resetError ? (
        <div className="floating-feedback" role="status">
          {resetError}
        </div>
      ) : null}
    </main>
  );
}
