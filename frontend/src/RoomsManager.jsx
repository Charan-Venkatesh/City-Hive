import React, {useMemo, useState} from 'react';
import {
  BedDouble, Plus, Search, Filter, LayoutGrid, List, Layers,
  ChevronDown, ChevronRight, Wind, Snowflake, CheckCircle2,
  AlertCircle, Edit2, UserPlus, Power, Building2, Users, ArrowUpRight
} from 'lucide-react';
import BranchInsights from './BranchInsights';

const money = v => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(Number(v || 0));

export default function RoomsManager({
  rooms = [],
  branches = [],
  invoices = [],
  residents = [],
  month,
  branchOptions = [],
  onEdit,
  onLifecycle,
  onAdd,
  onAllocate
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'floors' | 'table'
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState('all'); // 'all' | 'available' | 'full' | 'empty'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'ac' | 'non-ac'
  const [floorFilter, setFloorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('number'); // 'number' | 'vacant' | 'occupied' | 'floor'
  const [showInsights, setShowInsights] = useState(false);

  // Derive all unique floors
  const allFloors = useMemo(() => {
    const s = new Set();
    rooms.forEach(r => { if (r.floor) s.add(r.floor); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      // Branch filter
      if (selectedBranch && String(r.branch_id) !== selectedBranch) return false;
      // Search (room number, floor, or resident occupant name)
      if (search.trim()) {
        const q = search.toLowerCase();
        const numMatch = r.number?.toLowerCase().includes(q);
        const floorMatch = r.floor?.toLowerCase().includes(q);
        const occMatch = (r.occupants || []).some(o => o.name?.toLowerCase().includes(q));
        if (!numMatch && !floorMatch && !occMatch) return false;
      }
      // Occupancy filter
      const occ = Number(r.occupied || 0);
      const cap = Number(r.capacity || 1);
      if (occupancyFilter === 'available' && occ >= cap) return false;
      if (occupancyFilter === 'full' && occ < cap) return false;
      if (occupancyFilter === 'empty' && occ > 0) return false;
      // AC type
      if (typeFilter === 'ac' && !r.ac) return false;
      if (typeFilter === 'non-ac' && r.ac) return false;
      // Floor filter
      if (floorFilter !== 'all' && r.floor !== floorFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'vacant') {
        const vacA = Math.max(0, a.capacity - a.occupied);
        const vacB = Math.max(0, b.capacity - b.occupied);
        return vacB - vacA || a.number.localeCompare(b.number, undefined, {numeric: true});
      }
      if (sortBy === 'occupied') {
        return (b.occupied || 0) - (a.occupied || 0);
      }
      if (sortBy === 'floor') {
        return (a.floor || '').localeCompare(b.floor || '', undefined, {numeric: true});
      }
      return a.number.localeCompare(b.number, undefined, {numeric: true});
    });
  }, [rooms, selectedBranch, search, occupancyFilter, typeFilter, floorFilter, sortBy]);

  // Overall KPI stats
  const stats = useMemo(() => {
    const targetRooms = selectedBranch
      ? rooms.filter(r => String(r.branch_id) === selectedBranch && r.active)
      : rooms.filter(r => r.active);
    const totalRooms = targetRooms.length;
    const totalBeds = targetRooms.reduce((acc, r) => acc + Number(r.capacity || 0), 0);
    const occupiedBeds = targetRooms.reduce((acc, r) => acc + Number(r.occupied || 0), 0);
    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
    const acRooms = targetRooms.filter(r => r.ac).length;
    const pct = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    return {totalRooms, totalBeds, occupiedBeds, vacantBeds, acRooms, pct};
  }, [rooms, selectedBranch]);

  // Group by floor for 'floors' view
  const floorGroups = useMemo(() => {
    const map = new Map();
    filteredRooms.forEach(r => {
      const fl = r.floor || 'Other';
      if (!map.has(fl)) map.set(fl, []);
      map.get(fl).push(r);
    });
    return Array.from(map.entries());
  }, [filteredRooms]);

  return (
    <div className="rm-container">
      {/* EXECUTIVE HEADER WITH KPIS */}
      <div className="rm-header">
        <div>
          <span className="rm-eyebrow">INVENTORY &amp; CAPACITY CONTROL</span>
          <h1>Room Management</h1>
          <p>Configure room sharing, live bed occupancy, AC specifications and pricing plans.</p>
        </div>
        <div className="rm-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowInsights(!showInsights)}
          >
            {showInsights ? 'Hide financial insights' : '📊 Branch insights'}
          </button>
          <button type="button" className="btn btn-primary rm-add-btn" onClick={onAdd}>
            <Plus size={18} /> Add new room
          </button>
        </div>
      </div>

      {/* OPTIONAL EXPANDABLE FINANCIAL INSIGHTS */}
      {showInsights && (
        <div className="rm-insights-wrap">
          <BranchInsights branches={branches} rooms={rooms} invoices={invoices} month={month} />
        </div>
      )}

      {/* QUICK KPI STRIP */}
      <div className="rm-kpi-strip">
        <div className="rm-kpi-card">
          <span className="rm-kpi-label"><Building2 size={15} /> Active rooms</span>
          <strong>{stats.totalRooms}</strong>
          <small>{stats.acRooms} AC · {stats.totalRooms - stats.acRooms} Non-AC</small>
        </div>
        <div className="rm-kpi-card">
          <span className="rm-kpi-label"><BedDouble size={15} /> Total capacity</span>
          <strong>{stats.totalBeds} <small>beds</small></strong>
          <small>Across active inventory</small>
        </div>
        <div className="rm-kpi-card rm-kpi-highlight">
          <span className="rm-kpi-label"><Users size={15} /> Occupancy rate</span>
          <div className="rm-kpi-progress-wrap">
            <strong>{stats.pct}%</strong>
            <div className="rm-kpi-bar">
              <div className="rm-kpi-bar-fill" style={{width: `${stats.pct}%`}} />
            </div>
          </div>
          <small>{stats.occupiedBeds} occupied / {stats.totalBeds} beds</small>
        </div>
        <div className="rm-kpi-card rm-kpi-vacant">
          <span className="rm-kpi-label"><CheckCircle2 size={15} /> Vacant beds ready</span>
          <strong className="rm-vacant-num">{stats.vacantBeds}</strong>
          <small>Instant allocation available</small>
        </div>
      </div>

      {/* CONTROLS & FILTER BAR */}
      <div className="rm-controls-card">
        <div className="rm-controls-top">
          {/* SEARCH */}
          <div className="rm-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by room #, floor, or occupant name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="rm-clear-btn" onClick={() => setSearch('')}>×</button>}
          </div>

          {/* VIEW SWITCHER */}
          <div className="rm-view-switcher" role="tablist" aria-label="Room layout view">
            <button
              type="button"
              className={viewMode === 'grid' ? 'is-active' : ''}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <LayoutGrid size={16} /> Grid
            </button>
            <button
              type="button"
              className={viewMode === 'floors' ? 'is-active' : ''}
              onClick={() => setViewMode('floors')}
              title="Floor-by-Floor View"
            >
              <Layers size={16} /> By Floor
            </button>
            <button
              type="button"
              className={viewMode === 'table' ? 'is-active' : ''}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} /> Table
            </button>
          </div>
        </div>

        {/* SECOND ROW OF FILTERS */}
        <div className="rm-filters-row">
          {/* BRANCH */}
          {branches.length > 1 && (
            <label className="rm-filter-field">
              <span>Branch:</span>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* FLOOR */}
          {allFloors.length > 0 && (
            <label className="rm-filter-field">
              <span>Floor:</span>
              <select value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
                <option value="all">All Floors</option>
                {allFloors.map(fl => (
                  <option key={fl} value={fl}>{fl}</option>
                ))}
              </select>
            </label>
          )}

          {/* OCCUPANCY CHIPS */}
          <div className="rm-filter-chips">
            {[
              ['all', 'All Occupancy'],
              ['available', '🟢 Vacant Beds'],
              ['full', '🔴 Full'],
              ['empty', '⚪ Empty Rooms']
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`rm-chip-btn ${occupancyFilter === val ? 'is-active' : ''}`}
                onClick={() => setOccupancyFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* AC TYPE CHIPS */}
          <div className="rm-filter-chips">
            {[
              ['all', 'All Types'],
              ['ac', '❄️ AC'],
              ['non-ac', '🌀 Non-AC']
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`rm-chip-btn ${typeFilter === val ? 'is-active' : ''}`}
                onClick={() => setTypeFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* SORT BY */}
          <label className="rm-filter-field rm-sort-field">
            <span>Sort:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="number">Room Number</option>
              <option value="vacant">Most Vacant Beds</option>
              <option value="occupied">Most Occupied</option>
              <option value="floor">Floor Level</option>
            </select>
          </label>
        </div>

        {/* RESULTS BAR */}
        <div className="rm-results-bar">
          <span>Showing <strong>{filteredRooms.length}</strong> of {rooms.length} rooms</span>
          {(search || selectedBranch || occupancyFilter !== 'all' || typeFilter !== 'all' || floorFilter !== 'all') && (
            <button
              type="button"
              className="rm-reset-btn"
              onClick={() => {
                setSearch('');
                setSelectedBranch('');
                setOccupancyFilter('all');
                setTypeFilter('all');
                setFloorFilter('all');
              }}
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO VIEW MODE */}
      {!filteredRooms.length ? (
        <div className="rm-empty-state">
          <BedDouble size={40} />
          <h3>No rooms match your filters</h3>
          <p>Try searching for a different room number or resetting your filter criteria.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rm-table-wrapper card">
          <table className="rm-dense-table">
            <thead>
              <tr>
                <th>Room #</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Capacity</th>
                <th>Occupancy</th>
                <th>Current Residents</th>
                <th>Fee Plan / Rate</th>
                <th>Status</th>
                <th className="rm-align-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(r => {
                const vac = Math.max(0, r.capacity - (r.occupied || 0));
                const pct = r.capacity ? Math.round(((r.occupied || 0) / r.capacity) * 100) : 0;
                return (
                  <tr key={r.id} className={!r.active ? 'rm-tr-inactive' : ''}>
                    <td>
                      <strong>{r.number}</strong>
                    </td>
                    <td>
                      <span className={`rm-type-badge ${r.ac ? 'is-ac' : 'is-non-ac'}`}>
                        {r.ac ? <Snowflake size={12} /> : <Wind size={12} />}
                        {r.ac ? 'AC' : 'Non-AC'}
                      </span>
                    </td>
                    <td>{r.floor || '—'}</td>
                    <td>{r.capacity} Sharing</td>
                    <td>
                      <div className="rm-table-occ">
                        <span>{r.occupied || 0} / {r.capacity}</span>
                        <div className="rm-table-bar">
                          <div
                            className={`rm-table-fill ${pct === 100 ? 'is-full' : 'is-avail'}`}
                            style={{width: `${pct}%`}}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rm-occ-list">
                        {(r.occupants || []).length ? (
                          r.occupants.map(o => (
                            <span key={o.id} className="rm-resident-tag" title={o.resident_code}>
                              {o.name}
                            </span>
                          ))
                        ) : (
                          <span className="rm-empty-occ">Empty</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {r.plan ? (
                        <div>
                          <strong>{money(r.plan.monthly_fee)}</strong>
                          <small className="rm-plan-name">{r.plan.name}</small>
                        </div>
                      ) : (
                        <span className="rm-no-plan">No plan</span>
                      )}
                    </td>
                    <td>
                      <span className={`rm-status-badge ${!r.active ? 'is-inactive' : vac > 0 ? 'is-vacant' : 'is-full'}`}>
                        {!r.active ? 'Decommissioned' : vac > 0 ? `${vac} Vacant` : 'Full'}
                      </span>
                    </td>
                    <td className="rm-align-right">
                      <div className="rm-action-btns">
                        <button
                          type="button"
                          className="rm-mini-btn"
                          title="Edit Room"
                          onClick={() => onEdit(r)}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="rm-mini-btn"
                          title={r.active ? 'Decommission' : 'Reactivate'}
                          onClick={() => onLifecycle(r)}
                        >
                          <Power size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'floors' ? (
        /* FLOOR-BY-FLOOR VIEW */
        <div className="rm-floors-view">
          {floorGroups.map(([floorName, floorRooms]) => {
            const floorBeds = floorRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
            const floorOccupied = floorRooms.reduce((acc, r) => acc + (r.occupied || 0), 0);
            const floorVacant = Math.max(0, floorBeds - floorOccupied);
            return (
              <section key={floorName} className="rm-floor-section card">
                <div className="rm-floor-header">
                  <div>
                    <h3>{floorName}</h3>
                    <span className="rm-floor-meta">
                      {floorRooms.length} rooms · {floorOccupied} / {floorBeds} beds occupied ({floorVacant} vacant)
                    </span>
                  </div>
                  <div className="rm-floor-progress">
                    <div
                      className="rm-floor-fill"
                      style={{width: `${floorBeds ? Math.round((floorOccupied / floorBeds) * 100) : 0}%`}}
                    />
                  </div>
                </div>
                <div className="rm-cards-grid">
                  {floorRooms.map(r => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      onEdit={onEdit}
                      onLifecycle={onLifecycle}
                      onAllocate={onAllocate}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* DEFAULT CARDS GRID VIEW */
        <div className="rm-cards-grid">
          {filteredRooms.map(r => (
            <RoomCard
              key={r.id}
              room={r}
              onEdit={onEdit}
              onLifecycle={onLifecycle}
              onAllocate={onAllocate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// RICH MODERN ROOM CARD COMPONENT
function RoomCard({room, onEdit, onLifecycle, onAllocate}) {
  const cap = Number(room.capacity || 1);
  const occ = Number(room.occupied || 0);
  const vacant = Math.max(0, cap - occ);
  const occupants = room.occupants || [];

  return (
    <article className={`rm-card ${!room.active ? 'is-inactive' : vacant > 0 ? 'is-available' : 'is-full'}`}>
      {/* CARD TOP */}
      <div className="rm-card-top">
        <div>
          <span className="rm-room-num">Room {room.number}</span>
          <span className="rm-room-floor">{room.floor || 'Standard Floor'}</span>
        </div>
        <div className="rm-card-badges">
          <span className={`rm-type-badge ${room.ac ? 'is-ac' : 'is-non-ac'}`}>
            {room.ac ? <Snowflake size={11} /> : <Wind size={11} />}
            {room.ac ? 'AC' : 'Non-AC'}
          </span>
          <span className={`rm-status-badge ${!room.active ? 'is-inactive' : vacant > 0 ? 'is-vacant' : 'is-full'}`}>
            {!room.active ? 'Decommissioned' : vacant > 0 ? `${vacant} Vacant` : 'Full'}
          </span>
        </div>
      </div>

      {/* BED SLOTS VISUALIZER */}
      <div className="rm-bed-slots">
        <div className="rm-slots-header">
          <span>Bed Allocation ({occ}/{cap})</span>
          <small>{vacant} bed(s) available</small>
        </div>
        <div className="rm-slots-grid">
          {Array.from({length: cap}).map((_, i) => {
            const occupant = occupants[i];
            if (occupant) {
              return (
                <div key={i} className="rm-slot rm-slot-occupied" title={`Occupied by ${occupant.name}`}>
                  <span className="rm-slot-avatar">{occupant.name.charAt(0)}</span>
                  <div className="rm-slot-info">
                    <strong>{occupant.name}</strong>
                    <small>{occupant.resident_code || occupant.phone || 'Resident'}</small>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="rm-slot rm-slot-vacant">
                <BedDouble size={14} />
                <span>Vacant Bed</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRICING & PLAN */}
      <div className="rm-card-pricing">
        {room.plan ? (
          <div>
            <strong>{money(room.plan.monthly_fee)}<small> / resident / mo</small></strong>
            <span className="rm-fee-plan-tag">{room.plan.name}</span>
          </div>
        ) : (
          <div className="rm-no-plan-wrap">
            <span className="rm-no-plan-text">No Fee Plan Assigned</span>
            <small>Set rate under Fee Plans</small>
          </div>
        )}
      </div>

      {/* CARD ACTION BUTTONS */}
      <div className="rm-card-actions">
        <button
          type="button"
          className="rm-action-btn primary"
          onClick={() => onEdit(room)}
        >
          <Edit2 size={13} /> Edit Room
        </button>
        <button
          type="button"
          className="rm-action-btn secondary"
          title={room.active ? 'Decommission' : 'Reactivate'}
          onClick={() => onLifecycle(room)}
        >
          <Power size={13} /> {room.active ? 'Decommission' : 'Reactivate'}
        </button>
      </div>
    </article>
  );
}
