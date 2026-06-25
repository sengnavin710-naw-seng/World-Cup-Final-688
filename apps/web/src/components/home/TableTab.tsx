import { useMemo, useState } from "react";
import type { CompanyPick, GroupStanding } from "../../lib/types";

type TableTabProps = {
  tableMode: "Short" | "Full";
  scopeMode: "Overall" | "Home" | "Away";
  companyPicks: CompanyPick[];
  standings: GroupStanding[];
};

function TeamLogo({ code, flag, name }: { code: string; flag: string; name: string }) {
  const [hasImageError, setHasImageError] = useState(false);
  const logoPath = `/team-logos/${code.toLowerCase()}.png`;

  return (
    <span className="table-team-logo" aria-hidden="true">
      {!hasImageError ? (
        <img
          alt=""
          className="team-logo-image"
          src={logoPath}
          onError={() => setHasImageError(true)}
        />
      ) : null}
      {hasImageError ? <span className="table-team-flag">{flag}</span> : null}
    </span>
  );
}

export function TableTab({ companyPicks, scopeMode, standings, tableMode }: TableTabProps) {
  const sortedStandings = useMemo(
    () => [...standings].sort((left, right) => left.group.localeCompare(right.group)),
    [standings],
  );
  const displayNamesByTeam = useMemo(
    () => new Map(companyPicks.map((pick) => [pick.teamCode, pick.displayName])),
    [companyPicks],
  );

  const scopeKey = scopeMode.toLowerCase() as "overall" | "home" | "away";

  return (
    <div className="table-tab-layout">
      <div className={`group-cards-grid${tableMode === "Full" ? " table-mode-full" : ""}`}>
        {sortedStandings.map((group) => (
          <article key={group.group} className="group-card">
            <div
              aria-label={tableMode === "Full" ? `Full standings for Group ${group.group}` : undefined}
              className={`group-table-scroll${tableMode === "Full" ? " table-mode-full" : ""}`}
              data-tab-swipe-ignore={tableMode === "Full" ? "true" : undefined}
              tabIndex={tableMode === "Full" ? 0 : undefined}
            >
              <div className={`group-table-content${tableMode === "Full" ? " table-mode-full" : ""}`}>
                <div className="group-card-head">
                  <strong>{`Grp. ${group.group}`}</strong>
                </div>

                <table className={`data-table compact-table${tableMode === "Full" ? " table-mode-full" : ""}`}>
                  <thead>
                    <tr>
                      <th className="team-cell team-head" />
                      <th>Pl</th>
                      {tableMode === "Full" ? (
                        <>
                          <th>W</th>
                          <th>D</th>
                          <th>L</th>
                          <th>+/-</th>
                        </>
                      ) : null}
                      <th>GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, index) => {
                      const stats = row.stats[scopeKey];
                      const ownerName = displayNamesByTeam.get(row.teamCode);

                      return (
                        <tr key={`${group.group}-${row.teamCode}`}>
                          <td className="team-cell">
                            <span className="team-rank">{index + 1}</span>
                            <TeamLogo code={row.teamCode} flag={row.flag} name={row.team} />
                            <span className="table-team-copy">
                              <span className="table-team-name">
                                {ownerName ? `${row.team} (${ownerName})` : row.team}
                              </span>
                            </span>
                          </td>
                          <td>{stats.played}</td>
                          {tableMode === "Full" ? (
                            <>
                              <td>{stats.wins}</td>
                              <td>{stats.draws}</td>
                              <td>{stats.losses}</td>
                              <td>{stats.goalsFor}-{stats.goalsAgainst}</td>
                            </>
                          ) : null}
                          <td>{stats.goalDiff > 0 ? `+${stats.goalDiff}` : stats.goalDiff}</td>
                          <td>{stats.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
