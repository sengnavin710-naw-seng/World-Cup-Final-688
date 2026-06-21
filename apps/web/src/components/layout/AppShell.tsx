import { useQueryClient } from "@tanstack/react-query";
import { Bell, MoreHorizontal } from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useHomeTabQueries } from "../../hooks/useHomeTabQueries";
import {
  homeTabs,
  prefetchTabData,
  type HomeTab,
} from "../../lib/tournamentQueries";
import type { ParticipantSession } from "../../lib/types";
import {
  FixtureFilters,
  type FixtureFilter,
} from "../home/FixtureFilters";
import { BrandHeader } from "../ui/BrandHeader";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { NotificationPanel } from "../ui/NotificationPanel";
import {
  TabCarousel,
  type TabCarouselMotionState,
  type TabNavigationRequest,
} from "./TabCarousel";
import { TabErrorBoundary } from "./TabErrorBoundary";
import { TabLoadState, TabRefreshNotice } from "./TabLoadState";
import {
  LazyFixturesTab,
  LazyKnockoutTab,
  LazyNewsTab,
  LazyTableTab,
  preloadTabModule,
} from "./tabModules";

const tabs = homeTabs;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex] ?? tabs[0];
  const queryClient = useQueryClient();
  const queries = useHomeTabQueries(activeIndex);
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>("Date");
  const [fixtureGroupOverride, setFixtureGroupOverride] = useState("");
  const [tableMode, setTableMode] = useState<(typeof tableModes)[number]>("Short");
  const [scopeMode, setScopeMode] =
    useState<(typeof scopeModes)[number]>("Overall");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsRef = useRef<HTMLElement | null>(null);
  const [tabNavigationRequest, setTabNavigationRequest] =
    useState<TabNavigationRequest | null>(null);
  const [tabMotion, setTabMotion] = useState<TabCarouselMotionState>({
    pendingIndex: null,
    phase: "idle",
    visualIndex: 0,
  });
  const tabMotionRef = useRef(tabMotion);
  tabMotionRef.current = tabMotion;
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState<CSSProperties>({
    transform: "translate3d(0px, 0, 0)",
    width: "0px",
  });

  const selectedTeam = useMemo(
    () =>
      queries.teams.data?.find((team) => team.code === participant.teamCode) ??
      null,
    [participant.teamCode, queries.teams.data],
  );
  const participantFixtureGroup = useMemo(
    () =>
      queries.fixtures.data?.find(
        (fixture) =>
          fixture.homeTeam === participant.teamCode ||
          fixture.awayTeam === participant.teamCode,
      )?.group ??
      queries.fixtures.data?.[0]?.group ??
      "A",
    [participant.teamCode, queries.fixtures.data],
  );
  const selectedFixtureGroup = fixtureGroupOverride || participantFixtureGroup;

  const prefetchTab = useCallback(
    (tab: HomeTab) => {
      void Promise.all([
        preloadTabModule(tab),
        prefetchTabData(queryClient, tab),
      ]).catch(() => undefined);
    },
    [queryClient],
  );

  const requestTabNavigation = useCallback(
    (index: number) => {
      const targetTab = tabs[index];

      if (!targetTab || index === activeIndex) {
        return;
      }

      prefetchTab(targetTab);
      setTabNavigationRequest((current) => ({
        id: (current ? current.id : 0) + 1,
        index,
      }));
    },
    [activeIndex, prefetchTab],
  );

  useEffect(() => {
    const neighbors = [tabs[activeIndex - 1], tabs[activeIndex + 1]].filter(
      (tab): tab is HomeTab => Boolean(tab),
    );

    neighbors.forEach(prefetchTab);
  }, [activeIndex, prefetchTab]);

  useEffect(() => {
    const preloadRemaining = () => tabs.forEach(prefetchTab);
    const idleWindow = window as Window & {
      cancelIdleCallback?: (id: number) => void;
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const id = idleWindow.requestIdleCallback(preloadRemaining, {
        timeout: 1500,
      });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(preloadRemaining, 700);
    return () => window.clearTimeout(id);
  }, [prefetchTab]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const activeButton = tabRefs.current[activeIndex];

    if (activeButton && typeof activeButton.scrollIntoView === "function") {
      activeButton.scrollIntoView({
        behavior: "auto",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  const updateTabIndicator = useCallback(() => {
    const currentTabMotion = tabMotionRef.current;
    const visualIndex = Math.min(
      Math.max(currentTabMotion.visualIndex, 0),
      tabs.length - 1,
    );
    const lowerIndex = Math.floor(visualIndex);
    const upperIndex = Math.min(lowerIndex + 1, tabs.length - 1);
    const progress = visualIndex - lowerIndex;
    const lowerButton = tabRefs.current[lowerIndex];
    const upperButton = tabRefs.current[upperIndex] || lowerButton;

    if (!lowerButton || !upperButton) {
      return;
    }

    const left =
      lowerButton.offsetLeft +
      (upperButton.offsetLeft - lowerButton.offsetLeft) * progress;
    const width =
      lowerButton.offsetWidth +
      (upperButton.offsetWidth - lowerButton.offsetWidth) * progress;

    const transform = `translate3d(${left}px, 0, 0)`;
    const transition =
      prefersReducedMotion || currentTabMotion.phase === "dragging"
        ? "none"
        : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)";
    const indicatorWidth = `${width}px`;

    setTabIndicatorStyle((currentStyle) => {
      if (
        currentStyle.transform === transform &&
        currentStyle.transition === transition &&
        currentStyle.width === indicatorWidth
      ) {
        return currentStyle;
      }

      return {
        transform,
        transition,
        width: indicatorWidth,
      };
    });
  }, [prefersReducedMotion]);

  useLayoutEffect(() => {
    updateTabIndicator();
  }, [tabMotion.phase, tabMotion.visualIndex, updateTabIndicator]);

  useLayoutEffect(() => {
    const tabsElement = tabsRef.current;

    if (!tabsElement || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateTabIndicator);
    resizeObserver.observe(tabsElement);
    tabRefs.current.forEach((button) => {
      if (button) {
        resizeObserver.observe(button);
      }
    });

    return () => resizeObserver.disconnect();
  }, [updateTabIndicator]);

  const renderTabContent = (tab: HomeTab) => {
    if (tab === "Knockout") {
      if (!queries.knockout.data) {
        return (
          <TabLoadState
            label="Knockout"
            state={queries.knockout.isError ? "error" : "loading"}
            onRetry={() => void queries.knockout.refetch()}
          />
        );
      }

      return (
        <>
          {queries.knockout.isError || queries.teams.isError ? (
            <TabRefreshNotice
              onRetry={() => {
                void queries.knockout.refetch();
                void queries.teams.refetch();
              }}
            />
          ) : null}
          <LazyKnockoutTab
            onFastForwardSwipe={() => requestTabNavigation(1)}
            rounds={queries.knockout.data}
            teams={queries.teams.data ?? []}
          />
        </>
      );
    }

    if (tab === "Fixtures") {
      if (!queries.fixtures.data) {
        return (
          <TabLoadState
            label="Fixtures"
            state={queries.fixtures.isError ? "error" : "loading"}
            onRetry={() => void queries.fixtures.refetch()}
          />
        );
      }

      return (
        <>
          {queries.fixtures.isError || queries.table.isError ? (
            <TabRefreshNotice
              onRetry={() => {
                void queries.fixtures.refetch();
                void queries.table.refetch();
              }}
            />
          ) : null}
          <LazyFixturesTab
            activeFilter={fixtureFilter}
            companyPicks={queries.table.data?.companyPicks ?? []}
            fixtures={queries.fixtures.data}
            participantTeamCode={participant.teamCode}
            selectedGroup={selectedFixtureGroup}
            showFilters={false}
          />
        </>
      );
    }

    if (tab === "Table") {
      if (!queries.table.data) {
        return (
          <TabLoadState
            label="Table"
            state={queries.table.isError ? "error" : "loading"}
            onRetry={() => void queries.table.refetch()}
          />
        );
      }

      return (
        <>
          {queries.table.isError ? (
            <TabRefreshNotice onRetry={() => void queries.table.refetch()} />
          ) : null}
          <LazyTableTab
            companyPicks={queries.table.data.companyPicks}
            scopeMode={scopeMode}
            standings={queries.table.data.standings}
            tableMode={tableMode}
          />
        </>
      );
    }

    if (!queries.news.data) {
      return (
        <TabLoadState
          label="News"
          state={queries.news.isError ? "error" : "loading"}
          onRetry={() => void queries.news.refetch()}
        />
      );
    }

    return (
      <>
        {queries.news.isError || queries.teams.isError ? (
          <TabRefreshNotice
            onRetry={() => {
              void queries.news.refetch();
              void queries.teams.refetch();
            }}
          />
        ) : null}
        <LazyNewsTab news={queries.news.data} selectedTeam={selectedTeam} />
      </>
    );
  };

  const renderTabToolbar = (tab: HomeTab) => {
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
          <div
            aria-label="Table detail mode"
            className="table-toggle-group"
            role="tablist"
          >
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
              onChange={(event) =>
                setScopeMode(event.target.value as (typeof scopeModes)[number])
              }
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

  const renderTabPanel = (tab: HomeTab) => (
    <section
      className={[
        "tab-panel",
        tab === "Knockout" ? "tab-panel-knockout" : "",
        tab === "Fixtures" ? "tab-panel-fixtures" : "",
        tab === "Table" ? "tab-panel-table" : "",
        tab === "News" ? "tab-panel-news" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {renderTabContent(tab)}
    </section>
  );

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
                    {selectedTeam?.flag ? (
                      <span aria-hidden="true">{selectedTeam.flag}</span>
                    ) : null}
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

          <nav aria-label="Home tabs" className="tabs" ref={tabsRef}>
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
                onClick={() => requestTabNavigation(index)}
                onFocus={() => prefetchTab(tab)}
                onPointerDown={() => prefetchTab(tab)}
              >
                {tab}
              </button>
            ))}
            <span
              aria-hidden="true"
              className="tab-indicator"
              style={tabIndicatorStyle}
            />
          </nav>
        </section>

        <TabCarousel
          activeIndex={activeIndex}
          navigationRequest={tabNavigationRequest}
          onActiveIndexChange={setActiveIndex}
          onMotionStateChange={setTabMotion}
          reducedMotion={prefersReducedMotion}
          renderTab={(tab) => (
            <>
              {renderTabToolbar(tab)}
              <TabErrorBoundary label={tab} resetKey={tab}>
                <Suspense fallback={<TabLoadState label={tab} state="loading" />}>
                  {renderTabPanel(tab)}
                </Suspense>
              </TabErrorBoundary>
            </>
          )}
          tabs={tabs}
        />
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
