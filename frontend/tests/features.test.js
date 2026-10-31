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

import {matchingPlans} from '../src/features.js';
test('price preview matches the single active plan for branch, sharing and date',()=>{
  const plans=[
    {id:1,branch_id:2,sharing:3,active:true,effective_from:'2026-01-01',effective_until:null},
    {id:2,branch_id:2,sharing:3,active:false,effective_from:'2026-01-01',effective_until:null},
    {id:3,branch_id:2,sharing:2,active:true,effective_from:'2026-01-01',effective_until:'2026-06-30'},
    {id:4,branch_id:3,sharing:3,active:true,effective_from:'2026-01-01',effective_until:null},
    {id:5,branch_id:2,sharing:4,active:true,effective_from:'2027-01-01',effective_until:null}];
  assert.deepEqual(matchingPlans(plans,2,3,'2026-10-30').map(p=>p.id),[1]);   // inactive, other branch ignored
  assert.deepEqual(matchingPlans(plans,'2',3,'2026-10-30').map(p=>p.id),[1]); // string branch id from a <select>
  assert.equal(matchingPlans(plans,2,2,'2026-10-30').length,0);               // plan already ended
  assert.equal(matchingPlans(plans,2,4,'2026-10-30').length,0);               // plan not started yet
  assert.equal(matchingPlans(plans,2,2,'2026-06-30').length,1);               // end date is inclusive
});

import {ledgerTotals} from '../src/features.js';
test('ledger totals are exact and follow the rows shown',()=>{
  const rows=[{amount:'7500.00',paid:'2500.10',balance:'4999.90',status:'overdue'},{amount:'0.10',paid:'0.00',balance:'0.10',status:'due'},{amount:'0.20',paid:'0.20',balance:'0.00',status:'paid'}];
  assert.deepEqual(ledgerTotals(rows),{count:3,billed:7500.3,collected:2500.3,outstanding:5000,overdue:4999.9});   // 0.1 + 0.2 style float drift avoided
  assert.deepEqual(ledgerTotals([]),{count:0,billed:0,collected:0,outstanding:0,overdue:0});
});

import {dashboardMetrics} from '../src/features.js';
test('dashboard figures follow the same rows the lists show, per branch',()=>{
  const rooms=[{id:1,branch_id:1,active:true,capacity:3,occupied:2,available:1,ac:true},{id:2,branch_id:1,active:true,capacity:2,occupied:0,available:2,ac:false},{id:3,branch_id:2,active:true,capacity:4,occupied:4,available:0,ac:false},{id:4,branch_id:1,active:false,capacity:5,occupied:0,available:5,ac:true}];
  const residents=[{id:1,branch_id:1,status:'active',room_id:1,planned_move_out:'2026-11-05'},{id:2,branch_id:1,status:'active',room_id:null},{id:3,branch_id:1,status:'inactive',room_id:null},{id:4,branch_id:2,status:'active',room_id:3,planned_move_out:'2026-12-31'},{id:5,branch_id:1,status:'active',room_id:2,planned_move_out:'2026-11-29'},{id:6,branch_id:1,status:'active',room_id:2,planned_move_out:'2026-11-30'}];
  const invoices=[{id:1,branch_id:1,resident_id:1,resident_name:'A',room_number:'R1',balance:'1000.10',amount:'7500',status:'overdue',due_on:'2026-10-05'},{id:2,branch_id:1,resident_id:1,resident_name:'A',room_number:'R1',balance:'200.20',amount:'7500',status:'due',due_on:'2026-11-05'},{id:3,branch_id:1,resident_id:2,resident_name:'B',balance:'0.00',amount:'7500',status:'paid',due_on:'2026-10-05'},{id:4,branch_id:2,resident_id:4,resident_name:'D',balance:'500',amount:'7500',status:'overdue',due_on:'2026-10-05'}];
  const payments=[{id:1,invoice_id:1,amount:'300.00',paid_at:'2026-10-29T10:00:00',reversed_at:null},{id:2,invoice_id:1,amount:'900.00',paid_at:'2026-10-02T10:00:00',reversed_at:'2026-10-03T00:00:00'},{id:3,invoice_id:1,amount:'50.00',paid_at:'2026-09-30T23:00:00',reversed_at:null},{id:4,invoice_id:4,amount:'75.00',paid_at:'2026-10-10T10:00:00',reversed_at:null}];
  const admissions=[{id:1,branch_id:1,status:'pending',created_at:'2026-10-20T00:00:00',name:'X'},{id:2,branch_id:1,status:'needs_info',created_at:'2026-10-21T00:00:00',name:'Y'},{id:3,branch_id:1,status:'approved',created_at:'2026-10-22T00:00:00',name:'Z'},{id:4,branch_id:2,status:'pending',created_at:'2026-10-23T00:00:00',name:'W'}];
  const complaints=[{id:1,branch_id:1,status:'open',created_at:'2026-10-24T08:00:00',resident_name:'A',title:'T1'},{id:2,branch_id:1,status:'resolved',created_at:'2026-10-25T08:00:00',resident_name:'A',title:'T2'},{id:3,branch_id:1,status:'in_progress',created_at:'2026-10-27T08:00:00',resident_name:'B',title:'T3'}];
  const stayRequests=[{id:1,branch_id:1,status:'pending'},{id:2,branch_id:1,status:'approved'},{id:3,branch_id:2,status:'pending'}];
  const data={residents,rooms,invoices,payments,admissions,complaints,stayRequests}, today='2026-10-30';
  const b1=dashboardMetrics(data,{branchId:1,today}), all=dashboardMetrics(data,{today});
  assert.equal(b1.staying,3); assert.equal(b1.waiting,1);                                 // inactive resident is neither staying nor waiting
  assert.deepEqual([b1.capacity,b1.occupied,b1.vacant,b1.occupancyPercent],[5,2,3,40]);    // decommissioned room ignored
  assert.deepEqual([b1.vacantAc,b1.vacantNonAc],[1,2]);
  assert.deepEqual([b1.outstanding,b1.overdueAmount,b1.overdueCount,b1.owingResidents],[1200.3,1000.1,1,1]);
  assert.equal(b1.feesDue.length,1); assert.deepEqual([b1.feesDue[0].balance,b1.feesDue[0].overdue,b1.feesDue[0].oldestDue],[1200.3,1000.1,'2026-10-05']);
  assert.equal(b1.collectedMonth,300);                                                     // reversed payment and last month's payment excluded
  assert.equal(b1.admissionsWaiting,2); assert.equal(b1.complaintsOpen,2); assert.equal(b1.oldestComplaintDays,6);
  assert.equal(b1.stayPending,1); assert.equal(b1.moveOuts,2);                              // 5 Nov and 29 Nov count; 30 Nov is day 31 and does not
  assert.equal(all.admissionsWaiting,3); assert.equal(all.stayPending,2); assert.equal(all.collectedMonth,375); assert.equal(all.capacity,9);
  assert.deepEqual(b1.activity.map(e=>e.id),['p1','c3','c2','c1','a3','a2']);              // newest first, branch only, capped at six
  const none=dashboardMetrics({}, {today}); assert.deepEqual([none.staying,none.capacity,none.occupancyPercent,none.outstanding,none.collectedMonth],[0,0,0,0,0]);
});
test('unpaid invoice filter covers due and overdue',()=>{
  const rows=[{status:'due',month:'2026-10-01',invoice_number:'a',resident_name:'x',resident_id:1,room_number:'1'},{status:'overdue',month:'2026-10-01',invoice_number:'b',resident_name:'x',resident_id:1,room_number:'1'},{status:'paid',month:'2026-10-01',invoice_number:'c',resident_name:'x',resident_id:1,room_number:'1'}];
  assert.deepEqual(filterInvoices(rows,{status:'unpaid'}).map(r=>r.invoice_number),['a','b']);
});
