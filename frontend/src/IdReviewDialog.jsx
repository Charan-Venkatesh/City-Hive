import React, {useState} from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import Segmented from './Segmented';
import {IdentityDocuments} from './GapFeatures';

// Manual in-person document review. The stored-document panel keeps its own upload form, so the review form is a sibling
// (submitted by the footer button through the `form` attribute) rather than a parent.
export default function IdReviewDialog({resident, api, token, busy, error, onSubmit, onCancel}) {
  const [outcome, setOutcome] = useState('reviewed'), formId = 'id-review-form';
  return <DialogShell title="Review identity document" subtitle={`${resident.name} · ${resident.resident_code}`} busy={busy} error={error} onClose={onCancel}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" form={formId} disabled={busy}>{busy ? 'Saving…' : 'Record review'}</button></>}>
    <p className="dlg-note">This is an in-person document review, not a UIDAI identity verification. Recorded Aadhaar ending: <strong>{resident.aadhaar_last4 || 'not provided'}</strong>.</p>
    <IdentityDocuments resident={resident} api={api} token={token}/>
    <form id={formId} className="dlg-form-inline" onSubmit={e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget)); onSubmit({status: outcome, ...(v.aadhaar_last4 ? {aadhaar_last4: v.aadhaar_last4} : {})}); }}>
      {!resident.aadhaar_last4 && <FormField label="Aadhaar last four digits reviewed in person"><input name="aadhaar_last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/></FormField>}
      <Segmented legend="Review outcome" name="id-outcome" options={[{value: 'reviewed', label: 'Reviewed in person'}, {value: 'rejected', label: 'Rejected'}]} value={outcome} onChange={setOutcome}/>
      <label className="rp-switch"><input type="checkbox" required/>I reviewed the presented document with the resident.</label>
    </form>
  </DialogShell>;
}
