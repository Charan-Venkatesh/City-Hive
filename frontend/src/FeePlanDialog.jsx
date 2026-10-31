import React, {useEffect, useRef, useState} from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import Segmented from './Segmented';

const SHARING = Array.from({length: 8}, (_, i) => ({value: String(i + 1), label: String(i + 1)}));
const ACTIVE = [{value: 'true', label: 'Active'}, {value: 'false', label: 'Inactive'}];

// Create or edit a fee plan. Same payloads as before; billing day, due day and extra charge are under "More options" with their usual defaults.
export default function FeePlanDialog({plan, branches, today, busy, error, onSubmit, onCancel}) {
  const editing = Boolean(plan), active = branches.filter(b => b.active !== false);
  const [branchId, setBranchId] = useState(String(active[0]?.id || '')), [sharing, setSharing] = useState('2');
  const [name, setName] = useState(plan?.name || ''), touched = useRef(editing);
  const [fee, setFee] = useState(plan?.monthly_fee || ''), [advance, setAdvance] = useState(plan?.advance_amount ?? '0');
  const [from, setFrom] = useState(today.slice(0, 7) + '-01'), [until, setUntil] = useState(plan?.effective_until || ''), [isActive, setIsActive] = useState(String(plan?.active ?? true));
  const [label, setLabel] = useState(plan?.additional_charge_label || ''), [extra, setExtra] = useState(plan?.additional_charge_amount ?? '0');
  const [billing, setBilling] = useState(String(plan?.billing_day ?? 1)), [due, setDue] = useState(String(plan?.due_day ?? 5));
  const [sharingError, setSharingError] = useState('');
  useEffect(() => {   // suggest a name from branch and sharing until the administrator types their own
    if (editing || touched.current) return;
    const b = active.find(x => String(x.id) === branchId)?.name;
    if (b && sharing) setName(`${b} · ${sharing}-person sharing`.slice(0, 100));
  }, [branchId, sharing]);
  function submit(e) {
    e.preventDefault();
    if (!editing && !sharing) return setSharingError('Choose the sharing this plan prices.');
    const common = {name: name.trim(), monthly_fee: fee, advance_amount: advance, additional_charge_label: label, additional_charge_amount: extra || '0', billing_day: Number(billing), due_day: Number(due)};
    onSubmit(editing ? {...common, effective_until: until || null, active: isActive === 'true'}
      : {...common, branch_id: Number(branchId), sharing: Number(sharing), effective_from: from || undefined, effective_until: null});
  }
  return <DialogShell title={editing ? 'Edit fee plan' : 'Create a fee plan'} subtitle={editing ? plan.name : 'One plan prices one sharing type in one branch from a start date.'} busy={busy} error={error} onClose={onCancel} onSubmit={submit}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save plan' : 'Create plan'}</button></>}>
    {!editing && active.length > 1 && <FormField label="Branch"><select value={branchId} onChange={e => setBranchId(e.target.value)} required>{active.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></FormField>}
    {!editing && <Segmented legend="Residents sharing" name="plan-sharing" options={SHARING} value={sharing} onChange={v => { setSharing(v); setSharingError(''); }} error={sharingError}/>}
    <FormField label="Plan name" hint={editing ? undefined : 'Suggested from branch and sharing; edit if you like.'}>
      <input value={name} onChange={e => { touched.current = true; setName(e.target.value); }} required minLength={2} maxLength={100}/></FormField>
    <div className="ff-grid">
      <FormField label="Monthly fee (₹)"><input type="number" min={0} max={1000000} step="0.01" value={fee} onChange={e => setFee(e.target.value)} required/></FormField>
      <FormField label="Advance (₹)" hint="Configured advance for this plan."><input type="number" min={0} max={10000000} step="0.01" value={advance} onChange={e => setAdvance(e.target.value)} required/></FormField>
    </div>
    {!editing ? <FormField label="Effective from"><input type="date" value={from} onChange={e => setFrom(e.target.value)} required/></FormField>
      : <div className="ff-grid"><FormField label="Effective through" hint="Leave blank for no end date."><input type="date" value={until} onChange={e => setUntil(e.target.value)}/></FormField>
        <Segmented legend="Plan status" name="plan-active" options={ACTIVE} value={isActive} onChange={setIsActive}/></div>}
    <details className="disclosure"><summary>More options</summary><div className="disclosure-body">
      <div className="ff-grid"><FormField label="Billing day (1–28)" hint="Day invoices are created."><input type="number" min={1} max={28} value={billing} onChange={e => setBilling(e.target.value)} required/></FormField>
        <FormField label="Due day (1–28)" hint="Day payment is due."><input type="number" min={1} max={28} value={due} onChange={e => setDue(e.target.value)} required/></FormField></div>
      <div className="ff-grid"><FormField label="Extra charge label" optional><input value={label} onChange={e => setLabel(e.target.value)} maxLength={100}/></FormField>
        <FormField label="Extra monthly charge (₹)" optional><input type="number" min={0} max={1000000} step="0.01" value={extra} onChange={e => setExtra(e.target.value)}/></FormField></div>
    </div></details>
    <p className="ff-hint">Issued invoices keep their price, charge label and due date. If this plan already has invoices, create a successor plan for future pricing and first set this plan’s end date.</p>
  </DialogShell>;
}
