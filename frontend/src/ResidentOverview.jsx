import React from 'react';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import ListRow from './ListRow';
import StatusBadge from './StatusBadge';

const ID_LABEL = {pending: 'Review pending', reviewed: 'Reviewed manually', rejected: 'Rejected'};

// Resident landing page on the same components as the staff overview. Same data and links as before.
export default function ResidentOverview({resident, dash, invoices, payments, complaints, money, dateLabel, go, onReceipt, onPayOnline, loading}) {
  const unpaid = invoices.filter(i => Number(i.balance) > 0), open = complaints.filter(c => c.status !== 'resolved'), d = dash || {};
  const first = resident?.name ? resident.name.split(' ')[0] : '';
  const totalUnpaid = unpaid.reduce((sum, i) => sum + Number(i.balance), 0);

  if (loading) return <div className="ds-page" aria-busy="true"><PageHeader title="Overview" subtitle="Loading your stay…"/><div className="ds-stats ds-stats-4">{Array.from({length: 4}, (_, i) => <div key={i} className="ds-stat ds-skel" aria-hidden="true"/>)}</div></div>;
  return <div className="ds-page">
    <PageHeader title="Overview" subtitle={first ? `Welcome, ${first}. Your stay at a glance.` : 'Your stay at a glance.'}
      action={unpaid.length > 0 && (
        <button type="button" className="btn btn-primary" onClick={() => onPayOnline ? onPayOnline(unpaid[0]) : go('Fees & payments')}>
          ⚡ Pay fee online ({money(totalUnpaid)})
        </button>
      )}
    />

    {unpaid.length > 0 && (
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.18)',
        border: '1px solid rgba(200, 169, 106, 0.3)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c8a96a', fontWeight: 700, marginBottom: 4 }}>
            ⚡ Instant Online Fee Payment
          </div>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            Outstanding Balance: {money(totalUnpaid)}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            {unpaid.length} unpaid invoice{unpaid.length > 1 ? 's' : ''} · Latest: {unpaid[0].invoice_number} due {dateLabel(unpaid[0].due_on)}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{
            background: '#c8a96a',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(200, 169, 106, 0.3)'
          }}
          onClick={() => onPayOnline ? onPayOnline(unpaid[0]) : go('Fees & payments')}
        >
          Pay {money(unpaid[0].balance)} Online Now →
        </button>
      </div>
    )}

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
          <ListRow title={`${unpaid.length} unpaid invoice${unpaid.length === 1 ? '' : 's'}`} meta={`${money(d.outstanding)} outstanding`} actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => go('Fees & payments')}>Pay fees online</button>}/>
          <ListRow title={`${open.length} active complaint${open.length === 1 ? '' : 's'}`} meta="Review and track progress" actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => go('Complaints')}>Open complaints</button>}/>
        </div></section>
    </div>
    <section className="ds-panel ds-preview" aria-label="Recent payments"><div className="ds-toolbar"><h2>Recent payments</h2><button type="button" className="btn btn-tertiary btn-sm" onClick={() => go('Fees & payments')}>View all</button></div>
      {payments.length ? <div className="ds-rows-inline">{payments.slice(0, 5).map(p => <ListRow key={p.id} title={'SW-' + String(p.id).padStart(6, '0')} badge={<StatusBadge value={p.reversed_at ? 'reversed' : 'recorded'}/>}
        meta={`${p.method.toUpperCase()} · ${dateLabel(p.paid_at)}`} value={money(p.amount)} actions={<button type="button" className="btn btn-tertiary btn-sm" onClick={() => onReceipt(p)}>Receipt</button>}/>)}</div>
        : <p className="ds-note ds-preview-empty">No payments yet. Receipts appear here once management records them.</p>}</section>
  </div>;
}
