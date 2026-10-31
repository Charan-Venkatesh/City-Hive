import React from 'react';

// One pattern each for loading, empty and error so every list explains itself the same way.
export function LoadingState({label = 'Loading…'}) { return <div className="ds-state" role="status" aria-live="polite"><span className="ds-spinner" aria-hidden="true"/>{label}</div>; }
export function EmptyState({title, hint, action}) {
  return <div className="ds-state ds-state-empty"><strong>{title}</strong>{hint && <p>{hint}</p>}{action}</div>;
}
export function ErrorState({title = 'Something went wrong', detail, onRetry}) {
  return <div className="ds-state ds-state-error" role="alert"><strong>{title}</strong>{detail && <p>{detail}</p>}{onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Try again</button>}</div>;
}
