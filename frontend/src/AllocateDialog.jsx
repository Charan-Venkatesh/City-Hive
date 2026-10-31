import React, {useState} from 'react';
import DialogShell from './DialogShell';
import RoomPicker from './RoomPicker';

// Room allocation. Sends the same payload as before: { room_id, discount }.
export default function AllocateDialog({resident, rooms, money, busy, error, onSubmit, onCancel}) {
  const [selected, setSelected] = useState(resident.room_id ? String(resident.room_id) : '');
  const hasDiscount = Number(resident.discount) > 0;
  const [discountOpen, setDiscountOpen] = useState(hasDiscount), [discount, setDiscount] = useState(String(resident.discount ?? 0));
  const chosen = rooms.find(r => String(r.id) === selected), isCurrent = chosen && chosen.id === resident.room_id;
  const left = chosen ? Math.max(chosen.capacity - chosen.occupied, 0) : 0;
  return <DialogShell title={resident.room_id ? 'Move resident' : 'Allocate a room'} tall error={error} busy={busy} onClose={onCancel}
    onSubmit={e => { e.preventDefault(); if (selected) onSubmit({room_id: Number(selected), discount: discount === '' ? '0' : discount}); }}
    footer={<><span className="dlg-foot-note">{selected ? '' : 'Choose a room to continue.'}</span>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="btn btn-primary" disabled={busy || !selected}>{busy ? 'Saving…' : 'Confirm allocation'}</button></>}>
    <div className="rp-resident"><strong>{resident.name}</strong>
      <span>{resident.resident_code} · {resident.branch_name || 'This branch'}</span>
      <span>{resident.room_id ? `Currently in ${resident.room_number}` : 'No room allocated yet'}</span></div>
    <RoomPicker rooms={rooms} currentRoomId={resident.room_id} value={selected} onChange={setSelected} money={money}/>
    <div className={'rp-selection' + (chosen ? '' : ' idle')} role="status" aria-live="polite">
      {chosen ? <><strong>{chosen.number}</strong> · {chosen.ac ? 'AC' : 'Non-AC'} · Floor {String(chosen.floor).replace(/floor/i, '').trim() || '—'} · {chosen.plan ? `${money(chosen.plan.monthly_fee)} / month` : 'Fee plan not assigned'}
        <br/>{isCurrent ? 'This is the current room.' : `${left} free now, ${Math.max(left - 1, 0)} after this allocation.`}</> : 'No room selected yet.'}</div>
    <div className="rp-discount">{discountOpen
      ? <label className="ff"><span className="ff-label">Monthly discount (₹)<em>Optional</em></span>
        <input type="number" min={0} step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}/>
        <span className="ff-hint">Applies to future invoices only. Existing invoices keep their original rate.</span></label>
      : <button type="button" className="btn btn-tertiary" onClick={() => setDiscountOpen(true)}>+ Add a monthly discount</button>}</div>
  </DialogShell>;
}
