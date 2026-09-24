export function Loading({ label = 'Loading…' }) {
  return <div className="empty">{label}</div>;
}
export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <p className="err-text" style={{ margin: '0 0 10px' }}>{message}</p>
      {onRetry && <button className="btn sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}
