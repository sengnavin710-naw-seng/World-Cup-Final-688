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

export function TableTab({ companyPicks: _companyPicks, scopeMode, standings, tableMode }: TableTabProps) {
  const sortedStandings = useMemo(
    () => [...standings].sort((left, right) => left.group.localeCompare(right.group)),
    [standings],
  );

  const scopeKey = scopeMode.toLowerCase() as "overall" | "home" | "away";

  return (
    <div className="table-tab-layout">
      <div className="group-cards-grid">
        {sortedStandings.map((group) => (
          <article key={group.group} className="group-card">
            <div className="group-card-head">
              <strong>{`Grp. ${group.group}`}</strong>
              <div className={`group-card-columns ${tableMode === "Full" ? "full" : ""}`} aria-hidden="true">
                <span>Pl</span>
                {tableMode === "Full" ? (
                  <>
                    <span>W</span>
                    <span>D</span>
                    <span>L</span>
                    <span>GF</span>
                    <span>GA</span>
                  </>
                ) : null}
                <span>GD</span>
                <span>Pts</span>
              </div>
            </div>

            <table className="data-table compact-table">
              <tbody>
                {group.rows.map((row, index) => {
                  const stats = row.stats[scopeKey];

                  return (
                    <tr key={`${group.group}-${row.teamCode}`}>
                      <td className="team-cell">
                        <span className="team-rank">{index + 1}</span>
                        <TeamLogo code={row.teamCode} flag={row.flag} name={row.team} />
                        <span>{row.team}</span>
                      </td>
                      <td>{stats.played}</td>
                      {tableMode === "Full" ? (
                        <>
                          <td>{stats.wins}</td>
                          <td>{stats.draws}</td>
                          <td>{stats.losses}</td>
                          <td>{stats.goalsFor}</td>
                          <td>{stats.goalsAgainst}</td>
                        </>
                      ) : null}
                      <td>{stats.goalDiff}</td>
                      <td>{stats.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </div>
  );
}
