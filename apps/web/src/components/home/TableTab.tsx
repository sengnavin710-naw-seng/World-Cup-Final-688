import type { CompanyPick, GroupStanding } from "../../lib/types";

type TableTabProps = {
  companyPicks: CompanyPick[];
  standings: GroupStanding[];
};

export function TableTab({ companyPicks, standings }: TableTabProps) {
  return (
    <div className="standings-grid">
      <div className="table-card">
        <h4>Group Standings</h4>
        {standings.map((group) => (
          <div key={group.group} style={{ marginTop: "12px" }}>
            <strong>Group {group.group}</strong>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>P</th>
                  <th>Pts</th>
                  <th>GD</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={`${group.group}-${row.team}`}>
                    <td>{row.team}</td>
                    <td>{row.played}</td>
                    <td>{row.points}</td>
                    <td>{row.goalDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="table-card">
        <h4>Company Picks Table</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Participant</th>
            </tr>
          </thead>
          <tbody>
            {companyPicks.map((pick) => (
              <tr key={pick.teamCode}>
                <td>
                  {pick.flag} {pick.teamName}
                </td>
                <td>{pick.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
