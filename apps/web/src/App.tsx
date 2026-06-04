import { AppShell } from "./components/layout/AppShell";
import { TeamSelectionScreen } from "./components/selection/TeamSelectionScreen";
import { useParticipantSession } from "./hooks/useParticipantSession";

export default function App() {
  const session = useParticipantSession();

  if (session.status === "loading") {
    return (
      <div className="screen-state">
        <div className="screen-state-card">
          <span className="summary-label">Preparing</span>
          <strong>Loading World Cup Festival 688...</strong>
          <p className="state-copy">We are checking your saved device session and loading the latest tournament data.</p>
        </div>
      </div>
    );
  }

  if (session.mode === "selection") {
    return (
      <TeamSelectionScreen
        brandName={session.brandName}
        currentTeamCode={session.participant?.teamCode}
        initialMessage={session.sessionError}
        mode={session.participant ? "change" : "create"}
        onSelectionSaved={session.handleSelectionSaved}
      />
    );
  }

  if (!session.participant) {
    return (
      <div className="screen-state">
        <div className="screen-state-card">
          <span className="summary-label">Session</span>
          <strong>Unable to load your saved session.</strong>
          <p className="state-copy">Please try again. If the issue continues, we can still return you to team selection.</p>
          <div className="inline-actions">
            <button className="primary-button" type="button" onClick={session.retrySession}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      brandName={session.brandName}
      participant={session.participant}
      onChangeTeam={session.startTeamChange}
      onResetDevice={session.resetDevice}
    />
  );
}
