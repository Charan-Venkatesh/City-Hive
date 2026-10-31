import React, {useState} from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';

// Generate the month's invoices. Same endpoint and rule as before; existing invoices are never changed.
export default function GenerateInvoicesDialog({initialMonth, maxMonth, busy, error, onSubmit, onCancel}) {
  const [month, setMonth] = useState(initialMonth);
  return <DialogShell title="Generate invoices" size="sm" busy={busy} error={error} onClose={onCancel}
    onSubmit={e => { e.preventDefault(); if (month) onSubmit(month); }}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy || !month}>{busy ? 'Generating…' : 'Generate invoices'}</button></>}>
    <FormField label="Billing month"><input type="month" value={month} max={maxMonth} onChange={e => setMonth(e.target.value)} required/></FormField>
    <p className="ff-hint">Creates one invoice per allocated resident using their fee plan. Residents who already have an invoice for the month are skipped, and issued invoices never change.</p>
  </DialogShell>;
}
