import React from 'react';

// Page title, one line of context and the single primary action for the page.
export default function PageHeader({title, subtitle, action}) {
  return <header className="ds-pagehead"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="ds-pagehead-action">{action}</div>}</header>;
}
