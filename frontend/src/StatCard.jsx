import React from 'react';

// Figure with a label. A button when onClick is given (opens the matching list), otherwise a plain summary tile.
export default function StatCard({label, value, note, tone, onClick}) {
  const body = <><small>{label}</small><strong>{value}</strong>{note && <span>{note}</span>}</>;
  return onClick ? <button type="button" className={'ds-stat' + (tone ? ' ds-stat-' + tone : '')} onClick={onClick}>{body}</button>
    : <div className={'ds-stat' + (tone ? ' ds-stat-' + tone : '')}>{body}</div>;
}
