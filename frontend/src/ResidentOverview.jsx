import React from 'react';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import ListRow from './ListRow';
import StatusBadge from './StatusBadge';

const ID_LABEL = {pending: 'Review pending', reviewed: 'Reviewed manually', rejected: 'Rejected'};

// Resident landing page on the same components as the staff overview. Same data and links as before.
export default function ResidentOverview({resident, dash, invoices, payments, complaints, money, dateLabel, go, onReceipt, loading}) {
  const unpaid = invoices.filter(i => Number(i.balance) > 0), open = complaints.filter(c => c.status !== 'resolved'), d = dash || {};
  const first = resident?.name ? resident.name.split(' ')[0] : '';
  if (loading) return <div className="ds-page" aria-busy="true"><PageHeader title="Overview" subtitle="Loading your stay…"/><div className="ds-stats ds-stats-4">{Array.from({length: 4}, (_, i) => <div key={i} className="ds-stat ds-skel" aria-hidden="true"/>)}</div></div>;
  return <div className="ds-page">
    <PageHeader title="Overview" subtitle={first ? `Welcome, ${first}. Your stay at a glance.` : 'Your stay at a glance.'}/>
    <div className="ds-stats ds-stats-4">
      <StatCard label="Your room" value={resident?.room_number || 'Unallocated'} note="Your current allocation" onClick={() => go('My profile')}/>
      <StatCard label="Monthly fee" value={money(resident?.monthly_fee)} note="After your management discount" onClick={() => go('Fees & payments')}/>
      <StatCard label="Outstanding fees" value={money(d.outstanding)} note="Across all your invoices" tone={Number(d.outstanding) > 0 ? 'warning' : undefined} onClick={() => go('Fees & payments')}/>
      <StatCard label="Open complaints" value={d.open_complaints || 0} note="Open or in progress" onClick={() => go('Complaints')}/>
    </div>
    <div className="ds-preview-grid">
      <section className="ds-panel ds-preview" aria-label="Your stay"><div className="ds-toolbar"><h2>Your stay</h2><button type="button" className="btn btn-tertiary btn-sm" onClick={() => go('My profile')}>View profile</button></div>
        <ListRow title={resident?.name || 'Your registration'} badge={<StatusBadge value={resident?.id_status || 'pending'} label={ID_LABEL[resident?.id_status || 'pending']}/>}
          meta={`Room ${resident?.room_number || 'awaiting allocation'}${resident?.joined_on ? ' · Joined ' + dateLabel(resident.joined_on) : ''}`}/>
        <p className="ds-note">Contact management for changes to your registration.</p></section>
      <section className="ds-panel ds-preview" aria-label="To follow up"><div className="ds-toolbar"><h2>To follow up</h2></div>
        <div className="ds-rows-inline">
          <ListRow title={`${unpaid.length} unpaid invoice${unpaid.length === 1 ? '' : 's'}`} meta={`${money(d.outstanding)} outstanding`} actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => go('Fees & payments')}>Open fees</button>}/>
          <ListRow title={`${open.length} active complaint${open.length === 1 ? '' : 's'}`} meta="Review and track progress" actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => go('Complaints')}>Open complaints</button>}/>
        </div></section>
    </div>
    <section className="ds-panel ds-preview" aria-label="Recent payments"><div className="ds-toolbar"><h2>Recent payments</h2><button type="button" className="btn btn-tertiary btn-sm" onClick={() => go('Fees & payments')}>View all</button></div>
      {payments.length ? <div className="ds-rows-inline">{payments.slice(0, 5).map(p => <ListRow key={p.id} title={'SW-' + String(p.id).padStart(6, '0')} badge={<StatusBadge value={p.reversed_at ? 'reversed' : 'recorded'}/>}
        meta={`${p.method.toUpperCase()} · ${dateLabel(p.paid_at)}`} value={money(p.amount)} actions={<button type="button" className="btn btn-tertiary btn-sm" onClick={() => onReceipt(p)}>Receipt</button>}/>)}</div>
        : <p className="ds-note ds-preview-empty">No payments yet. Receipts appear here once management records them.</p>}</section>
  </div>;
}
