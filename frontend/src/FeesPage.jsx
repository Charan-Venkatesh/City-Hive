import React from 'react';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import {EmptyState, LoadingState} from './States';
import {ledgerTotals} from './features';

// Fees & payments: Plans, Invoices and Payments. Presentation only; every action calls back into the existing handlers in main.jsx.
export default function FeesPage({admin, tab, setTab, invoices, payments, plans, branches, resident, filters, setFilters, filteredInvoices, filteredPayments,
  money, monthLabel, dateLabel, busy, loading, on}) {
  const shown = admin ? tab : 'resident', totals = ledgerTotals(filteredInvoices);
  const invoiceById = new Map(invoices.map(i => [i.id, i])), branchName = id => branches.find(b => b.id === id)?.name || 'Branch';
  const filtered = Boolean(filters.search || filters.status || filters.from || filters.to);
  const pad = id => 'SW-' + String(id).padStart(6, '0');

  const action = !admin ? null : tab === 'plans' ? <button type="button" className="btn btn-primary" onClick={on.addPlan}>+ Add fee plan</button>
    : tab === 'invoices' ? <><button type="button" className="btn btn-secondary" disabled={busy} onClick={on.reminders}>Send reminders</button>
      <button type="button" className="btn btn-primary" onClick={on.generate}>Generate invoices</button></> : null;
  const subtitle = !admin ? 'Your invoices, payments and receipts.' : tab === 'plans' ? 'Monthly prices by branch and sharing. Issued invoices never change.'
    : tab === 'invoices' ? 'Track what is billed, collected and still owed.' : 'Every confirmed payment with its receipt.';

  const filterBar = <FilterBar collapse values={filters} onChange={setFilters} count={tab === 'payments' && admin ? filteredPayments.length : filteredInvoices.length}
    total={tab === 'payments' && admin ? payments.length : invoices.length}
    fields={[{key: 'search', label: 'Search', primary: true, placeholder: 'Invoice number, name or room'},
      {key: 'status', label: 'Invoice status', options: [{value: 'unpaid', label: 'Unpaid (due or overdue)'}, {value: 'due', label: 'Due'}, {value: 'overdue', label: 'Overdue'}, {value: 'paid', label: 'Paid'}]},
      {key: 'from', label: 'From billing month', type: 'month'}, {key: 'to', label: 'To billing month', type: 'month'}]}/>;

  const invoiceTable = loading && !invoices.length ? <LoadingState label="Loading invoices…"/> : filteredInvoices.length ? <DataTable label="Invoices" rows={filteredInvoices} rowKey={i => i.id} context={i => i.invoice_number}
    columns={[
      {key: 'resident', header: 'Resident', cell: i => <><strong>{i.resident_name}</strong><small>{monthLabel(i.month)} · Due {dateLabel(i.due_on)}</small><small>{i.invoice_number}</small></>},
      {key: 'room', header: 'Room', hideBelow: 'md', cell: i => i.room_number || '—'},
      {key: 'amount', header: 'Amount', align: 'right', cell: i => <>{money(i.amount)}<small>{money(i.base_fee)} − {money(i.discount)}{i.additional_charge_amount !== '0.00' ? ` + ${i.additional_charge_label}: ${money(i.additional_charge_amount)}` : ''}</small></>},
      {key: 'balance', header: 'Balance', align: 'right', cell: i => <><strong>{money(i.balance)}</strong><small>{money(i.paid)} paid</small></>},
      {key: 'status', header: 'Status', cell: i => <StatusBadge value={i.status}/>}]}
    mobile={i => ({title: i.resident_name, badge: <StatusBadge value={i.status}/>, meta: `${monthLabel(i.month)} · ${i.room_number || 'No room'} · due ${dateLabel(i.due_on)} · ${i.invoice_number}`, value: money(i.balance), valueNote: `of ${money(i.amount)}`})}
    actions={i => admin
      ? {primary: Number(i.balance) > 0 ? {label: 'Record payment', onClick: () => on.recordPayment(i)} : null, note: <span className="ds-note">Settled</span>,
         items: [{label: 'Invoice PDF', onClick: () => on.invoicePdf(i)}, {label: 'View payments', onClick: () => on.viewPayments(i)}]}
      : {primary: {label: 'Invoice PDF', onClick: () => on.invoicePdf(i)}, items: [{label: 'View payments', onClick: () => on.viewPayments(i)}]}}/>
    : <EmptyState title={filtered ? 'No invoices match these filters' : admin ? 'No invoices yet' : 'No invoices yet'}
        hint={filtered ? 'Clear a filter or change the search to see more.' : admin ? 'Allocate residents to rooms, then generate the month’s invoices.' : 'Your fees will appear after management generates invoices.'}
        action={!filtered && admin ? <button type="button" className="btn btn-primary" onClick={on.generate}>Generate invoices</button> : null}/>;

  const paymentTable = loading && !payments.length ? <LoadingState label="Loading payments…"/> : filteredPayments.length ? <DataTable label="Payments" rows={filteredPayments} rowKey={p => p.id} context={p => pad(p.id)}
    columns={[
      {key: 'receipt', header: 'Receipt', cell: p => <><strong>{pad(p.id)}</strong><small>{invoiceById.get(p.invoice_id)?.resident_name || 'Invoice #' + p.invoice_id}{invoiceById.get(p.invoice_id) ? ` · ${invoiceById.get(p.invoice_id).invoice_number}` : ''}</small></>},
      {key: 'paid', header: 'Paid on', hideBelow: 'md', cell: p => <>{dateLabel(p.paid_at)}{p.payer_name && <small>Paid by {p.payer_name}</small>}</>},
      {key: 'amount', header: 'Amount', align: 'right', cell: p => <strong>{money(p.amount)}</strong>},
      {key: 'method', header: 'Method', cell: p => <>{p.method.toUpperCase()}<small>{p.reference || p.note || 'No reference'}</small></>},
      {key: 'status', header: 'Status', cell: p => <><StatusBadge value={p.reversed_at ? 'reversed' : 'recorded'}/>{p.reversal_reason && <small>{p.reversal_reason}</small>}</>}]}
    mobile={p => ({title: pad(p.id), badge: <StatusBadge value={p.reversed_at ? 'reversed' : 'recorded'}/>, meta: `${invoiceById.get(p.invoice_id)?.resident_name || 'Invoice #' + p.invoice_id} · ${p.method.toUpperCase()} · ${dateLabel(p.paid_at)}${p.reference ? ' · ' + p.reference : ''}${p.payer_name ? ' · paid by ' + p.payer_name : ''}`, value: money(p.amount)})}
    actions={p => ({primary: {label: 'Receipt', onClick: () => on.receipt(p)}, items: admin && !p.reversed_at ? [{label: 'Reverse payment', danger: true, onClick: () => on.reverse(p)}] : []})}/>
    : <EmptyState title={filtered ? 'No payments match these filters' : 'No payments recorded yet'} hint={filtered ? 'Clear a filter to see more.' : 'Payments appear here as soon as they are recorded against an invoice.'}/>;

  const planTable = loading && !plans.length ? <LoadingState label="Loading fee plans…"/> : plans.length ? <DataTable label="Fee plans" rows={plans} rowKey={p => p.id} context={p => p.name}
    columns={[
      {key: 'plan', header: 'Plan', cell: p => <><strong>{p.name}</strong><small>{branchName(p.branch_id)} · {p.sharing}-person sharing</small><small>Bills day {p.billing_day} · due day {p.due_day}</small></>},
      {key: 'fee', header: 'Monthly price', align: 'right', cell: p => <><strong>{money(p.monthly_fee)}</strong><small>{p.additional_charge_amount !== '0.00' ? `${p.additional_charge_label}: ${money(p.additional_charge_amount)}` : 'No extra charge'}</small></>},
      {key: 'advance', header: 'Advance', align: 'right', hideBelow: 'md', cell: p => money(p.advance_amount)},
      {key: 'dates', header: 'Effective', cell: p => <>{dateLabel(p.effective_from)}<small>{p.effective_until ? `Through ${dateLabel(p.effective_until)}` : 'No end date'}</small></>},
      {key: 'status', header: 'Status', cell: p => <StatusBadge value={p.active ? 'active' : 'inactive'}/>}]}
    mobile={p => ({title: p.name, badge: <StatusBadge value={p.active ? 'active' : 'inactive'}/>, meta: `${branchName(p.branch_id)} · ${p.sharing}-person · from ${dateLabel(p.effective_from)}`, value: money(p.monthly_fee), valueNote: `Advance ${money(p.advance_amount)}`})}
    actions={p => ({primary: {label: 'Edit', onClick: () => on.editPlan(p)}})}/>
    : <EmptyState title="No fee plans yet" hint="Existing room rates remain available until a plan is created." action={<button type="button" className="btn btn-primary" onClick={on.addPlan}>+ Add fee plan</button>}/>;

  return <div className="ds-page">
    <PageHeader title="Fees & payments" subtitle={subtitle} action={action}/>
    {admin && <div className="tabs" role="tablist" aria-label="Fees sections">{[['plans', 'Plans', plans.length], ['invoices', 'Invoices', invoices.length], ['payments', 'Payments', payments.length]].map(([k, l, n]) =>
      <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab active' : 'tab'} onClick={() => setTab(k)}>{l} <small>{n}</small></button>)}</div>}
    {(shown === 'invoices' || shown === 'resident') && <section className="ds-section" aria-label="Invoices">
      <div className="ds-stats" aria-label="Totals for the invoices shown">
        <StatCard label="Billed" value={money(totals.billed)} note={`${totals.count} invoice${totals.count === 1 ? '' : 's'}`}/>
        <StatCard label="Collected" value={money(totals.collected)}/>
        <StatCard label="Outstanding" value={money(totals.outstanding)} tone={totals.outstanding > 0 ? 'warning' : undefined}/>
        <StatCard label="Overdue" value={money(totals.overdue)} tone={totals.overdue > 0 ? 'danger' : undefined}/>
      </div>
      {filterBar}{invoiceTable}</section>}
    {!admin && resident && <div className="ds-panel ds-toolbar"><div><h2>Deposit & advance account</h2><p>View recorded balances and final settlement updates.</p></div>
      <button type="button" className="btn btn-secondary" onClick={() => on.finance(resident)}>View financial account</button></div>}
    {(shown === 'payments' || shown === 'resident') && <section className="ds-section" aria-label="Payments">
      {shown === 'payments' && filterBar}<div className="ds-toolbar"><h2>Payment history</h2><span className="ds-note">Payments confirmed by management</span></div>{paymentTable}</section>}
    {shown === 'plans' && <section className="ds-section" aria-label="Fee plans">{planTable}</section>}
  </div>;
}
