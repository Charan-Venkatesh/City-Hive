import React, {useRef, useState} from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import Segmented from './Segmented';
import PricePreview from './PricePreview';

// Exact capacities 1 to 8: the same range the API (ge=1, le=8) and the database check constraint allow.
const SHARING = Array.from({length: 8}, (_, i) => ({value: String(i + 1), label: String(i + 1)}));
const TYPES = [{value: 'false', label: 'Non-AC'}, {value: 'true', label: 'AC'}];

// Add / edit room. Same payload as before; AC / Non-AC must be chosen explicitly when adding.
export default function RoomForm({room, branches, plans, today, money, busy, error, onSubmit, onCancel}) {
  const editing = Boolean(room), active = branches.filter(b => b.active !== false);
  const [branchId, setBranchId] = useState(String(room?.branch_id || active[0]?.id || ''));
  const [number, setNumber] = useState(room?.number || ''), [floor, setFloor] = useState(room?.floor || '');
  const [sharing, setSharing] = useState(room ? String(room.capacity) : '');
  const [ac, setAc] = useState(room ? String(!!room.ac) : ''), [fallback, setFallback] = useState(room ? String(room.monthly_fee) : '0');
  const [errors, setErrors] = useState({}), shareRef = useRef(null), acRef = useRef(null);
  const capacity = Number(sharing);
  const occupants = room?.occupants || [];
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) next.sharing = 'Choose how many residents share the room (1 to 8).';
    if (!ac) next.ac = 'Choose AC or Non-AC before adding the room.';
    setErrors(next);
    if (next.sharing) return shareRef.current?.focus();
    if (next.ac) return acRef.current?.focus();
    const payload = {number: number.trim(), floor: floor.trim(), capacity, monthly_fee: fallback || '0', ac: ac === 'true'};
    onSubmit(editing ? payload : {...payload, branch_id: Number(branchId)});
  }
  return <DialogShell title={editing ? 'Edit room' : 'Add a room'} subtitle={editing ? `${room.number} · ${occupants.length} of ${room.capacity} beds filled` : 'Prices come from the fee plan, so there is no price to type.'}
    error={error} busy={busy} onClose={onCancel} onSubmit={submit}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save room' : 'Add room'}</button></>}>
    {!editing && active.length > 1 && <FormField label="Branch"><select value={branchId} onChange={e => setBranchId(e.target.value)} required>{active.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></FormField>}
    <div className="ff-grid">
      <FormField label="Room number"><input value={number} onChange={e => setNumber(e.target.value)} required maxLength={30} autoComplete="off"/></FormField>
      <FormField label="Floor" hint="For example 3, or Ground"><input value={floor} onChange={e => setFloor(e.target.value)} required maxLength={30} autoComplete="off"/></FormField>
    </div>
    <Segmented legend="Residents sharing" name="sharing" options={SHARING} value={sharing} onChange={v => { setSharing(v); setErrors(e => ({...e, sharing: ''})); }} error={errors.sharing} firstRef={shareRef}/>
    <Segmented legend="Room type" name="room-type" options={TYPES} value={ac} onChange={v => { setAc(v); setErrors(e => ({...e, ac: ''})); }} error={errors.ac} firstRef={acRef}/>
    {!editing && <PricePreview plans={plans} branchId={branchId} sharing={sharing ? capacity : ''} today={today} money={money}/>}
    {editing && <div className="occupants"><h3>Residents in this room ({occupants.length}/{room.capacity}) · {Math.max(room.capacity - occupants.length, 0)} bed(s) to fill</h3>
      {occupants.length ? <ul>{occupants.map(o => <li key={o.id}><strong>{o.name}</strong><small>{o.resident_code} · {o.phone}</small></li>)}</ul> : <span className="ff-hint">No residents are allocated to this room.</span>}</div>}
    <details className="disclosure" open={Number(fallback) > 0}><summary>More options: fallback price</summary>
      <div className="disclosure-body"><FormField label="Fallback room fee (₹)" hint="Only used if no fee plan applies. Leave at 0 in normal use."><input type="number" min={0} max={1000000} step="0.01" value={fallback} onChange={e => setFallback(e.target.value)} required/></FormField></div></details>
    {editing && <p className="ff-hint">Capacity cannot be reduced below current occupancy. Issued invoices keep their saved amounts.</p>}
  </DialogShell>;
}
