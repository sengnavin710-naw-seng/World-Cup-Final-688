import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { CompanyPick, Fixture } from "../../lib/types";

type FixturesTabProps = {
  activeFilter?: FixtureFilter;
  companyPicks: CompanyPick[];
  fixtures: Fixture[];
  participantTeamCode: string;
  selectedGroup?: string;
  showFilters?: boolean;
};

export type FixtureFilter = (typeof filters)[number];

type FixtureFiltersProps = {
  activeFilter: FixtureFilter;
  onFilterChange: (filter: FixtureFilter) => void;
  onGroupChange: (group: string) => void;
  selectedGroup: string;
};

type FixtureDateGroup = {
  fixtures: Fixture[];
  key: string;
  label: string;
};

type FixtureSection = {
  dateGroups: FixtureDateGroup[];
  key: string;
  showDateLabels: boolean;
  title: string;
};

const filters = ["Date", "Round", "My Team", "Group"] as const;
const groupOptions = "ABCDEFGHIJKL".split("");
const twoMatchSlots = ["01:30", "08:30"];
const standardKickoffSlots = ["01:30", "04:30", "07:30", "08:30", "22:30"];

function getFixtureDate(value: string) {
  return value.split("T")[0] ?? value;
}

function getExplicitKickoffTime(value: string) {
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function formatFixtureDate(value: string, style: "full" | "short") {
  return new Intl.DateTimeFormat("en-US", {
    weekday: style === "full" ? "long" : "short",
    day: "numeric",
    month: style === "full" ? "long" : "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function sortFixtures(fixtures: Fixture[]) {
  return [...fixtures].sort((left, right) => {
    const dateSort = getFixtureDate(left.kickoff).localeCompare(getFixtureDate(right.kickoff));
    return dateSort || left.matchNumber - right.matchNumber;
  });
}

function groupFixturesByDate(fixtures: Fixture[], dateLabelStyle: "full" | "short") {
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

function getParticipantGroup(fixtures: Fixture[], participantTeamCode: string) {
  return (
    fixtures.find(
      (fixture) =>
        fixture.homeTeam === participantTeamCode || fixture.awayTeam === participantTeamCode,
    )?.group ??
    fixtures[0]?.group ??
    ""
  );
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

function makeSections(
  activeFilter: FixtureFilter,
  fixtures: Fixture[],
  participantTeamCode: string,
  selectedGroup: string,
): FixtureSection[] {
  if (activeFilter === "Date") {
    return groupFixturesByDate(fixtures, "full").map((dateGroup) => ({
      dateGroups: [dateGroup],
      key: dateGroup.key,
      showDateLabels: false,
      title: dateGroup.label,
    }));
  }

  if (activeFilter === "Round") {
    const byRound = new Map<string, Fixture[]>();
    sortFixtures(fixtures).forEach((fixture) => {
      const round = getGroupStageRound(fixture);
      byRound.set(round, [...(byRound.get(round) ?? []), fixture]);
    });

    return Array.from(byRound, ([title, groupedFixtures]) => ({
      dateGroups: groupFixturesByDate(groupedFixtures, "short"),
      key: title,
      showDateLabels: true,
      title,
    }));
  }

  if (activeFilter === "My Team") {
    const participantFixtures = fixtures.filter(
      (fixture) => fixture.homeTeam === participantTeamCode || fixture.awayTeam === participantTeamCode,
    );

    return [
      {
        dateGroups: groupFixturesByDate(participantFixtures, "short"),
        key: "my-team",
        showDateLabels: true,
        title: "My Team",
      },
    ];
  }

  const groupFixtures = fixtures.filter((fixture) => fixture.group === selectedGroup);

  return [
    {
      dateGroups: groupFixturesByDate(groupFixtures, "short"),
      key: `group-${selectedGroup}`,
      showDateLabels: true,
      title: `Group ${selectedGroup}`,
    },
  ];
}

function FixtureTeam({
  code,
  flag,
  name,
  ownerName,
  side,
}: {
  code: string;
  flag: string;
  name: string;
  ownerName?: string;
  side: "home" | "away";
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const teamMark = !hasImageError ? (
    <img
      alt={name}
      className="fixture-team-logo"
      src={`/team-logos/${code.toLowerCase()}.png`}
      onError={() => setHasImageError(true)}
    />
  ) : (
    <span className="fixture-team-flag" aria-hidden="true">
      {flag}
    </span>
  );
  const teamCopy = (
    <span className="fixture-team-copy">
      <span className="fixture-team-name">{name}</span>
      {ownerName ? <small className="team-owner-name">{ownerName}</small> : null}
    </span>
  );

  return (
    <div className={`fixture-match-team fixture-match-team-${side}`}>
      {side === "home" ? (
        <>
          {teamCopy}
          {teamMark}
        </>
      ) : (
        <>
          {teamMark}
          {teamCopy}
        </>
      )}
    </div>
  );
}

function FixtureMatchRow({
  displayNamesByTeam,
  fixture,
  kickoffTime,
}: {
  displayNamesByTeam: Map<string, string>;
  fixture: Fixture;
  kickoffTime: string;
}) {
  return (
    <div
      aria-label={`${fixture.homeTeamName} vs ${fixture.awayTeamName} at ${kickoffTime}`}
      className="fixture-match-row"
    >
      <FixtureTeam
        code={fixture.homeTeam}
        flag={fixture.homeFlag}
        name={fixture.homeTeamName}
        ownerName={displayNamesByTeam.get(fixture.homeTeam)}
        side="home"
      />
      <time className="fixture-kickoff-time" dateTime={`${getFixtureDate(fixture.kickoff)}T${kickoffTime}`}>
        {kickoffTime}
      </time>
      <FixtureTeam
        code={fixture.awayTeam}
        flag={fixture.awayFlag}
        name={fixture.awayTeamName}
        ownerName={displayNamesByTeam.get(fixture.awayTeam)}
        side="away"
      />
    </div>
  );
}

export function FixtureFilters({
  activeFilter,
  onFilterChange,
  onGroupChange,
  selectedGroup,
}: FixtureFiltersProps) {
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  function handleFilterClick(filter: FixtureFilter) {
    if (filter === "Group") {
      onFilterChange("Group");
      setGroupMenuOpen((isOpen) => (activeFilter === "Group" ? !isOpen : true));
      return;
    }

    onFilterChange(filter);
    setGroupMenuOpen(false);
  }

  return (
    <div className="fixture-filter-area">
      <div
        className="filter-row fixture-filter-row fixture-filter-row-fill"
        aria-label="Fixture filters"
      >
        {filters.map((filter) => (
          <button
            key={filter}
            aria-controls={filter === "Group" ? "fixture-group-options" : undefined}
            aria-expanded={filter === "Group" ? groupMenuOpen : undefined}
            aria-haspopup={filter === "Group" ? "listbox" : undefined}
            aria-pressed={activeFilter === filter}
            className={[
              "filter-chip",
              "fixture-filter-chip",
              filter === "Group" ? "fixture-filter-chip-group" : "",
              activeFilter === filter ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            onClick={() => handleFilterClick(filter)}
          >
            {filter}
            {filter === "Group" ? (
              <ChevronDown
                aria-hidden="true"
                className={groupMenuOpen ? "fixture-group-chevron open" : "fixture-group-chevron"}
                size={16}
                strokeWidth={2.2}
              />
            ) : null}
          </button>
        ))}
      </div>

      {groupMenuOpen ? (
        <div
          aria-label="Select group"
          className="fixture-group-menu"
          id="fixture-group-options"
          role="listbox"
        >
          {groupOptions.map((group) => (
            <button
              key={group}
              aria-selected={selectedGroup === group}
              className={`fixture-group-option${selectedGroup === group ? " selected" : ""}`}
              role="option"
              type="button"
              onClick={() => {
                onGroupChange(group);
                onFilterChange("Group");
                setGroupMenuOpen(false);
              }}
            >
              Group {group}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FixturesTab({
  activeFilter: controlledActiveFilter,
  companyPicks,
  fixtures,
  participantTeamCode,
  selectedGroup: controlledSelectedGroup,
  showFilters = true,
}: FixturesTabProps) {
  const [localActiveFilter, setLocalActiveFilter] = useState<FixtureFilter>("Date");
  const [localSelectedGroupOverride, setLocalSelectedGroupOverride] = useState("");
  const displayNamesByTeam = useMemo(
    () => new Map(companyPicks.map((pick) => [pick.teamCode, pick.displayName])),
    [companyPicks],
  );
  const fixtureTimes = useMemo(() => makeFixtureTimeMap(fixtures), [fixtures]);
  const participantGroup = useMemo(
    () => getParticipantGroup(fixtures, participantTeamCode),
    [fixtures, participantTeamCode],
  );
  const activeFilter = controlledActiveFilter ?? localActiveFilter;
  const selectedGroup =
    controlledSelectedGroup ?? (localSelectedGroupOverride || participantGroup || "A");
  const sections = useMemo(
    () => makeSections(activeFilter, fixtures, participantTeamCode, selectedGroup),
    [activeFilter, fixtures, participantTeamCode, selectedGroup],
  );

  return (
    <div className="fixture-tab">
      {showFilters ? (
        <FixtureFilters
          activeFilter={activeFilter}
          onFilterChange={setLocalActiveFilter}
          onGroupChange={setLocalSelectedGroupOverride}
          selectedGroup={selectedGroup}
        />
      ) : null}
      <div className="fixture-list">
        {sections.map((section) => (
          <article key={section.key} className="fixture-section-card">
            <h3>{section.title}</h3>

            {section.dateGroups.length ? (
              section.dateGroups.map((dateGroup) => (
                <div key={`${section.key}-${dateGroup.key}`} className="fixture-date-block">
                  {section.showDateLabels ? (
                    <p className="fixture-date-label">{dateGroup.label}</p>
                  ) : null}
                  <div className="fixture-match-list">
                    {dateGroup.fixtures.map((fixture) => (
                      <FixtureMatchRow
                        key={fixture.id}
                        displayNamesByTeam={displayNamesByTeam}
                        fixture={fixture}
                        kickoffTime={fixtureTimes.get(fixture.id) ?? "01:30"}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state-copy">No fixtures for this filter yet.</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
