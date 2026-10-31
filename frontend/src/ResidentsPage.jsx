import React from 'react';
import PageHeader from './PageHeader';
import StatusBadge from './StatusBadge';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import {EmptyState, LoadingState} from './States';

const ID_LABEL = {pending: 'Review pending', reviewed: 'Reviewed manually', rejected: 'Rejected'};

// Residents list for staff. Presentation only: every action calls back into the existing handlers in main.jsx.
export default function ResidentsPage({residents, total, filters, setFilters, branchOptions, rooms, money, loading, on}) {
  const filtered = Object.values(filters).some(Boolean), roomOf = r => rooms.find(x => x.id === r.room_id);
  const active = residents.filter(r => r.status === 'active').length;
  const fee = r => r.monthly_fee !== null ? money(r.monthly_fee) : '—';
  const discount = r => Number(r.discount) > 0 ? `${money(r.discount)} discount` : 'No discount';
  const pills = r => <><StatusBadge value={r.id_status} label={ID_LABEL[r.id_status]}/>{r.status === 'inactive' && <StatusBadge value="inactive" label="Resident inactive"/>}</>;

  const list = loading && !total ? <LoadingState label="Loading residents…"/> : residents.length ? <DataTable label="Residents" rows={residents} rowKey={r => r.id} context={r => r.name}
    columns={[
      {key: 'resident', header: 'Resident', cell: r => <><strong>{r.name}</strong><small>{r.resident_code} · {r.email}</small><small>{r.phone}</small></>},
      {key: 'room', header: 'Room', cell: r => r.room_number ? <><strong>{r.room_number}</strong><small>{roomOf(r) ? (roomOf(r).ac ? 'AC' : 'Non-AC') : ''}</small>
        <small className="ds-only-md">{fee(r)} / month</small></> : <span className="ds-note">Unallocated</span>},
      {key: 'fee', header: 'Monthly fee', hideBelow: 'md', align: 'right', cell: r => <>{fee(r)}<small>{discount(r)}</small></>},
      {key: 'status', header: 'Status', cell: pills}]}
    mobile={r => ({title: r.name, badge: pills(r), meta: `${r.resident_code} · ${r.room_number ? r.room_number + (roomOf(r) ? (roomOf(r).ac ? ' · AC' : ' · Non-AC') : '') : 'Unallocated'}`, value: fee(r), valueNote: discount(r)})}
    actions={r => ({primary: {label: r.room_id ? 'Move' : 'Allocate room', onClick: () => on.allocate(r)},
      items: [{label: 'Review ID document', onClick: () => on.review(r)}, {label: 'Financial account', onClick: () => on.finance(r)}, {label: 'Fee plan', onClick: () => on.plan(r)},
        {label: r.status === 'inactive' ? 'Reactivate resident' : 'Deactivate resident', danger: r.status !== 'inactive', onClick: () => on.status(r)}]})}/>
    : <EmptyState title={filtered ? 'No residents match these filters' : 'No residents yet'}
        hint={filtered ? 'Clear a filter or change the search to see more.' : 'Add a resident, or enrol one from an approved admission.'}
        action={!filtered ? <button type="button" className="btn btn-primary" onClick={on.add}>+ Add resident</button> : null}/>;

  return <div className="ds-page">
    <PageHeader title="Residents" subtitle={`${total} resident${total === 1 ? '' : 's'}${filtered ? ` · ${residents.length} shown` : ''} · ${active} active${filtered ? ' in this view' : ''}`}
      action={<button type="button" className="btn btn-primary" onClick={on.add}>+ Add resident</button>}/>
    <FilterBar collapse values={filters} onChange={setFilters} count={residents.length} total={total}
      fields={[{key: 'search', label: 'Search', primary: true, placeholder: 'Name, email, room, code, phone'},
        {key: 'branch', label: 'Branch', options: branchOptions},
        {key: 'status', label: 'Status', options: [{value: 'active', label: 'Active'}, {value: 'inactive', label: 'Inactive'}]},
        {key: 'allocation', label: 'Room status', options: [{value: 'allocated', label: 'Allocated'}, {value: 'unallocated', label: 'Unallocated'}]},
        {key: 'from', label: 'Joined from', type: 'date'}, {key: 'to', label: 'Joined to', type: 'date'}]}/>
    {list}
  </div>;
}
