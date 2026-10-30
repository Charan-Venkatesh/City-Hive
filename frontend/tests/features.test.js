import test from 'node:test';
import assert from 'node:assert/strict';
import {filterInvoices,sortPerformance} from '../src/features.js';

test('ledger filters combine month range, status and search',()=>{
  const rows=[{id:1,month:'2026-01-01',status:'paid',resident_name:'Asha',invoice_number:'SW-1',room_number:'101'},
    {id:2,month:'2026-02-01',status:'overdue',resident_name:'Asha',invoice_number:'SW-2',room_number:'101'},
    {id:3,month:'2026-03-01',status:'due',resident_name:'Bala',invoice_number:'SW-3',room_number:'201'}];
  assert.deepEqual(filterInvoices(rows,{from:'2026-02',to:'2026-02',status:'overdue',search:'ASHA'}).map(r=>r.id),[2]);
  assert.equal(filterInvoices(rows,{from:'2026-04',to:'2026-01'}).length,0);
  assert.equal(filterInvoices(rows).length,3);
});
test('performance sorting compares amounts numerically and retains missing delay last',()=>{
  const rows=[{resident_name:'A',outstanding:'90',average_settlement_delay_days:null},
    {resident_name:'B',outstanding:'1000',average_settlement_delay_days:12},
    {resident_name:'C',outstanding:'200',average_settlement_delay_days:2}];
  assert.deepEqual(sortPerformance(rows).map(r=>r.resident_name),['B','C','A']);
  assert.deepEqual(sortPerformance(rows,'average_settlement_delay_days','asc').map(r=>r.resident_name),['C','B','A']);
  assert.deepEqual(rows.map(r=>r.resident_name),['A','B','C']);
});

import {filterResidents,filterComplaints,filterAdmissions,activeFilters} from '../src/features.js';
test('resident filters combine and date ranges are inclusive',()=>{
  const rows=[{name:'A',branch_id:1,status:'active',room_id:5,joined_on:'2026-09-01'},{name:'B',branch_id:2,status:'active',room_id:null,joined_on:'2026-10-01'},{name:'C',branch_id:1,status:'inactive',room_id:null,joined_on:'2026-10-15'}];
  assert.deepEqual(filterResidents(rows,{branch:'1'}).map(r=>r.name),['A','C']);
  assert.deepEqual(filterResidents(rows,{branch:'1',allocation:'unallocated'}).map(r=>r.name),['C']);
  assert.deepEqual(filterResidents(rows,{from:'2026-09-01',to:'2026-10-01'}).map(r=>r.name),['A','B']);
  assert.deepEqual(filterResidents(rows,{status:'inactive',search:'c'}).map(r=>r.name),['C']);
});
test('complaint and admission filters',()=>{
  const c=[{id:1,title:'Leak',category:'maintenance',status:'open',created_at:'2026-10-02T10:00:00Z'},{id:2,title:'Meal',category:'food',status:'resolved',created_at:'2026-10-09T10:00:00Z'}];
  assert.deepEqual(filterComplaints(c,{category:'food'}).map(x=>x.id),[2]);
  assert.deepEqual(filterComplaints(c,{from:'2026-10-02',to:'2026-10-02'}).map(x=>x.id),[1]);
  const a=[{id:1,name:'Zed',status:'pending',branch_id:3,move_in_date:'2026-11-01'}];
  assert.equal(filterAdmissions(a,{status:'approved'}).length,0);
  assert.equal(filterAdmissions(a,{search:'zed',branch:'3'}).length,1);
  assert.deepEqual(activeFilters({status:'open',x:''},[{key:'status',label:'Status'},{key:'x',label:'X'}]),[{key:'status',label:'Status',value:'open'}]);
});

import {filterGatePasses,filterMessages,filterRooms} from '../src/features.js';
test('gate pass, message and room filters',()=>{
  const g=[{resident_name:'Asha',room_number:'M-1',status:'active',valid_until:'2026-11-01'},{resident_name:'Ben',room_number:'M-2',status:'revoked',valid_until:'2026-12-01'}];
  assert.deepEqual(filterGatePasses(g,{status:'revoked'}).map(x=>x.resident_name),['Ben']);
  assert.equal(filterGatePasses(g,{from:'2026-11-15'}).length,1);
  const m=[{subject:'Due',recipient:'a@x.com',channel:'email',sent_at:'2026-10-01T00:00:00Z'},{subject:'Hi',recipient:'b@x.com',channel:'whatsapp',cancelled:true}];
  assert.deepEqual(filterMessages(m,{status:'cancelled'}).map(x=>x.subject),['Hi']);
  assert.deepEqual(filterMessages(m,{channel:'email',search:'due'}).map(x=>x.subject),['Due']);
  const r=[{branch_id:1,ac:true,capacity:2,occupied:2,active:true},{branch_id:1,ac:false,capacity:4,occupied:0,active:true},{branch_id:2,ac:true,capacity:2,occupied:1,active:false}];
  assert.equal(filterRooms(r,{occupancy:'full'}).length,1);
  assert.equal(filterRooms(r,{occupancy:'empty',type:'non'}).length,1);
  assert.equal(filterRooms(r,{occupancy:'available'}).length,2);
  assert.equal(filterRooms(r,{status:'inactive',sharing:'2'}).length,1);
});

test('"open" shortcut filters match the dashboard cards',()=>{
  const c=[{id:1,status:'open'},{id:2,status:'in_progress'},{id:3,status:'resolved'}];
  assert.deepEqual(filterComplaints(c,{status:'open'}).map(x=>x.id),[1,2]);
  const a=[{id:1,status:'pending'},{id:2,status:'needs_info'},{id:3,status:'approved'}];
  assert.deepEqual(filterAdmissions(a,{status:'open'}).map(x=>x.id),[1,2]);
});
