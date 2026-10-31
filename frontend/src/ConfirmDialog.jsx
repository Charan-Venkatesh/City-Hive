import React, {useState} from 'react';
import DialogShell from './DialogShell';

// Confirmation for risky actions. Optionally collects a required reason (same text the API already expects).
export default function ConfirmDialog({title, children, confirmLabel, danger, reasonLabel, reasonMin = 5, busy, error, onConfirm, onCancel}) {
  const [reason, setReason] = useState('');
  return <DialogShell title={title} size="sm" busy={busy} error={error} onClose={onCancel}
    onSubmit={e => { e.preventDefault(); onConfirm(reason); }}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button></>}>
    {children}
    {reasonLabel && <label className="ff"><span className="ff-label">{reasonLabel}</span>
      <textarea className="ff-textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} required minLength={reasonMin} maxLength={500}/></label>}
  </DialogShell>;
}
