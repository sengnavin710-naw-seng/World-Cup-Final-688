import { useState } from "react";
import type { Team } from "../../lib/types";

type TeamGridProps = {
  teams: Team[];
  selectedTeamCode: string | null;
  currentTeamCode?: string;
  onSelect: (code: string) => void;
};

function TeamLogo({ code, flag, name }: { code: string; flag: string; name: string }) {
  const [hasImageError, setHasImageError] = useState(false);
  const logoPath = `/team-logos/${code.toLowerCase()}.png`;

  return (
    <div className="team-avatar" aria-hidden="true">
      {!hasImageError ? (
        <img
          alt=""
          className="team-logo-image"
          src={logoPath}
          onError={() => setHasImageError(true)}
        />
      ) : null}
      {hasImageError ? (
        <span className="team-flag" title={name}>
          {flag}
        </span>
      ) : null}
    </div>
  );
}

export function TeamGrid({ teams, selectedTeamCode, currentTeamCode, onSelect }: TeamGridProps) {
  return (
    <div className="selection-grid">
      {teams.map((team) => {
        const isLockedByOther = team.isOwned && team.code !== currentTeamCode;
        const selected = selectedTeamCode === team.code;

        return (
          <button
            key={team.code}
            className={`team-card${selected ? " selected" : ""}`}
            disabled={isLockedByOther}
            type="button"
            onClick={() => onSelect(team.code)}
          >
            <TeamLogo code={team.code} flag={team.flag} name={team.name} />
            {isLockedByOther ? <span className="team-badge">Selected</span> : null}
            {selected ? <span className="team-check">Selected</span> : null}
            <div className="team-name">{team.name}</div>
          </button>
        );
      })}
    </div>
  );
}
