import React, {useEffect, useMemo, useRef, useState} from 'react';
import Segmented from './Segmented';

const natural = (a, b) => a.number.localeCompare(b.number, undefined, {numeric: true});
const floorText = f => String(f).replace(/floor/i, '').trim() || '—';
const free = r => Math.max(r.capacity - r.occupied, 0);

// Searchable room list for allocation. Compact rows; native radios give arrow-key selection. Eligibility is decided by the caller and the API.
export default function RoomPicker({rooms, currentRoomId, value, onChange, money}) {
  const [query, setQuery] = useState(''), [type, setType] = useState('all'), [onlyFree, setOnlyFree] = useState(false);
  const listRef = useRef(null);
  const selectable = r => free(r) > 0 || r.id === currentRoomId;
  const counts = useMemo(() => ({all: rooms.length, ac: rooms.filter(r => r.ac).length, non: rooms.filter(r => !r.ac).length}), [rooms]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter(r => (type === 'all' || (type === 'ac') === Boolean(r.ac)) && (!onlyFree || free(r) > 0) && (!q || r.number.toLowerCase().includes(q))).sort(natural);
  }, [rooms, query, type, onlyFree]);
  // Centre the current room inside the list only; scrollIntoView would also scroll the dialog.
  useEffect(() => {
    const list = listRef.current, row = list?.querySelector('.rp-row.on');
    if (list && row) list.scrollTop = Math.max(0, row.offsetTop - (list.clientHeight - row.offsetHeight) / 2);
  }, []);
  return <>
    <div className="rp-toolbar">
      <div className="rp-search"><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by room number, e.g. 204" aria-label="Search rooms by number"/>
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}</div>
      <Segmented legend="Room type" name="room-filter" value={type} onChange={setType}
        options={[{value: 'all', label: 'All', count: counts.all}, {value: 'ac', label: 'AC', count: counts.ac}, {value: 'non', label: 'Non-AC', count: counts.non}]}/>
      <div className="rp-row-tools"><label className="rp-switch"><input type="checkbox" role="switch" checked={onlyFree} onChange={e => setOnlyFree(e.target.checked)}/>Available only</label>
        <p className="rp-count" aria-live="polite">Showing {shown.length} of {rooms.length} rooms</p></div>
    </div>
    <div className="rp-list" ref={listRef} role="radiogroup" aria-label="Rooms">
      {shown.map(r => {
        const ok = selectable(r), on = String(r.id) === String(value);
        return <label key={r.id} className={'rp-row' + (on ? ' on' : '') + (!ok ? ' full' : '')}>
          <input type="radio" name="room" value={r.id} checked={on} disabled={!ok} onChange={() => onChange(String(r.id))}/>
          <span className="rp-name">{r.number}<span className={'ds-badge ' + (r.ac ? 'ds-badge-ac' : 'ds-badge-non')}>{r.ac ? 'AC' : 'Non-AC'}</span>{r.id === currentRoomId && <span className="ds-badge ds-badge-current">Current</span>}</span>
          <span className="rp-meta">Floor {floorText(r.floor)} · {r.capacity}-person · {ok ? <b>{free(r)} of {r.capacity} free</b> : <b className="none">Full</b>}</span>
          <span className="rp-price">{r.plan ? <>{money(r.plan.monthly_fee)}<small>/ month</small></> : <em>Fee plan not assigned</em>}</span>
        </label>;
      })}
      {!shown.length && <p className="rp-empty">No rooms match. Clear the search or a filter to see more.</p>}
    </div>
  </>;
}
