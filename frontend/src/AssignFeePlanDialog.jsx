import React, {useState} from 'react';
import DialogShell from './DialogShell';
import FormField from './FormField';
import {matchingPlans} from './features';

// Choose a fee plan for one resident. Shows what applies automatically so an override is a deliberate choice.
export default function AssignFeePlanDialog({resident, plans, rooms, today, money, dateLabel, busy, error, onSubmit, onCancel}) {
  const room = rooms.find(r => r.id === resident.room_id);
  const eligible = plans.filter(x => x.branch_id === resident.branch_id && x.active && (!room || x.sharing === room.capacity));
  const auto = room ? matchingPlans(plans, resident.branch_id, room.capacity, today) : [];
  // The API reports the plan in effect, which is the automatic plan unless an override differs from it. Showing the automatic plan as a
  // chosen override would be misleading, so it is preselected only when it really differs from what applies automatically.
  const isAutomatic = auto.length === 1 && auto[0].id === resident.fee_plan_id;
  const [planId, setPlanId] = useState(resident.fee_plan_id && !isAutomatic ? String(resident.fee_plan_id) : '');
  return <DialogShell title="Fee plan" subtitle={`${resident.name}${room ? ` · ${room.number} · ${room.capacity}-person` : ' · no room yet'}`} size="sm" busy={busy} error={error} onClose={onCancel}
    onSubmit={e => { e.preventDefault(); onSubmit({fee_plan_id: planId ? Number(planId) : null}); }}
    footer={<><button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save fee plan'}</button></>}>
    {room ? (auto.length === 1 ? <div className="price-panel"><span>Applies automatically</span><strong>{auto[0].name} · {money(auto[0].monthly_fee)} / month</strong><span>Used unless you choose a different plan below.</span></div>
      : <div className="price-panel warn">{auto.length ? 'More than one plan matches this room, so none is applied automatically. Choose one below.' : 'No plan matches this room automatically. Choose one below or add a plan under Fees.'}</div>)
      : <div className="price-panel idle">Plans apply once the resident has a room.</div>}
    <FormField label="Fee plan" hint="Only plans for this branch and sharing are listed.">
      <select value={planId} onChange={e => setPlanId(e.target.value)}><option value="">Use the plan that applies automatically</option>
        {eligible.map(x => <option key={x.id} value={x.id}>{x.name} · {money(x.monthly_fee)} · from {dateLabel(x.effective_from)}</option>)}</select></FormField>
    <p className="ff-hint">This does not rewrite earlier invoices. Plans apply only to the matching branch, sharing and billing period.</p>
  </DialogShell>;
}
