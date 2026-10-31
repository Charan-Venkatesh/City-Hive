import React from 'react';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import ListRow from './ListRow';
import StatusBadge from './StatusBadge';
import FormField from './FormField';
import {ErrorState} from './States';
import {dashboardMetrics} from './features';

const longDate = () => new Date().toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function Preview({title, count, empty, rows, onAll, render}) {
  return <section className="ds-panel ds-preview" aria-label={title}>
    <div className="ds-toolbar"><h2>{title}{count > 0 && <span className="ds-count-note"> · {count}</span>}</h2><button type="button" className="btn btn-tertiary btn-sm" onClick={onAll}>View all</button></div>
    {rows.length ? <div className="ds-rows-inline">{rows.slice(0, 5).map(render)}</div> : <p className="ds-note ds-preview-empty">{empty}</p>}
  </section>;
}

// Staff landing page: what is happening and what needs a decision today. Figures come from dashboardMetrics (same rows as the lists they open).
export default function AdminOverview({data, dash, branches, branch, setBranch, go, money, dateLabel, today, loading, loadError, onRetry, onAddResident, onReminders, busy}) {
  const header = <PageHeader title="Overview" subtitle={`${branches.find(x => String(x.id) === String(branch))?.name || 'All branches'} · ${longDate()}`}
    action={<button type="button" className="btn btn-primary" onClick={onAddResident}>+ Add resident</button>}/>;
  if (loadError) return <div className="ds-page">{header}<ErrorState title="The overview could not be loaded" detail={loadError} onRetry={onRetry}/></div>;
  if (loading) return <div className="ds-page" aria-busy="true">{header}<p className="ds-sr" role="status">Loading overview…</p>
    <div className="ds-stats ds-stats-4">{Array.from({length: 4}, (_, i) => <div key={i} className="ds-stat ds-skel" aria-hidden="true"/>)}</div>
    <div className="ds-stats ds-stats-2">{Array.from({length: 2}, (_, i) => <div key={i} className="ds-stat ds-skel ds-skel-tall" aria-hidden="true"/>)}</div></div>;

  const m = dashboardMetrics(data, {branchId: branch ? Number(branch) : null, today}), b = branch ? {branch} : {}, failed = Number(dash?.reminder_failures || 0);
  const rows = [
    m.overdueCount > 0 && {key: 'overdue', count: m.overdueCount, title: `${plural(m.overdueCount, 'overdue invoice')} · ${money(m.overdueAmount)}`, detail: 'Residents who are past their due date.',
      open: () => go('Fees & payments', {invoiceStatus: 'overdue', tab: 'invoices'}), extra: onReminders && <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onReminders}>Send reminders</button>},
    m.admissionsWaiting > 0 && {key: 'adm', count: m.admissionsWaiting, title: `${plural(m.admissionsWaiting, 'admission')} awaiting a decision`, detail: 'Approve or reject so the room can be filled.', open: () => go('Admissions', {adm: {...b, status: 'open'}})},
    m.complaintsOpen > 0 && {key: 'comp', count: m.complaintsOpen, title: `${plural(m.complaintsOpen, 'open complaint')}`, detail: m.oldestComplaintDays > 0 ? `Oldest is ${plural(m.oldestComplaintDays, 'day')} old.` : 'Raised today.', open: () => go('Complaints', {comp: {...b, status: 'open'}})},
    m.waiting > 0 && {key: 'wait', count: m.waiting, title: `${plural(m.waiting, 'resident')} waiting for a room`, detail: 'Registered but not yet allocated, so not billed.', open: () => go('Residents', {res: {...b, status: 'active', allocation: 'unallocated'}})},
    m.stayPending > 0 && {key: 'stay', count: m.stayPending, title: `${plural(m.stayPending, 'stay request')} to review`, detail: 'Extensions, room changes and vacating.', open: () => go('Stay requests')},
    m.moveOuts > 0 && {key: 'out', count: m.moveOuts, title: `${plural(m.moveOuts, 'move-out')} in the next 30 days`, detail: 'Plan the vacancies and final settlements.', open: () => go('Stay requests')},
    failed > 0 && {key: 'fail', count: failed, title: `${plural(failed, 'reminder')} failed to send`, detail: 'Check the email or WhatsApp settings.', open: () => go('Message activity', {msg: {status: 'failed'}})}].filter(Boolean);
  const activityText = e => e.kind === 'payment' ? `Payment ${money(e.amount)} from ${e.who}` : e.kind === 'admission' ? `Admission request from ${e.who}` : `Complaint: ${e.title}`;
  const activityGo = e => e.kind === 'payment' ? go('Fees & payments', {tab: 'payments'}) : e.kind === 'admission' ? go('Admissions', {adm: {...b}}) : go('Complaints', {comp: {...b}});

  return <div className="ds-page">
    {header}
    <div className="ds-dash-toolbar"><FormField label="Branch"><select value={branch} onChange={e => setBranch(e.target.value)}><option value="">All branches</option>{branches.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></FormField>
      <p className="ds-note">Every figure follows this branch. Select one to open the matching list.</p></div>
    {!branches.length && <div className="price-panel idle">No branch yet. Open Branches to add your first location.</div>}

    <div className="ds-stats ds-stats-4" aria-label="Key figures">
      <StatCard tone="primary" label="Residents staying" value={m.staying} note={m.waiting > 0 ? `${m.waiting} waiting for a room` : 'Everyone has a room'} onClick={() => go('Residents', {res: {...b, status: 'active', allocation: 'allocated'}})}/>
      <StatCard tone="primary" label="Occupancy" value={`${m.occupied} / ${m.capacity}`} note={`${m.occupancyPercent}% filled · ${m.vacant} vacant (${m.vacantAc} AC, ${m.vacantNonAc} Non-AC)`} onClick={() => go('Rooms', {room: {...b, occupancy: 'available'}})}/>
      <StatCard tone={m.outstanding > 0 ? 'primary-warning' : 'primary'} label="Fees outstanding" value={money(m.outstanding)} note={m.outstanding > 0 ? `${plural(m.owingResidents, 'resident')} owe · ${money(m.overdueAmount)} overdue` : 'Nothing owed'} onClick={() => go('Fees & payments', {invoiceStatus: 'unpaid', tab: 'invoices'})}/>
      <StatCard tone="primary" label="Collected this month" value={money(m.collectedMonth)} note="Payments received this calendar month" onClick={() => go('Fees & payments', {tab: 'payments'})}/>
    </div>

    <div className="ds-split">
      <section className="ds-panel" aria-label="Needs attention today"><div className="ds-toolbar"><h2>Needs attention today</h2></div>
        {rows.length ? <ul className="ds-actionlist">{rows.map(r => <li key={r.key} className="ds-actionrow">
          <span className="ds-count" aria-hidden="true">{r.count}</span>
          <div className="ds-action-text"><strong>{r.title}</strong><small>{r.detail}</small></div>
          <div className="ds-action-buttons">{r.extra}<button type="button" className="btn btn-secondary btn-sm" onClick={r.open}>Open</button></div></li>)}</ul>
          : <p className="ds-note ds-preview-empty"><strong>All clear.</strong> Nothing needs your attention right now.</p>}
      </section>
      <section className="ds-panel ds-activity" aria-label="Recent activity"><div className="ds-toolbar"><h2>Recent activity</h2></div>
        {m.activity.length ? <div className="ds-rows-inline">{m.activity.map(e => <ListRow key={e.id} title={activityText(e)} meta={dateLabel(e.at)} actions={<button type="button" className="btn btn-tertiary btn-sm" onClick={() => activityGo(e)}>Open</button>}/>)}</div>
          : <p className="ds-note ds-preview-empty">Nothing has happened yet. Payments, admissions and complaints will appear here.</p>}
      </section>
    </div>

    <div className="ds-preview-grid ds-preview-3">
      <Preview title="Fees to follow up" count={m.owingResidents} empty="Nothing is owed. All fees are up to date." rows={m.feesDue} onAll={() => go('Fees & payments', {invoiceStatus: 'unpaid', tab: 'invoices'})}
        render={g => <ListRow key={g.resident_id} title={g.name} badge={g.overdueCount > 0 ? <StatusBadge value="overdue"/> : <StatusBadge value="due"/>} meta={`${g.room || 'No room'} · due since ${dateLabel(g.oldestDue)}`} value={money(g.balance)}/>}/>
      <Preview title="Admissions to approve" count={m.admissionsWaiting} empty="No admissions are waiting for a decision." rows={m.admissionsList} onAll={() => go('Admissions', {adm: {...b, status: 'open'}})}
        render={a => <ListRow key={a.id} title={a.name} badge={<StatusBadge value={a.status}/>} meta={`${a.preferred_sharing}-person · move-in ${dateLabel(a.move_in_date)}`}/>}/>
      <Preview title="Complaints to handle" count={m.complaintsOpen} empty="No open complaints." rows={m.complaintsList} onAll={() => go('Complaints', {comp: {...b, status: 'open'}})}
        render={c => <ListRow key={c.id} title={c.title} badge={<StatusBadge value={c.status}/>} meta={`${c.resident_name} · ${c.category} · ${dateLabel(c.created_at)}`}/>}/>
    </div>
  </div>;
}
