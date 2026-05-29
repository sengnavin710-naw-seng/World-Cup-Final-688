import { AppShell } from "./components/layout/AppShell";
import { TeamSelectionScreen } from "./components/selection/TeamSelectionScreen";
import { useParticipantSession } from "./hooks/useParticipantSession";

export default function App() {
  const session = useParticipantSession();

  if (session.status === "loading") {
    return <div className="screen-state">Loading World Cup Festival 688...</div>;
  }

  if (session.mode === "selection") {
    return (
      <TeamSelectionScreen
        brandName={session.brandName}
        currentTeamCode={session.participant?.teamCode}
        mode={session.participant ? "change" : "create"}
        onSelectionSaved={session.handleSelectionSaved}
      />
    );
  }

  if (!session.participant) {
    return <div className="screen-state">Unable to load participant session.</div>;
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
