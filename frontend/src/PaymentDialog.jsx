import React, {useState} from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import Segmented from './Segmented';
import {nowLocal} from './Defaults';

const METHODS = [{value: 'cash', label: 'Cash'}, {value: 'upi', label: 'UPI'}, {value: 'bank', label: 'Bank transfer'}];

// Record a confirmed payment. Same payload and idempotency key as before; the amount starts at the balance and stays editable.
export default function PaymentDialog({invoice, idempotencyKey, money, monthLabel, busy, error, onSubmit, onCancel}) {
  const [amount, setAmount] = useState(String(invoice.balance)), [method, setMethod] = useState('cash'), [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(nowLocal()), [payer, setPayer] = useState(''), [note, setNote] = useState('');
  const needsRef = method !== 'cash';
  return <DialogShell title="Record a payment" subtitle={`${invoice.resident_name} · ${monthLabel(invoice.month)} · ${invoice.invoice_number}`} busy={busy} error={error} onClose={onCancel}
    onSubmit={e => { e.preventDefault(); onSubmit({invoice_id: invoice.id, idempotency_key: idempotencyKey, amount, method, reference: reference.trim(),
      paid_at: paidAt ? new Date(paidAt).toISOString() : null, payer_name: payer, note}); }}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Record payment'}</button></>}>
    <div className="dlg-summary"><span>Outstanding balance</span><strong>{money(invoice.balance)}</strong></div>
    <FormField label="Amount received (₹)" hint="Starts at the full balance. Lower it for a partial payment.">
      <input type="number" min="0.01" max={invoice.balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required/></FormField>
    {Number(amount) !== Number(invoice.balance) && <button type="button" className="btn btn-tertiary btn-sm dlg-link" onClick={() => setAmount(String(invoice.balance))}>Use full balance</button>}
    <Segmented legend="Payment method" name="pay-method" options={METHODS} value={method} onChange={setMethod}/>
    {needsRef && <FormField label={method === 'upi' ? 'UPI reference' : 'Bank reference'} hint="Required for UPI and bank transfers."><input value={reference} onChange={e => setReference(e.target.value)} maxLength={100} required autoComplete="off"/></FormField>}
    <details className="disclosure"><summary>More options</summary><div className="disclosure-body">
      <FormField label="Date and time received" hint="Defaults to now."><input type="datetime-local" value={paidAt} max={nowLocal()} onChange={e => setPaidAt(e.target.value)}/></FormField>
      <FormField label="Payer name" optional><input value={payer} onChange={e => setPayer(e.target.value)} maxLength={100}/></FormField>
      <FormField label="Internal note" optional><textarea className="ff-textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={500}/></FormField>
    </div></details>
    <p className="ff-hint">Confirm that the hostel received this money. The system records which staff member entered it and does not verify a digital transfer.</p>
  </DialogShell>;
}
