import { useMemo, useState } from "react";
import type { Fixture } from "../../lib/types";

type FixturesTabProps = {
  fixtures: Fixture[];
  participantTeamCode: string;
};

const filters = ["All", "My Team", "Round"] as const;

export function FixturesTab({ fixtures, participantTeamCode }: FixturesTabProps) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");

  const filteredFixtures = useMemo(() => {
    if (activeFilter === "My Team") {
      return fixtures.filter(
        (fixture) => fixture.homeTeam === participantTeamCode || fixture.awayTeam === participantTeamCode,
      );
    }

    if (activeFilter === "Round") {
      return fixtures.filter((fixture) => fixture.round === fixtures[0]?.round);
    }

    return fixtures;
  }, [activeFilter, fixtures, participantTeamCode]);

  return (
    <div>
      <div className="filter-row">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`filter-chip${activeFilter === filter ? " active" : ""}`}
            type="button"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="fixture-list">
        {filteredFixtures.map((fixture) => (
          <div key={fixture.id} className="fixture-card">
            <div className="summary-label">{fixture.round}</div>
            <div className="team-line">
              <span>
                {fixture.homeFlag} {fixture.homeTeam}
              </span>
              <span>vs</span>
              <span>
                {fixture.awayFlag} {fixture.awayTeam}
              </span>
            </div>
            <div className="team-group">{fixture.kickoff}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
