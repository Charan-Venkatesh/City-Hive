import React from 'react';

// Two-line row used for phone lists and previews: identity and key value on line 1, details on line 2, actions at the end.
export default function ListRow({title, badge, meta, value, valueNote, actions}) {
  return <div className="ds-listrow">
    <div className="ds-lr-main"><div className="ds-lr-title"><strong>{title}</strong>{badge}</div>{meta && <div className="ds-lr-meta">{meta}</div>}</div>
    {(value !== undefined || valueNote) && <div className="ds-lr-value"><strong>{value}</strong>{valueNote && <small>{valueNote}</small>}</div>}
    {actions && <div className="ds-lr-actions">{actions}</div>}
  </div>;
}
