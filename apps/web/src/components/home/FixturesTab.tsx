import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CompanyPick, Fixture } from "../../lib/types";
import {
  FixtureLiveClock,
  getFixtureStatusText,
  liveFixtureStatuses,
  tickingFixtureStatuses,
} from "./FixtureLiveClock";

type FixturesTabProps = {
  companyPicks: CompanyPick[];
  fixtures: Fixture[];
  participantTeamCode: string;
};

type Mode = "date" | "round" | "myteam" | "group";

type FixtureDateGroup = {
  fixtures: Fixture[];
  key: string;
  label: string;
};

const twoMatchSlots = ["01:30", "08:30"];
const standardKickoffSlots = ["01:30", "04:30", "07:30", "08:30", "22:30"];
const worldCupGroups = [..."ABCDEFGHIJKL"];

function getFixtureDate(value: string) {
  if (!value.includes("T")) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.split("T")[0] ?? value;
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getExplicitKickoffTime(value: string) {
  if (!value.includes("T")) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  }).format(date);
}

function formatFixtureDate(value: string, style: "full" | "short") {
  return new Intl.DateTimeFormat("en-US", {
    weekday: style === "full" ? "long" : "short",
    day: "numeric",
    month: style === "full" ? "long" : "short",
  }).format(new Date(`${value}T12:00:00`));
}

function getFixtureCenter(fixture: Fixture, kickoffTime: string) {
  const hasScore = fixture.homeScore != null && fixture.awayScore != null;
  if (!hasScore) return { accessibleSecondary: "", primary: kickoffTime, secondary: "" };
  const status = fixture.statusShort ?? "";
  const statusText = getFixtureStatusText(
    status,
    fixture.statusElapsed,
    fixture.statusExtra,
  );
  const hasPenaltyScore =
    status === "PEN" &&
    fixture.penaltyHomeScore != null &&
    fixture.penaltyAwayScore != null;
  const penaltyScore = hasPenaltyScore
    ? `${fixture.penaltyHomeScore}-${fixture.penaltyAwayScore}`
    : "";
  const accessibleSecondary = hasPenaltyScore
    ? `${statusText}, shootout ${fixture.penaltyHomeScore} - ${fixture.penaltyAwayScore}`
    : statusText;
  const secondary =
    ({ AET: "AET", PEN: penaltyScore ? `Pens ${penaltyScore}` : "Pens" } as Record<string, string>)[status] ??
    accessibleSecondary;
  return {
    accessibleSecondary,
    primary: `${fixture.homeScore} - ${fixture.awayScore}`,
    secondary,
  };
}

function sortFixtures(fixtures: Fixture[]) {
  return [...fixtures].sort((left, right) => {
    const dateSort = getFixtureDate(left.kickoff).localeCompare(getFixtureDate(right.kickoff));
    return dateSort || left.matchNumber - right.matchNumber;
  });
}

function groupFixturesByDate(fixtures: Fixture[], dateLabelStyle: "full" | "short"): FixtureDateGroup[] {
  const groups = new Map<string, Fixture[]>();
  sortFixtures(fixtures).forEach((fixture) => {
    const date = getFixtureDate(fixture.kickoff);
    groups.set(date, [...(groups.get(date) ?? []), fixture]);
  });
  return Array.from(groups, ([key, groupedFixtures]) => ({
    fixtures: groupedFixtures,
    key,
    label: formatFixtureDate(key, dateLabelStyle),
  }));
}

function getGroupStageRound(fixture: Fixture) {
  if (fixture.matchNumber <= 24) return "Round 1";
  if (fixture.matchNumber <= 48) return "Round 2";
  return "Round 3";
}

function makeFixtureTimeMap(fixtures: Fixture[]) {
  const byDate = groupFixturesByDate(fixtures, "short");
  const timeMap = new Map<string, string>();
  byDate.forEach((dateGroup) => {
    const slots = dateGroup.fixtures.length === 2 ? twoMatchSlots : standardKickoffSlots;
    dateGroup.fixtures.forEach((fixture, index) => {
      timeMap.set(
        fixture.id,
        getExplicitKickoffTime(fixture.kickoff) ?? slots[index % slots.length] ?? "01:30",
      );
    });
  });
  return timeMap;
}

function FixtureTeam({
  code, flag, name, ownerName, side,
}: {
  code: string; flag: string; name: string; ownerName?: string; side: "home" | "away";
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const teamMark = !hasImageError ? (
    <img alt={name} className="fixture-team-logo" src={`/team-logos/${code.toLowerCase()}.png`}
      onError={() => setHasImageError(true)} />
  ) : (
    <span className="fixture-team-flag" aria-hidden="true">{flag}</span>
  );
  const teamCopy = (
    <span className="fixture-team-copy">
      <span className="fixture-team-name">{name}</span>
      {ownerName ? <small className="team-owner-name">{ownerName}</small> : null}
    </span>
  );
  return (
    <div className={`fixture-match-team fixture-match-team-${side}`}>
      {side === "home" ? <>{teamCopy}{teamMark}</> : <>{teamMark}{teamCopy}</>}
    </div>
  );
}

function FixtureMatchRow({
  displayNamesByTeam, fixture, kickoffTime,
}: {
  displayNamesByTeam: Map<string, string>; fixture: Fixture; kickoffTime: string;
}) {
  const center = getFixtureCenter(fixture, kickoffTime);
  const dateTime = fixture.kickoff.includes("T")
    ? fixture.kickoff
    : `${getFixtureDate(fixture.kickoff)}T${kickoffTime}`;
  return (
    <div
      aria-label={`${fixture.homeTeamName} vs ${fixture.awayTeamName}: ${center.primary}${center.accessibleSecondary ? `, ${center.accessibleSecondary}` : ""}`}
      className="fixture-match-row"
    >
      <FixtureTeam code={fixture.homeTeam} flag={fixture.homeFlag} name={fixture.homeTeamName}
        ownerName={displayNamesByTeam.get(fixture.homeTeam)} side="home" />
      <time className="fixture-kickoff-time" dateTime={dateTime}>
        <span>{center.primary}</span>
        {center.secondary ? (
          <small
            className={liveFixtureStatuses.has(fixture.statusShort ?? "") ? "is-live" : ""}
            title={center.secondary !== center.accessibleSecondary ? center.accessibleSecondary : undefined}
          >
            {tickingFixtureStatuses.has(fixture.statusShort ?? "") && fixture.statusElapsed != null ? (
              <FixtureLiveClock
                elapsed={fixture.statusElapsed}
                extra={fixture.statusExtra}
                status={fixture.statusShort ?? ""}
              />
            ) : center.secondary}
          </small>
        ) : null}
      </time>
      <FixtureTeam code={fixture.awayTeam} flag={fixture.awayFlag} name={fixture.awayTeamName}
        ownerName={displayNamesByTeam.get(fixture.awayTeam)} side="away" />
    </div>
  );
}

// ── Shared arrow nav ──
function ArrowNav({ label, index, total, onPrev, onNext, children, prevDisabled, nextDisabled }: {
  label?: string; index: number; total: number;
  onPrev: () => void; onNext: () => void;
  children?: React.ReactNode;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="fixture-date-nav">
      <button aria-label="Previous" className="fixture-nav-arrow"
        disabled={prevDisabled ?? index <= 0}
        type="button" onClick={onPrev}>
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>
      {children ?? <span className="fixture-nav-date">{label}</span>}
      <button aria-label="Next" className="fixture-nav-arrow"
        disabled={nextDisabled ?? index >= total - 1}
        type="button" onClick={onNext}>
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Calendar popup ──
const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CalendarPopup({
  allDates, currentDate, onSelectDate, onClose, style,
}: {
  allDates: string[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
  style: React.CSSProperties;
}) {
  const fixtureDateSet = useMemo(() => new Set(allDates), [allDates]);
  const todayStr = getFixtureDate(new Date().toISOString());

  const initDate = currentDate || todayStr;
  const [viewYear, setViewYear] = useState(() => Number(initDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(initDate.slice(5, 7)) - 1);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date(viewYear, viewMonth, 1));

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<{ day: number; dateStr: string } | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, dateStr };
    }),
  ];

  return createPortal(
    <>
      <div className="fixture-filter-backdrop" aria-hidden="true" onClick={onClose} />
      <div className="fixture-calendar-popup" style={style} role="dialog" aria-label="Pick a date">
        <div className="cal-header">
          <button className="cal-nav-btn" type="button" onClick={prevMonth}>
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span className="cal-month-label">{monthLabel}</span>
          <button className="cal-nav-btn" type="button" onClick={nextMonth}>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="cal-grid">
          {DOW_LABELS.map((d) => (
            <span key={d} className="cal-dow">{d}</span>
          ))}
          {cells.map((cell, i) =>
            cell === null ? (
              <span key={`empty-${i}`} />
            ) : (
              <button
                key={cell.dateStr}
                className={[
                  "cal-day",
                  cell.dateStr === currentDate ? "selected" : "",
                  cell.dateStr === todayStr ? "today" : "",
                  !fixtureDateSet.has(cell.dateStr) ? "no-fixture" : "",
                ].filter(Boolean).join(" ")}
                type="button"
                onClick={() => {
                  onSelectDate(cell.dateStr);
                  onClose();
                }}
              >
                {cell.day}
              </button>
            )
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Main component ──
export function FixturesTab({ companyPicks, fixtures, participantTeamCode }: FixturesTabProps) {
  const allDates = useMemo(() => {
    const dateSet = new Set(sortFixtures(fixtures).map((f) => getFixtureDate(f.kickoff)));
    return Array.from(dateSet).sort();
  }, [fixtures]);

  const defaultDate = useMemo(() => {
    const todayStr = getFixtureDate(new Date().toISOString());
    const found = allDates.find((d) => d >= todayStr);
    return found ?? allDates[0] ?? todayStr;
  }, [allDates]);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [roundIndex, setRoundIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("date");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const calBtnRef = useRef<HTMLButtonElement>(null);

  const displayNamesByTeam = useMemo(
    () => new Map(companyPicks.map((pick) => [pick.teamCode, pick.displayName])),
    [companyPicks],
  );
  const fixtureTimes = useMemo(() => makeFixtureTimeMap(fixtures), [fixtures]);

  // Date label for any selected date
  const currentDateLabel = selectedDate
    ? formatFixtureDate(selectedDate, "full")
    : "No fixtures";

  // Prev/next fixture date relative to selectedDate
  const prevFixtureDate = useMemo(
    () => [...allDates].reverse().find((d) => d < selectedDate) ?? null,
    [allDates, selectedDate],
  );
  const nextFixtureDate = useMemo(
    () => allDates.find((d) => d > selectedDate) ?? null,
    [allDates, selectedDate],
  );

  const dateModeFixtures = useMemo(() => {
    if (!selectedDate) return [];
    return sortFixtures(fixtures.filter((f) => getFixtureDate(f.kickoff) === selectedDate));
  }, [fixtures, selectedDate]);

  const roundSections = useMemo(() => {
    const byRound = new Map<string, Fixture[]>();
    sortFixtures(fixtures).forEach((f) => {
      const round = getGroupStageRound(f);
      byRound.set(round, [...(byRound.get(round) ?? []), f]);
    });
    return Array.from(byRound, ([title, roundFixtures]) => ({
      dateGroups: groupFixturesByDate(roundFixtures, "short"),
      key: title,
      title,
    }));
  }, [fixtures]);

  const currentRound = roundSections[roundIndex];

  const myTeamDateGroups = useMemo(() => {
    const teamFixtures = fixtures.filter(
      (f) => f.homeTeam === participantTeamCode || f.awayTeam === participantTeamCode,
    );
    return groupFixturesByDate(teamFixtures, "short");
  }, [fixtures, participantTeamCode]);

  const defaultGroup = useMemo(() => {
    const participantFixture = fixtures.find(
      (fixture) => fixture.homeTeam === participantTeamCode
        || fixture.awayTeam === participantTeamCode,
    );
    return participantFixture?.group
      ?? [...new Set(fixtures.map((fixture) => fixture.group))].sort()[0]
      ?? worldCupGroups[0];
  }, [fixtures, participantTeamCode]);
  const [selectedFixtureGroup, setSelectedFixtureGroup] = useState(defaultGroup);
  useEffect(() => {
    setSelectedFixtureGroup(defaultGroup);
  }, [defaultGroup]);
  const selectedGroupIndex = worldCupGroups.indexOf(selectedFixtureGroup);
  const groupDateGroups = useMemo(
    () => groupFixturesByDate(
      fixtures.filter((fixture) => fixture.group === selectedFixtureGroup),
      "short",
    ),
    [fixtures, selectedFixtureGroup],
  );

  function selectMode(m: Mode) {
    setMode(m);
    setShowFilterPanel(false);
    setShowGroupPicker(false);
    if (m === "round") setRoundIndex(0);
  }

  function openGroupPicker() {
    setMode("group");
    setShowGroupPicker(true);
  }

  function selectGroup(group: string) {
    setSelectedFixtureGroup(group);
    setMode("group");
    setShowGroupPicker(false);
    setShowFilterPanel(false);
  }

  function toggleFilterPanel() {
    if (!showFilterPanel && filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowFilterPanel((v) => {
      if (v) setShowGroupPicker(false);
      return !v;
    });
  }

  function openCalendar() {
    if (calBtnRef.current) {
      const rect = calBtnRef.current.getBoundingClientRect();
      const popupWidth = 280;
      let left = rect.left + rect.width / 2 - popupWidth / 2;
      // Clamp to viewport
      left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));
      setCalendarPos({ top: rect.bottom + 8, left });
    }
    setShowCalendar(true);
  }

  function handleCalendarSelect(dateStr: string) {
    setSelectedDate(dateStr);
  }

  return (
    <div className="fixture-tab">

      {/* ── Navigation bar ── */}
      <div className="fixture-nav-bar">
        {mode === "date" ? (
          <ArrowNav
            index={0}
            total={0}
            prevDisabled={!prevFixtureDate}
            nextDisabled={!nextFixtureDate}
            onPrev={() => prevFixtureDate && setSelectedDate(prevFixtureDate)}
            onNext={() => nextFixtureDate && setSelectedDate(nextFixtureDate)}
          >
            <button
              ref={calBtnRef}
              className="fixture-date-label-btn"
              type="button"
              onClick={openCalendar}
            >
              <span className="fixture-nav-date">{currentDateLabel}</span>
              <Calendar size={14} strokeWidth={2.5} className="cal-icon" />
            </button>
          </ArrowNav>
        ) : mode === "round" ? (
          <ArrowNav
            label={currentRound?.title ?? "Round"}
            index={roundIndex}
            total={roundSections.length}
            onPrev={() => setRoundIndex((i) => Math.max(0, i - 1))}
            onNext={() => setRoundIndex((i) => Math.min(roundSections.length - 1, i + 1))}
          />
        ) : mode === "group" ? (
          <ArrowNav
            label={`Group ${selectedFixtureGroup}`}
            index={selectedGroupIndex}
            total={worldCupGroups.length}
            onPrev={() => selectGroup(worldCupGroups[Math.max(0, selectedGroupIndex - 1)] ?? "A")}
            onNext={() => selectGroup(worldCupGroups[Math.min(worldCupGroups.length - 1, selectedGroupIndex + 1)] ?? "L")}
          />
        ) : (
          <ArrowNav label="My Team" index={0} total={1}
            onPrev={() => undefined} onNext={() => undefined} />
        )}

        <button
          ref={filterBtnRef}
          aria-label="Filter options"
          aria-expanded={showFilterPanel}
          className={`fixture-filter-toggle${showFilterPanel ? " active" : ""}`}
          type="button"
          onClick={toggleFilterPanel}
        >
          <ChevronDown size={18} strokeWidth={2.5}
            style={{ transition: "transform 160ms ease", transform: showFilterPanel ? "rotate(180deg)" : "none" }} />
        </button>
      </div>

      {/* ── Calendar popup ── */}
      {showCalendar ? (
        <CalendarPopup
          allDates={allDates}
          currentDate={selectedDate}
          onSelectDate={handleCalendarSelect}
          onClose={() => setShowCalendar(false)}
          style={{ position: "fixed", top: calendarPos.top, left: calendarPos.left, width: 280 }}
        />
      ) : null}

      {/* ── Filter panel portal ── */}
      {showFilterPanel ? createPortal(
        <>
          <div className="fixture-filter-backdrop" aria-hidden="true" onClick={() => {
            setShowFilterPanel(false);
            setShowGroupPicker(false);
          }} />
          <div className="fixture-filter-panel" role={showGroupPicker ? undefined : "menu"}
            style={{
              position: "fixed",
              top: panelPos.top,
              right: panelPos.right,
              maxHeight: `calc(100dvh - ${panelPos.top + 12}px)`,
            }}>
            {showGroupPicker ? (
              <>
                <button
                  aria-label="Back to filter options"
                  className="fixture-group-back"
                  type="button"
                  onClick={() => setShowGroupPicker(false)}
                >
                  <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.5} />
                  Filters
                </button>
                <div className="fixture-group-list" role="listbox" aria-label="Select group">
                  {worldCupGroups.map((group) => (
                    <button
                      aria-selected={selectedFixtureGroup === group}
                      className={`fixture-filter-option${selectedFixtureGroup === group ? " active" : ""}`}
                      key={group}
                      role="option"
                      type="button"
                      onClick={() => selectGroup(group)}
                    >
                      Group {group}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button className={`fixture-filter-option${mode === "date" ? " active" : ""}`}
                  role="menuitem" type="button" onClick={() => selectMode("date")}>
                  By Date {mode === "date" ? <span className="fixture-filter-dot" /> : null}
                </button>
                <button className={`fixture-filter-option${mode === "round" ? " active" : ""}`}
                  role="menuitem" type="button" onClick={() => selectMode("round")}>
                  Round {mode === "round" ? <span className="fixture-filter-dot" /> : null}
                </button>
                <button className={`fixture-filter-option${mode === "myteam" ? " active" : ""}`}
                  role="menuitem" type="button" onClick={() => selectMode("myteam")}>
                  My Team {mode === "myteam" ? <span className="fixture-filter-dot" /> : null}
                </button>
                <button className={`fixture-filter-option${mode === "group" ? " active" : ""}`}
                  role="menuitem" type="button" onClick={openGroupPicker}>
                  Group <ChevronRight size={16} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      ) : null}

      {/* ── Content ── */}
      <div className="fixture-list">
        {mode === "date" ? (
          dateModeFixtures.length ? (
            <article className="fixture-section-card">
              <div className="fixture-match-list">
                {dateModeFixtures.map((fixture) => (
                  <FixtureMatchRow key={fixture.id} displayNamesByTeam={displayNamesByTeam}
                    fixture={fixture} kickoffTime={fixtureTimes.get(fixture.id) ?? "01:30"} />
                ))}
              </div>
            </article>
          ) : <p className="empty-state-copy">No fixtures for this date.</p>
        ) : mode === "round" ? (
          currentRound ? (
            <article className="fixture-section-card">
              {currentRound.dateGroups.map((dateGroup) => (
                <div key={dateGroup.key} className="fixture-date-block">
                  <p className="fixture-date-label">{dateGroup.label}</p>
                  <div className="fixture-match-list">
                    {dateGroup.fixtures.map((fixture) => (
                      <FixtureMatchRow key={fixture.id} displayNamesByTeam={displayNamesByTeam}
                        fixture={fixture} kickoffTime={fixtureTimes.get(fixture.id) ?? "01:30"} />
                    ))}
                  </div>
                </div>
              ))}
            </article>
          ) : <p className="empty-state-copy">No rounds available.</p>
        ) : mode === "group" ? (
          groupDateGroups.length ? (
            <article className="fixture-section-card">
              {groupDateGroups.map((dateGroup) => (
                <div key={dateGroup.key} className="fixture-date-block">
                  <p className="fixture-date-label">{dateGroup.label}</p>
                  <div className="fixture-match-list">
                    {dateGroup.fixtures.map((fixture) => (
                      <FixtureMatchRow key={fixture.id} displayNamesByTeam={displayNamesByTeam}
                        fixture={fixture} kickoffTime={fixtureTimes.get(fixture.id) ?? "01:30"} />
                    ))}
                  </div>
                </div>
              ))}
            </article>
          ) : <p className="empty-state-copy">No fixtures for this group yet.</p>
        ) : myTeamDateGroups.length ? (
          <article className="fixture-section-card">
            {myTeamDateGroups.map((dateGroup) => (
              <div key={dateGroup.key} className="fixture-date-block">
                <p className="fixture-date-label">{dateGroup.label}</p>
                <div className="fixture-match-list">
                  {dateGroup.fixtures.map((fixture) => (
                    <FixtureMatchRow key={fixture.id} displayNamesByTeam={displayNamesByTeam}
                      fixture={fixture} kickoffTime={fixtureTimes.get(fixture.id) ?? "01:30"} />
                  ))}
                </div>
              </div>
            ))}
          </article>
        ) : (
          <p className="empty-state-copy">No fixtures for your team yet.</p>
        )}
      </div>
    </div>
  );
}
