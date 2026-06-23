import { useMemo, useState } from "react";
import type { CompanyPick, Fixture } from "../../lib/types";
import { FixtureFilters, type FixtureFilter } from "./FixtureFilters";

export type { FixtureFilter } from "./FixtureFilters";
export { FixtureFilters } from "./FixtureFilters";

type FixturesTabProps = {
  activeFilter?: FixtureFilter;
  companyPicks: CompanyPick[];
  fixtures: Fixture[];
  participantTeamCode: string;
  selectedGroup?: string;
  showFilters?: boolean;
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

const twoMatchSlots = ["01:30", "08:30"];
const standardKickoffSlots = ["01:30", "04:30", "07:30", "08:30", "22:30"];

function getFixtureDate(value: string) {
  if (!value.includes("T")) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.split("T")[0] ?? value;
  }

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
  if (!value.includes("T")) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

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

const liveStatuses = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"]);

function getFixtureCenter(fixture: Fixture, kickoffTime: string) {
  const hasScore = fixture.homeScore != null && fixture.awayScore != null;

  if (!hasScore) {
    return { primary: kickoffTime, secondary: "" };
  }

  const status = fixture.statusShort ?? "";
  const secondary =
    liveStatuses.has(status) && fixture.statusElapsed != null
      ? `${fixture.statusElapsed}'`
      : status;

  return {
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
  const center = getFixtureCenter(fixture, kickoffTime);
  const dateTime = fixture.kickoff.includes("T")
    ? fixture.kickoff
    : `${getFixtureDate(fixture.kickoff)}T${kickoffTime}`;

  return (
    <div
      aria-label={`${fixture.homeTeamName} vs ${fixture.awayTeamName}: ${center.primary}${
        center.secondary ? `, ${center.secondary}` : ""
      }`}
      className="fixture-match-row"
    >
      <FixtureTeam
        code={fixture.homeTeam}
        flag={fixture.homeFlag}
        name={fixture.homeTeamName}
        ownerName={displayNamesByTeam.get(fixture.homeTeam)}
        side="home"
      />
      <time className="fixture-kickoff-time" dateTime={dateTime}>
        <span>{center.primary}</span>
        {center.secondary ? (
          <small className={liveStatuses.has(fixture.statusShort ?? "") ? "is-live" : ""}>
            {center.secondary}
          </small>
        ) : null}
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
