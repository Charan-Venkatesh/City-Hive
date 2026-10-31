# City-Hive Dashboard: "Operations Command Centre" proposal

Status: proposal written before implementation, as requested. Scope: **Dashboard only** (staff overview, with the matching resident overview on the same components). No schema change, no Phase 2/3, no Gate Passes, no redesign of other pages.

## 1. What I inspected

| Area | Finding |
|---|---|
| `GET /api/dashboard` (optional `branch_id`) | Returns 13 numbers. Scoped by the caller's branches on the server; an owner may pass any branch, a branch admin only their own (403 otherwise). |
| `residents` field | `COUNT(*)` of **all** resident rows, including inactive ones. It answers "how many residents exist", not "how many are staying". |
| `occupied`, `beds` | Sum over active rooms of active residents and capacity. Accurate. |
| `collected` | Sum of **paid** on invoices whose *billing month* is this month. A payment made today for last month's invoice is not counted. Not "money received this month". |
| `cash_collected` | Cash payments received this month only (all invoices). Different meaning from `collected`, shown side by side before, which confused. |
| `overdue_invoice_count`, `pending_admissions`, `open_complaints`, `reminder_failures`, `upcoming_moveouts`, `pending_extensions` | Server counts. They match the list pages' rows, except `pending_admissions` counts `pending` + `needs_info` while the Admissions filter only had `pending` until the "Awaiting decision" option was added. |
| Branch scoping | Rows returned by `/residents`, `/rooms`, `/invoices`, `/payments`, `/admissions`, `/complaints`, `/stay-requests` are already limited by role and branch on the server, so any figure computed from them is automatically scoped. `/emails` rows carry no branch, so only the server count (`reminder_failures`) can be branch-filtered. |
| Navigation today | Cards call `go(page, filters)`, which pre-sets the destination page's filters. Works and is tested. |
| Current UI | 8 equal cards plus 4 preview lists; centre-aligned text; misaligned preview cards; first list 1521 px down on a phone; marketing headline. |
| Leave | **There is no leave concept in the data model** (no table, field or request type). Stay requests are extension, shift and vacating only. Gate passes exist but are a separate module and are not leave records. |

## 2. Decision: where figures come from

Every card shows a count that **equals the number of rows on the page it opens**. To guarantee that, figures are computed from the same scoped rows the destination pages use, by one pure helper (`dashboardMetrics` in `features.js`) with unit tests. The only server figure used is `reminder_failures` (branch-aware, and `/emails` has no branch column). No backend or schema change.

## 3. Metric definitions (each one supports a decision)

| Card / row | Definition | Opens | Why it matters |
|---|---|---|---|
| **Residents staying** | active residents with a room. Sub-line: "N waiting for a room" (active, no room) | Residents: Status Active + Room status Allocated | How full the hostel really is |
| **Occupancy** | occupied spaces / capacity of active rooms, % filled. Sub-line: vacant spaces split AC / Non-AC | Rooms: Occupancy "Has vacant beds" | Where to place the next resident |
| **Fees outstanding** | sum of balance on due + overdue invoices. Sub-line: "N residents owe · ₹X overdue" | Fees: Unpaid | Collection priority |
| **Collected this month** | non-reversed payments received this calendar month (all invoices) | Fees › Payments | Cash position |
| **Needs attention today** (only rows that are above zero): | | | |
| Overdue invoices | invoices with status overdue (and amount). Action: **Send reminders** (existing endpoint) | Fees: Overdue | Chase money |
| Admissions awaiting decision | `pending` + `needs_info` | Admissions: Awaiting decision | Fill rooms |
| Open complaints | status not resolved, with age of the oldest | Complaints: Not resolved | Residents' satisfaction |
| Residents waiting for a room | active, no room | Residents: Unallocated | Unbilled and unhoused |
| Stay requests to review | pending extension, shift and vacating requests | Stay requests | Time-limited decisions |
| Move-outs in the next 30 days | active residents with a planned move-out in range | Stay requests | Vacancies ahead |
| Failed reminders | server count of exhausted reminder emails | Message activity: Failed | Communication is broken |

"All clear" is shown when every row is zero.

**Not shown on purpose:** "students on leave". The product has no leave data, and inventing a metric would be wrong. It needs a leave/absence record first (a new module, outside this task). I will say so in the report rather than show a number that is not real.

## 4. Information hierarchy and layout

```
Overview · <branch> · <date>                          [+ Add resident]
Branch  [All branches ▾]
┌ Residents staying ┐ ┌ Occupancy ────────┐ ┌ Fees outstanding ─┐ ┌ Collected this month ┐   (4 primary figures)
┌ Needs attention today (action rows)  ──────────┐ ┌ Recent activity (6) ──┐
┌ Fees to follow up ┐ ┌ Admissions to approve ┐ ┌ Complaints to handle ┐    (top 5 each, people not tables)
```

1. **Primary row, four figures.** The first thing read; larger numbers.
2. **Needs attention**, a short list of action rows (count, sentence, one button). Warning tint only on non-zero rows.
3. **Recent activity**: the last six events (payment received, admission received, complaint raised) from existing rows, each opening its page. Small and actionable, not a log.
4. **Three previews** (who, not how many): residents with fees due (grouped per resident, biggest overdue first), admissions to approve, complaints to handle. Each limited to 5 rows with "View all". The old fourth preview (rooms with vacancies) is dropped: vacancy now lives in the Occupancy card.

Removed: marketing headline, 8 equal cards, a card for every counter, duplicate "Residents" cards.

## 5. Components reused

`PageHeader`, `StatCard` (clickable), `ListRow`, `StatusBadge`, `FormField` (branch select), `States` (loading/empty/error), `design.css` tokens and `.ds-page` font scope, existing `go()` navigation and the shared `FilterBar` filter state. New: nothing structural; one helper (`dashboardMetrics`), the rewritten `AdminOverview`, and `ResidentOverview` on the same components.

## 6. Desktop, tablet, phone

| | Desktop ≥1100 | Tablet 600–1099 | Phone <600 |
|---|---|---|---|
| Primary figures | 4 across | 2 × 2 | 2 × 2, compact |
| Attention + activity | 2 columns (about 2:1) | stacked | stacked, attention first |
| Previews | 3 across | 1 column | 1 column |
| First list starts | within the first screen | within about 1.5 screens | within about 2 screens (was 2.7) |

Loading shows skeleton figures; each list has a positive empty message; a failed first load shows an error with Retry.

## 7. Files affected

| File | Change |
|---|---|
| `frontend/src/features.js` | `dashboardMetrics()` pure helper; `filterInvoices` gains an `unpaid` status |
| `frontend/tests/features.test.js` | unit tests for every metric and for branch filtering |
| `frontend/src/AdminOverview.jsx` | rewritten (command-centre layout) |
| `frontend/src/ResidentOverview.jsx` | new, resident view on the same components |
| `frontend/src/main.jsx` | only: Overview blocks replaced, shared heading skipped on Overview, dashboard wiring |
| `frontend/src/FeesPage.jsx` | one added option ("Unpaid") in the existing status filter so the card opens a list with the same count |
| `frontend/src/design.css` | dashboard classes |
| `e2e/tests/*.spec.js` | the old "A little order" heading assertion becomes "Overview"; new `dashboard.spec.js`; unit-level metric checks against the API |

Not changed: backend, database, API contracts, Fees/Residents/Rooms pages, Gate Passes.

## 8. Risks and validation

| Risk | Control |
|---|---|
| A card count differs from the list it opens | single helper over the same rows; Playwright clicks every card and compares the number with the destination's "Showing X of Y" |
| Branch figures leak across branches | numbers come from server-scoped rows; test as owner, branch admin (own branch only) and resident |
| "Collected this month" changes meaning | documented definition, unit-tested against payments incl. reversed ones; compared with the database on the demo copy |
| Six spec files assert the old headline | updated to the new heading, suite stays green |
| Loading flash of zeros | skeleton until first load; error state with Retry |
| Resident overview regresses | same data, tested with a resident token |

Validation: unit tests, API-vs-UI count checks, direct database cross-check of every headline figure on a copy of the demo database, five widths (320, 360, 390, 768, 1280), the full suites, a demo-database fingerprint before and after.
