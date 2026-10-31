# City-Hive design proposal, milestone 2: Dashboard, Residents, Fees & Payments

Status: **proposal only. No code was changed for this document.** Nothing is implemented until approved.
Reference: the approved Rooms and Allocation pilot (`DialogShell`, `FormField`, `Segmented`, `design.css` tokens, compact `RoomPicker` rows).
Scope: **Dashboard, Residents, Fees & Payments only** (admin and the resident-portal views that share these pages). Gate Passes, Complaints, Admissions, Branches, Analytics, Stay requests, Account and the public site are out of scope.
Rules honoured: no new modules, no Phase 2/3 onboarding flow, no named beds, no migrations, no API or business-logic changes, no changes to financial history, no new dependencies, uncommitted work preserved, no commit or push.

## 1. Evidence: what is wrong on these three pages today

Measured on the running app (admin, 1280 px desktop and 360 px phone) and from source:

| # | Page | Finding | Evidence |
|---|---|---|---|
| 1 | Fees › Invoices | **Actions are cut off even on a desktop.** The ledger table is 1046 px wide inside a 944 px container, so the right-most **Action** column ("Record payment") is clipped | `corrected-fees-payments-desktop.png`; measured `scrollWidth 1046 > clientWidth 944` |
| 2 | Fees › Invoices | 8 columns and 3 controls per row; the "Invoice" column mixes a PDF link, an invoice number and "View payments" | same screenshot |
| 3 | Fees | Filter row (`ledger-filters`) is a different layout from the shared `FilterBar` used on Residents, Admissions, Complaints, Rooms | source: `ledger-filters` vs `FilterBar` |
| 4 | Fees › Plans | The plan form has 10 fields in a global-styled modal (not the pilot dialog); billing day, due day and extra charge are always shown | `modal.kind==='feePlan'` (3.2 KB of JSX) |
| 5 | Fees › Payments | "Reverse" sits beside "Receipt"; payment dialog shows 6 fields with the date/time and note always open | `PaymentTable`, `modal.kind==='payment'` |
| 6 | Residents | **On a phone the first resident appears 1040 px down**, after 6 stacked filter fields (page height 3088 px) | measured `rowTop 1040` |
| 7 | Residents | 6 interactive controls per row (ID badge button, Edit allocation, Manage menu with 3 items, status badge); the table is 900 px wide on a 294 px phone viewport | measured |
| 8 | Residents | Six dialogs (add, ID review, financial account, assign fee plan, lifecycle) all use the old global dialog: buttons scroll away on phones, old font, no fixed footer | `modal.kind==='resident' \| 'review' \| 'finance' \| 'assignFeePlan' \| 'lifecycle'` |
| 9 | Dashboard | Marketing-style headline ("A little order. A better day.") at 34 px takes the most prominent spot; 8 stat cards are all the same weight, so nothing says what to do first | `corrected-overview-desktop.png` |
| 10 | Dashboard | Preview cards are misaligned (tops at 629 px and 653 px) and their text collides with the right edge ("₹7,500.00", "pending") | same screenshot; measured |
| 11 | Dashboard | **On a phone the first list starts 1521 px down**, behind 8 stacked cards; the page is 3264 px tall | measured `firstPreviewTop 1521` |
| 12 | All three | Page chrome differs: small-caps eyebrow, different title sizes (27 to 34 px), `muted small` / `Empty` / skeleton states used inconsistently | source and screenshots |
| 13 | All three | Typography still mixes the old stacks (Avenir Next body, Manrope headings that were never loaded) | `scope.spec.js` documents the original stacks |
| 14 | Resident portal | The resident view of Overview and Fees reuses the same cards and tables, so every defect above also applies to residents | `!admin` branches in the same blocks |

## 2. Design standards to apply (from the approved pilot)

Reuse exactly what the pilot established. Nothing new is invented.

- **Tokens** from `design.css` (type scale 12/14/16/18/22/28, 4-pt spacing, radii 8/12, four status colours).
- **Buttons:** one primary per view, secondary, tertiary, danger; 44 px targets on phones.
- **Dialogs:** `DialogShell` (fixed header and footer, only the body scrolls, full-height sheet on phones).
- **Forms:** `FormField` (label above, hint below, error inline), `Segmented` for small fixed choices.
- **Rows over wide tables on phones:** the compact-row pattern from `RoomPicker`: line 1 identity and key value, line 2 meta, one clear action.
- **Progressive disclosure:** rare or advanced fields collapsed.
- **Typography (decision needed):** apply the system font stack **per page**, through a `.ds-page` wrapper on these three pages only. The sidebar and top bar keep their current font until every page is migrated, then one final approved step switches the app globally. No global change in this milestone.
- **States:** one Loading (skeleton), Empty (sentence plus the fix), Error (what failed plus Retry), Success (toast) pattern, shared by the three pages.

## 3. Page proposals (before and after)

### 3.1 Dashboard

**Before:** headline plus helper sentence, branch select, 8 equal cards (centre-aligned text), then 4 preview cards with misaligned tops. Resident view is a separate older block.

**After**
1. **Page header:** "Overview", the selected branch and today's date; the primary action "Add resident" on the right. The marketing headline goes.
2. **Branch selector** stays one control at the top; the helper sentence becomes a one-line hint.
3. **"Needs attention" row (4 cards, warning tint only when non-zero):** Overdue invoices (count and ₹), Admissions waiting, Open complaints, Failed reminders. Each card is a button that opens the filtered list (as today).
4. **"Today at a glance" row (4 quieter cards):** Residents, Occupancy (`21 / 280 · 8%`), Collected this month, Stay requests. Same click behaviour.
5. **Four preview lists in a 2×2 grid** (1 column on phones), equal heights, each limited to 5 rows with "View all". Rows use the pilot's two-line pattern (name and key value on line 1, meta on line 2) with right-aligned value and consistent padding, fixing the edge collisions.
6. **Phone:** needs-attention cards as a 2-column grid; the quieter row becomes a single horizontally compact strip; first list starts within about 2 screens instead of 2.7.
7. **Empty states:** "No overdue invoices" etc. with a positive tone; loading uses skeleton cards.
8. **Resident dashboard** uses the same `StatCard` and `ListRow`, with resident-specific content unchanged.

### 3.2 Residents

**Before:** title, 6 filter fields (2 rows), 5-column table, 6 controls per row, old-style dialogs.

**After**
1. **Header:** "Residents", count, primary "Add resident".
2. **Filter bar:** search always visible; Branch, Status, Room status and the joined-date range move under a "Filters" disclosure with an active-filter chip row (same `FilterBar` data model and filter logic). Phone: search plus one "Filters (n)" button, so the first resident is within the first screen.
3. **Desktop table (4 columns):** Resident (name, code, contact), Room (number, type badge), Monthly fee (plan price or "Fee plan not assigned"), Status (account status and ID review as two small badges). **One** primary row action "Allocate/Move" plus a row menu (⋯) containing Review ID, Financial account, Fee plan, Deactivate or Reactivate. Cuts the controls from 6 to 2.
4. **Phone list (replaces the 900 px table):** compact rows: name and status badge; room and fee on line 2; the same two actions.
5. **Dialogs migrated to `DialogShell`:** Add resident (fields grouped Identity / Contact / Guardian; Aadhaar last four and guardian under "More details"; generated password kept), ID review, Assign fee plan (shows the matching plan and price automatically), Deactivate (reason plus consequences in plain text). Financial account keeps its content in a large dialog with the same sections.
6. **Empty and filtered-empty states** use the shared pattern.

### 3.3 Fees & Payments

**Before:** tabs, bespoke "billing bar", bespoke ledger filters, wide 8-column ledger with a clipped Action column, old dialogs.

**After**
1. **Header:** "Fees & payments" with the month in context; primary action depends on the tab ("Generate invoices", "Add fee plan", "Record payment" from a row).
2. **Tabs unchanged** (Plans, Invoices, Payments) with counts.
3. **Invoices tab**
   - **Summary strip:** Billed, Collected, Outstanding for the filtered rows (calculated from the same data; no new endpoint).
   - **Filter bar:** shared `FilterBar` (search, status, billing-month range) with chips and "Showing X of Y"; the old `ledger-filters` markup is retired.
   - **Table (5 columns, no clipping at 1280 px):** Resident and month · Room · Amount / Balance (balance emphasised, paid shown small) · Status badge · one primary action **Record payment** with a row menu (⋯) for Invoice PDF, View payments. Invoice number moves under the resident line.
   - **Phone:** compact rows (name and balance on line 1; month, room, due date and status on line 2; one action).
   - **Generate invoices:** a compact toolbar button that opens a small dialog with the month and a clear sentence "Existing invoices are not changed." (same endpoint and rule).
4. **Payments tab:** same table pattern; **Receipt** is the visible action; **Reverse** moves into the row menu and still opens the existing confirmation dialog with the required reason, now in `DialogShell` and styled as a danger action.
5. **Plans tab:** table with Plan (name, branch, sharing), Monthly price, Advance, Effective dates, Status; one action Edit.
6. **Dialogs:** Record payment (amount prefilled with the balance and editable, method as `Segmented` Cash/UPI/Bank, reference shown only for UPI/bank, date/time and note under "More options"); Add/Edit fee plan (branch, sharing 1–8 `Segmented`, monthly fee, advance, effective from; billing day, due day, extra charge under "More options" with the same defaults); Invoice detail and Reverse payment on the shared shell.
7. **Resident portal Fees:** same tables and rows, hiding admin-only actions exactly as today.

## 4. Desktop and phone behaviour

| | Desktop (≥1024) | Tablet (600–1023) | Phone (<600) |
|---|---|---|---|
| Page header | title left, primary action right | same | title, then full-width primary action |
| Filters | search plus visible key filters; the rest under "Filters" | same | search plus "Filters (n)" disclosure |
| Lists | tables, 4 to 5 columns, no horizontal scroll at 1280 px | tables with the lowest-priority column hidden | compact rows (no table) |
| Row actions | 1 primary plus ⋯ menu | same | same, 44 px targets |
| Dialogs | centred, 560 or 720 px | centred | full-height sheet, fixed footer |
| Dashboard cards | 4 + 4 grid | 2 columns | 2-column grid, then a compact strip |

## 5. Reusable components to create or improve

New, small, and built on the pilot's tokens (all in `frontend/src`):
1. `PageHeader.jsx`: title, subtitle, primary action slot.
2. `StatCard.jsx`: clickable card (`tone`, left-aligned), replaces the inline `Card` in `AdminOverview`.
3. `ListRow.jsx`: the two-line row used by Dashboard previews, phone Residents and phone Fees (and aligned with the `RoomPicker` row).
4. `DataTable.jsx`: responsive table that renders columns on desktop and `ListRow`s on phones from one column definition.
5. `RowMenu.jsx`: accessible ⋯ menu (replaces the `details`-based Manage menu; keyboard and Escape).
6. `StatusBadge.jsx`: one status vocabulary and colours (wraps today's `Badge`, no change to wording).
7. `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx`: one pattern each.
8. `ConfirmDialog.jsx`: built on `DialogShell` for Reverse and Deactivate.

Improve: `FilterBar.jsx` (collapsible secondary filters, chip row; same props and filter functions), `AdminOverview.jsx`, `DialogShell` (add a `danger` footer variant and a `lg` size already supported), `design.css` (stat card, row, table, menu, badge classes, all `ds-` prefixed).

## 6. Files likely to change

| File | Change |
|---|---|
| `frontend/src/main.jsx` | **Dashboard resident block, the Residents section (~7 KB), the Fees section (~6 KB), `ResidentTable`, `PaymentTable`, and the dialogs `resident`, `review`, `assignFeePlan`, `lifecycle`, `payment`, `feePlan`, `reversePayment`, `invoiceDetail`, `finance`** are replaced by the new components. Only those blocks. |
| `frontend/src/AdminOverview.jsx` | restructure into needs-attention / at-a-glance / previews using `StatCard`, `ListRow` |
| `frontend/src/FilterBar.jsx` | disclosure and chips |
| `frontend/src/design.css` | add `ds-` classes for the new components |
| New: `PageHeader.jsx`, `StatCard.jsx`, `ListRow.jsx`, `DataTable.jsx`, `RowMenu.jsx`, `StatusBadge.jsx`, `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `ConfirmDialog.jsx`, and per-dialog files (`ResidentForm`, `PaymentDialog`, `FeePlanDialog`, `ResidentFinanceDialog`) | extracted so `main.jsx` shrinks instead of growing |
| `frontend/src/features.js` | small pure helpers (ledger totals for the summary strip) with unit tests |
| `frontend/src/features.css`, `style.css` | remove only the rules these pages no longer use, after tests pass |
| `e2e/tests/usability.spec.js`, `responsive.spec.js`, `site.spec.js`, new `fees.spec.js`, `residents.spec.js`, `dashboard.spec.js` | updated selectors and new checks |

**Not changed:** backend, database, API contracts, billing and payment logic, invoice numbering, fee-plan matching, reversal rules, receipts, authentication, Rooms and Allocation pilot files, Gate Passes, other pages.

## 7. Regression risks and controls

| Risk | Level | Control |
|---|---|---|
| `main.jsx` is ~100 KB; these three pages are about 18 KB of it plus eight dialogs | High | extract to files first with identical behaviour and a green suite, then restyle; one page per step |
| Money flows (payment amount, partial payment, reversal) are touched by the dialogs | High | no logic change: same payloads and idempotency key; keep the 41-check workflow script and the payment tests green; add UI tests for partial payment and reversal on a copy of the demo database |
| Tables replaced by rows on phones could lose a column's information | Medium | one column definition drives both views; test that every field is present in both |
| Moving Reverse and Deactivate into a menu hides destructive actions | Medium | keep the confirmation dialog with required reason; test with keyboard only |
| Collapsing filters could hide active filters | Medium | chip row always shows what is applied; dashboard cards still deep-link into pre-filtered lists |
| Mixed fonts (new pages vs old sidebar) look inconsistent for a while | Low–medium | per-page `.ds-page` scope now, one reviewed global switch at the end; screenshot all 13 pages each step |
| Summary strip totals might disagree with the server | Low | computed only from the rows already shown; unit tests; same numbers as the table footer |
| Resident-portal views regress | Medium | role-based Playwright checks for resident and branch admin on all three pages |
| New menu/disclosure components need keyboard and screen-reader support | Medium | native elements where possible, arrow-key and Escape tests |

## 8. Implementation order (each step is a review checkpoint; no commit without approval)

0. **Foundations (no visible change):** `PageHeader`, `StatCard`, `ListRow`, `DataTable`, `RowMenu`, `StatusBadge`, state components, extended `design.css`, unit tests.
1. **Fees & Payments** first: it has the worst defect (clipped actions), the highest value and the most dialogs. Order inside: Invoices tab and filter bar → Payments tab and Reverse confirm → Plans tab and plan dialog → Record payment dialog.
2. **Residents:** list and phone rows → row menu → Add resident, ID review, Assign fee plan, Deactivate dialogs → Financial account dialog.
3. **Dashboard** last, because it reuses `StatCard` and `ListRow` proven on the other two pages: header, cards, previews, resident dashboard.
4. **Review gate** with screenshots of all 13 pages at 320, 360, 390, 768 and 1280 px, before any global font decision.

Each step ends with backend, frontend and full Playwright suites, responsive checks at the five widths, a demo-database fingerprint comparison, and screenshots before and after.

## 9. Decisions I need from you
1. **Font scope:** per-page now and global at the end (recommended), or global now?
2. **Phone lists:** replace tables with compact rows (recommended) or keep horizontal scrolling tables?
3. **Row menu:** are Review ID, Financial account, Fee plan, Deactivate acceptable inside a ⋯ menu, with "Allocate/Move" the only visible action?
4. **Order:** Fees → Residents → Dashboard, or Dashboard first?

Awaiting your approval before any implementation.
