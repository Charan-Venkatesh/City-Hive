import React from 'react';
import ListRow from './ListRow';
import RowMenu from './RowMenu';

// Row actions: one clear primary action, the rest in a menu. A single harmless extra action stays visible; destructive actions always go in the menu.
function RowActions({actions, context}) {
  if (!actions) return null;
  const {primary, items = [], note} = actions, inline = items.length === 1 && !items[0].danger;
  return <div className="ds-actions">
    {primary ? <button type="button" className="btn btn-secondary btn-sm" disabled={primary.disabled} onClick={primary.onClick}>{primary.label}</button> : note}
    {inline && <button type="button" className="btn btn-tertiary btn-sm" onClick={items[0].onClick}>{items[0].label}</button>}
    {items.length > 0 && !inline && <RowMenu items={items} label={`More actions${context ? ' for ' + context : ''}`}/>}
  </div>;
}

// One column definition drives both views: a table from tablet up and compact rows on phones.
export default function DataTable({columns, rows, rowKey, label, mobile, actions, context}) {
  return <div className="ds-datatable">
    <div className="ds-table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table className="ds-table"><thead><tr>{columns.map(c => <th key={c.key} className={c.hideBelow ? 'ds-hide-' + c.hideBelow : ''} style={c.width ? {width: c.width} : undefined}>{c.header}</th>)}
        {actions && <th className="ds-actions-col"><span className="ds-sr">Actions</span></th>}</tr></thead>
        <tbody>{rows.map(r => <tr key={rowKey(r)}>{columns.map(c => <td key={c.key} className={(c.hideBelow ? 'ds-hide-' + c.hideBelow : '') + (c.align ? ' ds-' + c.align : '')}>{c.cell(r)}</td>)}
          {actions && <td className="ds-actions-col"><RowActions actions={actions(r)} context={context && context(r)}/></td>}</tr>)}</tbody></table>
    </div>
    <ul className="ds-rows" aria-label={`${label} (list)`}>{rows.map(r => <li key={rowKey(r)}><ListRow {...mobile(r)} actions={actions && <RowActions actions={actions(r)} context={context && context(r)}/>}/></li>)}</ul>
  </div>;
}
