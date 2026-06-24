import type { NotificationItem } from "../../hooks/useNotifications";

type NotificationPanelProps = {
  notifications: NotificationItem[];
};

function getRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationPanel({ notifications }: NotificationPanelProps) {
  if (notifications.length === 0) {
    return (
      <div className="notification-panel">
        <strong>Notifications</strong>
        <div className="notification-empty">
          <span className="notification-empty-icon" aria-hidden="true">
            🔔
          </span>
          <p>No notifications yet</p>
          <p className="notification-empty-hint">
            Score updates will appear here during live matches
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-panel">
      <strong>Notifications</strong>
      <ul className="notification-list">
        {notifications.map((item) => (
          <li
            className={`notification-item ${item.type === "var_cancel" ? "notification-var" : "notification-goal"}`}
            key={item.id}
          >
            <div className="notification-item-header">
              <span className="notification-item-type">
                {item.type === "var_cancel" ? "🚫 VAR — Goal Cancelled" : "⚽ GOAL!"}
              </span>
              <span className="notification-item-time">{getRelativeTime(item.timestamp)}</span>
            </div>
            <div className="notification-item-score">
              <span className="notification-team">
                {item.homeFlag} {item.homeTeam}
              </span>
              <span className="notification-score-value">
                {item.homeScore} - {item.awayScore}
              </span>
              <span className="notification-team">
                {item.awayTeam} {item.awayFlag}
              </span>
            </div>
            <div className="notification-item-detail">
              {item.minute}&apos; • {item.round}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
