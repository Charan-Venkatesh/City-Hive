import React, {useMemo, useState} from 'react';

const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const monthOf=value=>String(value||'').slice(0,7);

// Branch-first view: beds filled, cost per sharing type, this month's revenue and the pending fee list.
export default function BranchInsights({branches,rooms,invoices,month}){
  const [branchId,setBranchId]=useState('');
  const chosen=branchId||String((branches.find(b=>rooms.some(r=>r.branch_id===b.id))||branches[0])?.id||'');
  const view=useMemo(()=>{
    const id=Number(chosen);
    const branchRooms=rooms.filter(r=>r.branch_id===id&&r.active);
    const roomByNumber=Object.fromEntries(branchRooms.map(r=>[r.number,r]));
    const mine=invoices.filter(i=>i.branch_id===id);
    const current=mine.filter(i=>monthOf(i.month)===monthOf(month));
    const types={};
    for(const r of branchRooms){
      const t=types[`${r.capacity}-${r.ac?1:0}`]||={sharing:r.capacity,ac:!!r.ac,rooms:0,beds:0,filled:0,billed:0,collected:0};
      t.rooms+=1;t.beds+=r.capacity;t.filled+=Number(r.occupied||0);
    }
    for(const i of current){const rm=roomByNumber[i.room_number],t=rm&&types[`${rm.capacity}-${rm.ac?1:0}`];if(t){t.billed+=Number(i.amount);t.collected+=Number(i.paid)}}
    const sum=(rows,key)=>rows.reduce((total,row)=>total+Number(row[key]||0),0);
    const beds=sum(Object.values(types),'beds'),filled=sum(Object.values(types),'filled');
    return {types:Object.values(types).sort((a,b)=>a.sharing-b.sharing||Number(b.ac)-Number(a.ac)),beds,filled,
      billed:sum(current,'amount'),collected:sum(current,'paid'),
      pendingRows:mine.filter(i=>Number(i.balance)>0).sort((a,b)=>String(a.due_on).localeCompare(String(b.due_on))),
      pending:sum(mine.filter(i=>Number(i.balance)>0),'balance')};
  },[chosen,rooms,invoices,month]);
  if(!branches.length)return null;
  return <section className="card branch-insights">
    <div className="card-heading"><div><h2>Branch overview</h2><p>Choose a branch to see beds, revenue and pending fees.</p></div>
      <label className="field compact">Branch<select value={chosen} onChange={e=>setBranchId(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
    <div className="insight-metrics">
      <div><small>Beds</small><strong>{view.beds}</strong></div>
      <div><small>Filled</small><strong>{view.filled}</strong><em>{view.beds?Math.round(view.filled*100/view.beds):0}% occupied</em></div>
      <div><small>Vacant</small><strong>{view.beds-view.filled}</strong></div>
      <div><small>Billed this month</small><strong>{money(view.billed)}</strong></div>
      <div><small>Collected this month</small><strong>{money(view.collected)}</strong></div>
      <div><small>Pending fees (all months)</small><strong>{money(view.pending)}</strong></div>
    </div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Beds by sharing type"><table><thead><tr><th>Sharing</th><th>Rooms</th><th>Beds</th><th>Filled</th><th>Billed this month</th><th>Collected</th></tr></thead>
      <tbody>{view.types.map(t=><tr key={`${t.sharing}-${t.ac}`}><td>{t.sharing}-person · {t.ac?'AC':'Non-AC'}</td><td>{t.rooms}</td><td>{t.beds}</td><td>{t.filled}</td><td>{money(t.billed)}</td><td>{money(t.collected)}</td></tr>)}</tbody></table></div>
    <h3 className="insight-title">Pending fee list</h3>
    {view.pendingRows.length?<div className="table-scroll" tabIndex={0} role="region" aria-label="Pending fees"><table><thead><tr><th>Resident</th><th>Room</th><th>Month</th><th>Due</th><th>Balance</th><th>Status</th></tr></thead>
      <tbody>{view.pendingRows.slice(0,50).map(i=><tr key={i.id}><td>{i.resident_name}</td><td>{i.room_number||'—'}</td><td>{monthOf(i.month)}</td><td>{i.due_on}</td><td>{money(i.balance)}</td><td>{i.status}</td></tr>)}</tbody></table></div>:<p className="muted">No pending fees for this branch.</p>}
  </section>;
}
