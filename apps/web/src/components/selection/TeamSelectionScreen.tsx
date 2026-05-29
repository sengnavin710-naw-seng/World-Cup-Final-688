import { useEffect, useMemo, useState } from "react";
import { changeSelection, createSelection, fetchTeams } from "../../lib/api";
import { getOrCreateDeviceId } from "../../lib/deviceIdentity";
import type { ParticipantSession, Team } from "../../lib/types";
import { BrandHeader } from "../ui/BrandHeader";
import { TeamGrid } from "./TeamGrid";

type TeamSelectionScreenProps = {
  brandName: string;
  mode: "create" | "change";
  currentTeamCode?: string;
  onSelectionSaved: (value: ParticipantSession) => void;
};

export function TeamSelectionScreen({
  brandName,
  currentTeamCode,
  mode,
  onSelectionSaved,
}: TeamSelectionScreenProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(currentTeamCode ?? null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchTeams()
      .then((data) => {
        setTeams(data.teams);
      })
      .catch(() => {
        setErrorMessage("Unable to load teams right now.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTeams = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return teams;
    return teams.filter((team) => {
      const haystack = `${team.name} ${team.thaiAlias ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [search, teams]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.code === selectedTeamCode) ?? null,
    [selectedTeamCode, teams],
  );

  const handleSubmit = async () => {
    if (!selectedTeamCode) return;

    setSubmitting(true);
    setErrorMessage("");
    const deviceId = getOrCreateDeviceId();

    const payload = {
      deviceId,
      displayName: `Participant ${deviceId.slice(0, 4).toUpperCase()}`,
      teamCode: selectedTeamCode,
    };

    try {
      const response =
        mode === "change" ? await changeSelection(payload) : await createSelection(payload);
      onSelectionSaved(response.participant);
    } catch (error) {
      const message =
        error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "SELECTION_CONFLICT"
          ? "This team has already been selected. Please choose another team."
          : "Unable to save your team selection right now.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="container selection-layout">
        <div className="selection-hero">
          <BrandHeader brandName={brandName} centered showMark={false} />
          <div className="search-wrap">
            <input
              aria-label="Search teams"
              className="search-input"
              placeholder="Search teams"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? <div className="selection-panel">Loading teams...</div> : null}
        {!loading ? (
          <TeamGrid
            currentTeamCode={currentTeamCode}
            onSelect={setSelectedTeamCode}
            selectedTeamCode={selectedTeamCode}
            teams={filteredTeams}
          />
        ) : null}
      </div>

      <div className={`selection-sticky-bar${selectedTeam ? " visible" : ""}`}>
        <div className="selection-sticky-content">
          <div className="selection-sticky-copy">
            <span className="summary-label">Selected Team</span>
            <strong>{selectedTeam?.name ?? "Choose a team"}</strong>
          </div>
          <div className="selection-actions">
            <button
              className="primary-button"
              disabled={!selectedTeamCode || submitting}
              type="button"
              onClick={handleSubmit}
            >
              {submitting ? "Saving..." : "Continue"}
            </button>
            {errorMessage ? <span className="error-text">{errorMessage}</span> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
