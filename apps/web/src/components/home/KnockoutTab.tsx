import type { KnockoutRound } from "../../lib/types";

export function KnockoutTab({ rounds }: { rounds: KnockoutRound[] }) {
  return (
    <div className="grid-two">
      <section className="bracket-column">
        {rounds.map((round) => (
          <div key={round.round} className="bracket-round">
            <h4>{round.round}</h4>
            {round.matches.map((match) => (
              <div key={match.id} className="bracket-match">
                <div className="team-line">
                  <span>{match.homeTeam}</span>
                  <strong>{match.homeScore}</strong>
                </div>
                <div className="team-line">
                  <span>{match.awayTeam}</span>
                  <strong>{match.awayScore}</strong>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
      <section className="bracket-column">
        <div className="match-card">
          <h3 className="panel-title">Knockout Detail</h3>
          <p className="selection-subtitle" style={{ marginTop: 0 }}>
            Follow the bracket overview first, then use the supporting cards to inspect key matchups
            and storyline moments for the draw.
          </p>
        </div>
      </section>
    </div>
  );
}
