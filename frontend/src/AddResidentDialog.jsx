import React from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import {PasswordField} from './Defaults';

// Add a resident. Same payload as before; guardian, workplace and Aadhaar digits sit under "More details".
export default function AddResidentDialog({branches, today, busy, error, onSubmit, onCancel}) {
  const active = branches.filter(b => b.active !== false);
  return <DialogShell title="Add a resident" subtitle="The resident signs in with this email and a temporary password." busy={busy} error={error} onClose={onCancel}
    onSubmit={e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget)); onSubmit({...v, branch_id: Number(v.branch_id), aadhaar_last4: v.aadhaar_last4 || null}, v.temporary_password); }}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Create resident'}</button></>}>
    {active.length > 1 ? <FormField label="Branch"><select name="branch_id" required>{active.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></FormField>
      : <input type="hidden" name="branch_id" value={active[0]?.id || ''}/>}
    <FormField label="Full name"><input name="name" minLength={2} maxLength={100} required autoComplete="off"/></FormField>
    <div className="ff-grid">
      <FormField label="Email"><input name="email" type="email" required autoComplete="off"/></FormField>
      <FormField label="Phone" hint="10 digits"><input name="phone" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required autoComplete="off"/></FormField>
    </div>
    <FormField label="Joining date"><input name="joined_on" type="date" defaultValue={today} max={today} required/></FormField>
    <PasswordField label="Temporary password"/>
    <details className="disclosure"><summary>More details</summary><div className="disclosure-body">
      <div className="ff-grid"><FormField label="Guardian name" optional><input name="guardian" maxLength={100}/></FormField>
        <FormField label="Guardian phone" optional><input name="guardian_phone" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}/></FormField></div>
      <FormField label="College or workplace" optional><input name="institution" maxLength={150}/></FormField>
      <FormField label="Aadhaar last 4 digits" optional hint="Only the last four digits are stored. Review the document in person."><input name="aadhaar_last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4}/></FormField>
    </div></details>
    <p className="ff-hint">The resident must change the temporary password at first sign-in.</p>
  </DialogShell>;
}
