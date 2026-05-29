import type { Team } from "../../lib/types";

type SelectedTeamSummaryProps = {
  team: Team | null;
};

export function SelectedTeamSummary({ team }: SelectedTeamSummaryProps) {
  return (
    <section className="summary-panel">
      <div className="summary-team">
        <div className="summary-flag" aria-hidden="true">
          {team?.flag ?? "🏳️"}
        </div>
        <div>
          <div className="summary-label">Selected Team</div>
          <div className="summary-value">{team?.name ?? "Unknown Team"}</div>
        </div>
      </div>
    </section>
  );
}
