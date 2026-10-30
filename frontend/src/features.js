export function filterInvoices(rows, {search='', status='', from='', to=''}={}) {
  const query=search.trim().toLowerCase();
  return rows.filter(i=>(!status||i.status===status)&&(!from||i.month>=from+'-01')&&(!to||i.month.slice(0,7)<=to)&&
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
