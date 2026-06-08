import { Bell, MoreHorizontal } from "lucide-react";
import {
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type TabName = (typeof tabs)[number];
type TransitionDirection = "forward" | "backward";
type TabScreenLayer = "active" | "incoming" | "outgoing";

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
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("Knockout");
  const [outgoingTab, setOutgoingTab] = useState<TabName | null>(null);
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>("Date");
  const [fixtureGroupOverride, setFixtureGroupOverride] = useState("");
  const [tableMode, setTableMode] = useState<(typeof tableModes)[number]>("Short");
  const [scopeMode, setScopeMode] = useState<(typeof scopeModes)[number]>("Overall");
  const [transitionDirection, setTransitionDirection] =
    useState<TransitionDirection>("forward");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
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

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

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

  const completeTabTransition = useCallback(() => {
    setOutgoingTab(null);
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const handleTabChange = (nextTab: TabName) => {
    if (nextTab === activeTab || outgoingTab !== null) {
      return;
    }

    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = tabs.indexOf(nextTab);
    setTransitionDirection(nextIndex > currentIndex ? "forward" : "backward");

    if (prefersReducedMotion) {
      setActiveTab(nextTab);
      return;
    }

    setOutgoingTab(activeTab);
    setActiveTab(nextTab);
    transitionTimerRef.current = window.setTimeout(completeTabTransition, 360);
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

  const handleTabTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    swipeStart.current = touch
      ? { x: touch.clientX, y: touch.clientY }
      : null;
  };

  const handleTabTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;

    if (!start || !touch) {
      return;
    }

    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;
    const threshold = 48;

    if (
      Math.abs(horizontalDistance) < threshold ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    handleSwipeToTab(horizontalDistance < 0 ? "left" : "right");
  };

  const renderTabContent = (tab: TabName) => {
    if (tab === "Knockout") {
      return <KnockoutTab rounds={knockout} teams={teams} />;
    }

    if (tab === "Fixtures") {
      return (
        <FixturesTab
          activeFilter={fixtureFilter}
          companyPicks={companyPicks}
          fixtures={fixtures}
          participantTeamCode={participant.teamCode}
          selectedGroup={selectedFixtureGroup}
          showFilters={false}
        />
      );
    }

    if (tab === "Table") {
      return (
        <TableTab
          companyPicks={companyPicks}
          scopeMode={scopeMode}
          standings={standings}
          tableMode={tableMode}
        />
      );
    }

    return <NewsTab news={news} selectedTeam={selectedTeam} />;
  };

  const renderTabToolbar = (tab: TabName) => {
    if (tab === "Fixtures") {
      return (
        <section className="fixture-shell-toolbar">
          <FixtureFilters
            activeFilter={fixtureFilter}
            onFilterChange={setFixtureFilter}
            onGroupChange={setFixtureGroupOverride}
            selectedGroup={selectedFixtureGroup}
          />
        </section>
      );
    }

    if (tab === "Table") {
      return (
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
      );
    }

    return null;
  };

  const renderTabPanel = (tab: TabName, isOutgoing: boolean) => (
    <section
      className={[
        "tab-panel",
        tab === "Knockout" ? "tab-panel-knockout" : "",
        tab === "Fixtures" ? "tab-panel-fixtures" : "",
      ].filter(Boolean).join(" ")}
      onTouchStart={isOutgoing ? undefined : handleTabTouchStart}
      onTouchEnd={isOutgoing ? undefined : handleTabTouchEnd}
      onTouchCancel={
        isOutgoing
          ? undefined
          : () => {
              swipeStart.current = null;
            }
      }
    >
      {renderTabContent(tab)}
    </section>
  );

  const renderTabScreen = (tab: TabName, layer: TabScreenLayer) => {
    const isOutgoing = layer === "outgoing";
    const isIncoming = layer === "incoming";
    const directionClass = isOutgoing
      ? transitionDirection === "forward"
        ? "tab-screen-exit-left"
        : "tab-screen-exit-right"
      : isIncoming
        ? transitionDirection === "forward"
          ? "tab-screen-enter-right"
          : "tab-screen-enter-left"
        : "";

    return (
      <div
        key={`${layer}-${tab}`}
        aria-hidden={isOutgoing ? "true" : undefined}
        className={[
          "tab-screen",
          isOutgoing ? "tab-screen-outgoing" : "",
          isIncoming ? "tab-screen-incoming" : "",
          directionClass,
        ].filter(Boolean).join(" ")}
        data-tab-screen={tab}
        inert={isOutgoing ? true : undefined}
        onAnimationEnd={
          isIncoming
            ? (event) => {
                if (event.currentTarget === event.target) {
                  completeTabTransition();
                }
              }
            : undefined
        }
      >
        {renderTabToolbar(tab)}
        {renderTabPanel(tab, isOutgoing)}
      </div>
    );
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
          <div className="tab-transition-viewport">
            <div className="tab-transition-stage">
              {outgoingTab ? renderTabScreen(outgoingTab, "outgoing") : null}
              {renderTabScreen(activeTab, outgoingTab ? "incoming" : "active")}
            </div>
          </div>
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
