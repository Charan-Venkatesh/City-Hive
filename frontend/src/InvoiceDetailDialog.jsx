import React from 'react';
import DialogShell from './DialogShell';
import ListRow from './ListRow';
import StatusBadge from './StatusBadge';

// Payments recorded against one invoice, with receipts and the invoice PDF.
export default function InvoiceDetailDialog({invoice, payments, money, monthLabel, dateLabel, onReceipt, onInvoicePdf, onClose}) {
  const pad = id => 'SW-' + String(id).padStart(6, '0');
  return <DialogShell title={invoice.invoice_number} subtitle={`${invoice.resident_name} · ${monthLabel(invoice.month)}`} onClose={onClose}
    footer={<><button type="button" className="btn btn-secondary" onClick={() => onInvoicePdf(invoice)}>Download invoice</button><button type="button" className="btn btn-primary" onClick={onClose}>Close</button></>}>
    <div className="ds-stats"><div className="ds-stat"><small>Total</small><strong>{money(invoice.amount)}</strong></div><div className="ds-stat"><small>Balance</small><strong>{money(invoice.balance)}</strong></div></div>
    <h3 className="dlg-subhead">Payments</h3>
    {payments.length ? <div className="ds-rows ds-rows-inline">{payments.map(p => <ListRow key={p.id} title={pad(p.id)} badge={<StatusBadge value={p.reversed_at ? 'reversed' : 'recorded'}/>}
      meta={`${p.method.toUpperCase()} · ${dateLabel(p.paid_at)}${p.reference ? ' · ' + p.reference : ''}`} value={money(p.amount)}
      actions={<button type="button" className="btn btn-tertiary btn-sm" onClick={() => onReceipt(p)}>Receipt</button>}/>)}</div>
      : <p className="ff-hint">No payments recorded for this invoice yet.</p>}
  </DialogShell>;
}
