export function filterInvoices(rows, {search='', status='', from='', to=''}={}) {
  const query=search.trim().toLowerCase();
  return rows.filter(i=>(!status||(status==='unpaid'?i.status!=='paid':i.status===status))&&(!from||i.month>=from+'-01')&&(!to||i.month.slice(0,7)<=to)&&
    `${i.invoice_number} ${i.resident_name} ${i.resident_id} ${i.room_number}`.toLowerCase().includes(query));
}
export function sortPerformance(rows, key='outstanding', direction='desc') {
  const sign=direction==='asc'?1:-1;
  return [...rows].sort((a,b)=>{
    const av=a[key],bv=b[key];
    if(av==null&&bv==null)return 0;
    if(av==null)return 1;
    if(bv==null)return -1;
    return sign*(Number(av)-Number(bv))||String(a.resident_name||a.room_number).localeCompare(String(b.resident_name||b.room_number));
  });
}

const text=(...parts)=>parts.filter(v=>v!=null).join(' ').toLowerCase();
const day=value=>String(value||'').slice(0,10);
// Date ranges are inclusive on both ends; empty values leave that side open.
const inRange=(value,from,to)=>(!from||day(value)>=from)&&(!to||day(value)<=to);
const hit=(query,haystack)=>!query||haystack.includes(query.trim().toLowerCase());

export function filterResidents(rows,{search='',branch='',status='',allocation='',from='',to=''}={}) {
  return rows.filter(r=>hit(search,text(r.name,r.email,r.room_number,r.resident_code,r.phone))
    &&(!branch||String(r.branch_id)===String(branch))&&(!status||r.status===status)
    &&(!allocation||(allocation==='allocated')===Boolean(r.room_id))&&inRange(r.joined_on,from,to));
}
export function filterComplaints(rows,{search='',branch='',status='',category='',from='',to=''}={}) {
  return rows.filter(c=>hit(search,text(c.title,c.description,c.resident_name,c.category,c.id))
    &&(!branch||String(c.branch_id)===String(branch))&&(!status||(status==='open'?c.status!=='resolved':c.status===status))
    &&(!category||c.category===category)&&inRange(c.created_at,from,to));
}
export function filterAdmissions(rows,{search='',branch='',status='',from='',to=''}={}) {
  return rows.filter(a=>hit(search,text(a.name,a.email,a.phone,a.message,a.id))
    &&(!branch||String(a.branch_id)===String(branch))&&(!status||(status==='open'?['pending','needs_info'].includes(a.status):a.status===status))&&inRange(a.move_in_date,from,to));
}
// Active filters as {key,label,value} so the UI can show removable chips.
export function activeFilters(values,fields) {
  return fields.filter(f=>values[f.key]).map(f=>({key:f.key,label:f.label,
    value:f.options?(f.options.find(o=>String(o.value)===String(values[f.key]))?.label??values[f.key]):values[f.key]}));
}

export function filterGatePasses(rows,{search='',status='',from='',to=''}={}) {
  return rows.filter(p=>hit(search,text(p.resident_name,p.resident_code,p.room_number))&&(!status||p.status===status)&&inRange(p.valid_until,from,to));
}
export function filterMessages(rows,{search='',channel='',status='',from='',to=''}={}) {
  const state=e=>e.delivery_status||(e.cancelled?'cancelled':e.sent_at?'sent':'queued');
  return rows.filter(e=>hit(search,text(e.subject,e.recipient))&&(!channel||(e.channel||'email')===channel)&&(!status||state(e)===status)&&inRange(e.created_at||e.sent_at,from,to));
}
export function filterRooms(rows,{branch='',type='',sharing='',occupancy='',status=''}={}) {
  return rows.filter(r=>(!branch||String(r.branch_id)===String(branch))&&(!type||(type==='ac')===Boolean(r.ac))
    &&(!sharing||String(r.capacity)===String(sharing))&&(!status||(status==='active')===Boolean(r.active))
    &&(!occupancy||(occupancy==='empty'?r.occupied===0:occupancy==='full'?r.occupied>=r.capacity:r.occupied<r.capacity)));
}

// Active fee plans for a branch and sharing on a date; mirrors the server's plan lookup (overlaps are blocked on save).
export function matchingPlans(plans, branchId, sharing, today) {
  return plans.filter(p => p.active !== false && String(p.branch_id) === String(branchId) && Number(p.sharing) === Number(sharing)
    && String(p.effective_from).slice(0, 10) <= today && (!p.effective_until || String(p.effective_until).slice(0, 10) >= today));
}

// Totals for a set of ledger rows, summed in paise so the strip always matches the rows shown.
export function ledgerTotals(rows) {
  const paise = v => Math.round(Number(v || 0) * 100);
  const sum = key => rows.reduce((t, r) => t + paise(r[key]), 0) / 100;
  return {count: rows.length, billed: sum('amount'), collected: sum('paid'), outstanding: sum('balance'),
    overdue: rows.filter(r => r.status === 'overdue').reduce((t, r) => t + paise(r.balance), 0) / 100};
}

// Dashboard figures. Every number is computed from the same server-scoped rows the destination pages show, so a card and the list it opens always agree.
export function dashboardMetrics({residents = [], rooms = [], invoices = [], payments = [], admissions = [], complaints = [], stayRequests = []}, {branchId = null, today}) {
  const inB = r => !branchId || String(r.branch_id) === String(branchId), paise = v => Math.round(Number(v || 0) * 100), rs = p => p / 100;
  const dayNum = d => Math.floor(Date.parse(String(d).slice(0, 10) + 'T00:00:00Z') / 86400000), t = dayNum(today);
  const people = residents.filter(inB), active = people.filter(r => r.status === 'active');
  const activeRooms = rooms.filter(r => r.active && inB(r));
  const capacity = activeRooms.reduce((n, r) => n + r.capacity, 0), occupied = activeRooms.reduce((n, r) => n + (r.occupied || 0), 0);
  const vacantRooms = activeRooms.filter(r => (r.available ?? Math.max(r.capacity - (r.occupied || 0), 0)) > 0);
  const vacantOf = ac => vacantRooms.filter(r => Boolean(r.ac) === ac).reduce((n, r) => n + (r.available ?? Math.max(r.capacity - (r.occupied || 0), 0)), 0);
  const inv = invoices.filter(inB), unpaid = inv.filter(i => paise(i.balance) > 0), overdue = unpaid.filter(i => i.status === 'overdue');
  const byResident = new Map();
  for (const i of unpaid) {
    const g = byResident.get(i.resident_id) || {resident_id: i.resident_id, name: i.resident_name, room: i.room_number, balance: 0, overdue: 0, overdueCount: 0, oldestDue: null};
    g.balance += paise(i.balance); if (i.status === 'overdue') { g.overdue += paise(i.balance); g.overdueCount += 1; }
    if (!g.oldestDue || String(i.due_on) < g.oldestDue) g.oldestDue = String(i.due_on).slice(0, 10);
    byResident.set(i.resident_id, g);
  }
  const feesDue = [...byResident.values()].sort((a, b) => b.overdue - a.overdue || b.balance - a.balance || String(a.oldestDue).localeCompare(String(b.oldestDue)))
    .map(g => ({...g, balance: rs(g.balance), overdue: rs(g.overdue)}));
  const invoiceById = new Map(invoices.map(i => [i.id, i])), month = String(today).slice(0, 7);
  const received = payments.filter(p => !p.reversed_at && String(p.paid_at).slice(0, 7) === month && (!branchId || inB(invoiceById.get(p.invoice_id) || {})));
  const awaiting = admissions.filter(inB).filter(a => ['pending', 'needs_info'].includes(a.status)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const open = complaints.filter(inB).filter(c => c.status !== 'resolved').sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const stays = stayRequests.filter(inB).filter(r => r.status === 'pending');
  const moveOuts = active.filter(r => r.planned_move_out && dayNum(r.planned_move_out) >= t && dayNum(r.planned_move_out) <= t + 30);
  const activity = [
    ...payments.filter(p => !p.reversed_at && (!branchId || inB(invoiceById.get(p.invoice_id) || {}))).map(p => ({kind: 'payment', at: p.paid_at, amount: Number(p.amount), who: invoiceById.get(p.invoice_id)?.resident_name || 'a resident', id: 'p' + p.id})),
    ...admissions.filter(inB).map(a => ({kind: 'admission', at: a.created_at, who: a.name, status: a.status, id: 'a' + a.id})),
    ...complaints.filter(inB).map(c => ({kind: 'complaint', at: c.created_at, who: c.resident_name, title: c.title, id: 'c' + c.id}))]
    .filter(e => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 6);
  return {staying: active.filter(r => r.room_id).length, waiting: active.filter(r => !r.room_id).length,
    capacity, occupied, vacant: Math.max(capacity - occupied, 0), occupancyPercent: capacity ? Math.round(100 * occupied / capacity) : 0, vacantAc: vacantOf(true), vacantNonAc: vacantOf(false),
    outstanding: rs(unpaid.reduce((n, i) => n + paise(i.balance), 0)), owingResidents: byResident.size, overdueAmount: rs(overdue.reduce((n, i) => n + paise(i.balance), 0)), overdueCount: overdue.length,
    collectedMonth: rs(received.reduce((n, p) => n + paise(p.amount), 0)), admissionsWaiting: awaiting.length, complaintsOpen: open.length,
    oldestComplaintDays: open.length ? Math.max(0, t - dayNum(open[0].created_at)) : 0, stayPending: stays.length, moveOuts: moveOuts.length,
    feesDue, admissionsList: awaiting, complaintsList: open, activity};
}
