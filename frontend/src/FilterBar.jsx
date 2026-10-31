import React, {useState} from 'react';
import {activeFilters} from './features';

// One consistent filter row: inputs, removable chips, result count and reset.
// With `collapse`, the field marked `primary` (the search) stays visible and the rest sit under a "Filters (n)" disclosure
// that starts open on wide screens and closed on phones. Without it the bar behaves exactly as before.
export default function FilterBar({fields,values,onChange,count,total,collapse=false}) {
  const chips=activeFilters(values,fields), set=(key,value)=>onChange({...values,[key]:value});
  const [open,setOpen]=useState(()=>typeof matchMedia==='function'?matchMedia('(min-width: 900px)').matches:true);
  const control=f=><label className="field compact" key={f.key}>{f.label}
    {f.options?<select value={values[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">{f.all||'All'}</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
    :<input type={f.type||'text'} value={values[f.key]||''} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder||''}/>}</label>;
  const primary=collapse?fields.filter(f=>f.primary):fields, secondary=collapse?fields.filter(f=>!f.primary):[];
  const secondaryActive=chips.filter(c=>secondary.some(f=>f.key===c.key)).length;
  return <div className="filter-bar" role="search">
    <div className="filter-fields">{primary.map(control)}
      {secondary.length>0&&<button type="button" className="btn btn-secondary btn-sm filter-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>Filters{secondaryActive?` (${secondaryActive})`:''}</button>}</div>
    {secondary.length>0&&<div className="filter-fields filter-more" hidden={!open}>{secondary.map(control)}</div>}
    <div className="filter-summary" aria-live="polite"><span>Showing {count} of {total}</span>
      {chips.map(c=><button key={c.key} type="button" className="chip" onClick={()=>set(c.key,'')} aria-label={`Clear ${c.label} filter`}>{c.label}: {c.value} ×</button>)}
      {chips.length>0&&<button type="button" className="text-btn" onClick={()=>onChange({})}>Reset all</button>}</div>
  </div>;
}
