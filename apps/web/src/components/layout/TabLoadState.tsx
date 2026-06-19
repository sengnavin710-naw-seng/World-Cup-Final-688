type TabRefreshNoticeProps = {
  onRetry: () => void;
};

type TabLoadStateProps = {
  label: string;
  onRetry?: () => void;
  state: "error" | "loading";
};

export function TabRefreshNotice({ onRetry }: TabRefreshNoticeProps) {
  return (
    <div className="tab-refresh-notice" role="status">
      <span>Showing saved data. Refresh failed.</span>
      <button type="button" onClick={onRetry}>
        Refresh again
      </button>
    </div>
  );
}

export function TabLoadState({ label, onRetry, state }: TabLoadStateProps) {
  if (state === "loading") {
    return (
      <div
        aria-label={`Loading ${label}`}
        className="tab-local-skeleton"
        role="status"
      >
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="tab-local-error" role="alert">
      <strong>{`Unable to load ${label}.`}</strong>
      <button type="button" className="primary-button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
