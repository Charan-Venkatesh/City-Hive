import React from 'react';

const num = v => Number(v || 0);

function Card({label, value, note, onClick, tone}) {
  return <button type="button" className={'kpi-card' + (tone ? ' ' + tone : '')} onClick={onClick}>
    <small>{label}</small><strong>{value}</strong><span>{note}</span></button>;
}

function Preview({title, empty, rows, onAll, render}) {
  return <section className="card preview"><div className="card-heading"><h2>{title}</h2><button type="button" className="text-btn" onClick={onAll}>View all</button></div>
    {rows.length ? <ul className="preview-list">{rows.slice(0, 5).map(render)}</ul> : <p className="muted">{empty}</p>}</section>;
}

// Owner / branch-admin landing page: one branch selector, clickable KPIs, five-row previews. Detail lives on the pages.
export default function AdminOverview({data, dash, branches, branch, setBranch, go, money, dateLabel}) {
  const id = branch ? Number(branch) : null;
  const inBranch = row => !id || row.branch_id === id;
  const d = dash || {};
  const invoices = data.invoices.filter(inBranch).filter(i => num(i.balance) > 0).sort((a, b) => String(a.due_on).localeCompare(String(b.due_on)));
  const admissions = data.admissions.filter(inBranch).filter(a => ['pending', 'needs_info'].includes(a.status));
  const complaints = data.complaints.filter(c => c.status !== 'resolved' && (!id || c.branch_id === undefined || c.branch_id === id));
  const vacant = data.rooms.filter(r => r.active && inBranch(r) && r.available > 0).sort((a, b) => b.available - a.available || a.number.localeCompare(b.number));
  const b = branch ? {branch} : {};
  const noBranches = !branches.length;
  return <>
    <div className="dash-toolbar"><label className="field compact">Branch
      <select value={branch} onChange={e => setBranch(e.target.value)}><option value="">All branches</option>{branches.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <p className="muted">Everything on this page follows the selected branch. Click a card to open the matching list.</p></div>
    {noBranches && <div className="info-strip">No branch yet. Open Branches to add your first location.</div>}
    <div className="kpi-grid">
      <Card label="Residents" value={d.residents ?? 0} note="Open the resident list" onClick={() => go('Residents', {res: {...b, status: 'active'}})}/>
      <Card label="Occupancy" value={`${d.occupied ?? 0} / ${d.beds ?? 0}`} note={`${d.occupancy_percent ?? 0}% filled · ${Math.max((d.beds ?? 0) - (d.occupied ?? 0), 0)} vacant`} onClick={() => go('Rooms', {room: {...b, occupancy: 'available'}})}/>
      <Card label="Overdue invoices" value={d.overdue_invoice_count ?? 0} note={`${money(d.outstanding)} outstanding in total`} tone={num(d.overdue_invoice_count) ? 'warn' : ''} onClick={() => go('Fees & payments', {invoiceStatus: 'overdue', tab: 'invoices'})}/>
      <Card label="Collected this month" value={money(d.collected)} note="Paid on this month's invoices" onClick={() => go('Fees & payments', {tab: 'payments'})}/>
      <Card label="Admissions waiting" value={d.pending_admissions ?? 0} note="Pending or needs information" onClick={() => go('Admissions', {adm: {...b, status: 'open'}})}/>
      <Card label="Open complaints" value={d.open_complaints ?? 0} note="Open or in progress" tone={num(d.open_complaints) ? 'warn' : ''} onClick={() => go('Complaints', {comp: {...b, status: 'open'}})}/>
      <Card label="Stay requests" value={num(d.pending_extensions) + num(d.upcoming_moveouts)} note={`${d.pending_extensions ?? 0} extensions · ${d.upcoming_moveouts ?? 0} move-outs in 30 days`} onClick={() => go('Stay requests')}/>
      <Card label="Failed reminders" value={d.reminder_failures ?? 0} note="Open message activity" tone={num(d.reminder_failures) ? 'warn' : ''} onClick={() => go('Message activity', {msg: {status: 'failed'}})}/>
    </div>
    <div className="preview-grid">
      <Preview title="Fees to follow up" empty="No unpaid invoices." rows={invoices} onAll={() => go('Fees & payments', {invoiceStatus: 'overdue', tab: 'invoices'})}
        render={i => <li key={i.id}><strong>{i.resident_name}</strong><span>{i.room_number || '—'} · due {dateLabel(i.due_on)}</span><em>{money(i.balance)}</em></li>}/>
      <Preview title="Admissions waiting" empty="No admissions are waiting for a decision." rows={admissions} onAll={() => go('Admissions', {adm: {...b, status: 'open'}})}
        render={a => <li key={a.id}><strong>{a.name}</strong><span>{a.preferred_sharing}-person · move-in {dateLabel(a.move_in_date)}</span><em>{a.status.replace('_', ' ')}</em></li>}/>
      <Preview title="Open complaints" empty="No open complaints." rows={complaints} onAll={() => go('Complaints', {comp: {...b, status: 'open'}})}
        render={c => <li key={c.id}><strong>{c.title}</strong><span>{c.resident_name} · {c.category}</span><em>{c.status.replace('_', ' ')}</em></li>}/>
      <Preview title="Rooms with vacancies" empty="No vacant beds." rows={vacant} onAll={() => go('Rooms', {room: {...b, occupancy: 'available'}})}
        render={r => <li key={r.id}><strong>{r.number}</strong><span>{r.ac ? 'AC' : 'Non-AC'} · {r.capacity}-person</span><em>{r.available} vacant</em></li>}/>
    </div>
  </>;
}
