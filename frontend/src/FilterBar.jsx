import React from 'react';
import {activeFilters} from './features';

// One consistent filter row: inputs, removable chips, result count and reset.
export default function FilterBar({fields,values,onChange,count,total}) {
  const chips=activeFilters(values,fields);
  const set=(key,value)=>onChange({...values,[key]:value});
  return <div className="filter-bar" role="search">
    <div className="filter-fields">{fields.map(f=><label className="field compact" key={f.key}>{f.label}
      {f.options?<select value={values[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">{f.all||'All'}</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
      :<input type={f.type||'text'} value={values[f.key]||''} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder||''}/>}</label>)}</div>
    <div className="filter-summary" aria-live="polite"><span>Showing {count} of {total}</span>
      {chips.map(c=><button key={c.key} type="button" className="chip" onClick={()=>set(c.key,'')} aria-label={`Clear ${c.label} filter`}>{c.label}: {c.value} ×</button>)}
      {chips.length>0&&<button type="button" className="text-btn" onClick={()=>onChange({})}>Reset all</button>}</div>
  </div>;
}
