# City-Hive design proposal: design system pilot on Rooms and Allocation

Status: **proposal only. No code was changed for this document.** Nothing is implemented until approved.
Scope: pilot on Add Room and Room Allocation, plus a consistency review of the other admin pages.
Rules honoured: no new modules, no Phase 2/3, no named beds, no migrations, no business-logic or API changes, no Gate Pass changes, no new dependencies, uncommitted work preserved, no commit or push.

## 1. What is wrong today (evidence)

Measured from the stylesheets (`frontend/src/style.css`, `portal.css`, `features.css`) and source:

| Finding | Evidence | Why it matters |
|---|---|---|
| **No real design tokens** | Only 15 CSS variables (mostly colours). **151 distinct hex colours**, **56 distinct spacing values** (4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18…), **9 corner radii** (4, 5, 7, 8, 9, 10, 12, 50 %, 999) | Screens look "almost the same but not quite". Every new feature adds more drift. |
| **Typography is broken on most machines** | Headings ask for *Manrope / DM Sans*, but nothing loads them (no `@font-face`, no font link in `index.html`). Body asks for *Avenir Next* (Mac only). Headings therefore fall back to a generic bold sans while body text is another family | This is why titles look like heavy Arial next to lighter body text in the screenshots; on Windows the whole app looks different from the Mac |
| **No type scale** | 14+ font sizes in use: 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 23, 24, 27, 34 px | Hierarchy is decided case by case, not by role |
| **Buttons: no clear primary/secondary/tertiary** | 27 actions are styled as plain `text-btn` links, 12 `secondary`, 10 `primary`. "Edit allocation", "Financial account", "Reverse" all look alike | Users cannot tell what is clickable or what is dangerous |
| **Dialogs are inconsistent** | Only the allocation dialog has a fixed footer. Other dialogs scroll the buttons away on phones. `.modal` is a global rule; `.form-actions` was made sticky globally (that caused the mobile overlap we just fixed) | Same problem will recur in every dialog |
| **Four different filter patterns** | Shared `FilterBar` (5 pages), `ledger-filters` (invoices), `billing-bar`, `analytics-filters` form grid | Same job, four layouts |
| **Three empty-state styles, two loading styles** | `muted small` text (20 uses), `Empty` card, `picker-empty`; skeleton only in 3 places | Inconsistent feedback; some screens show nothing while loading |
| **Accessibility patchy** | Only 5 live-region / alert uses; validation messages are injected by script; native selects for everything | Keyboard and screen-reader users get uneven help |
| **Allocation list is cramped on a phone** | At 360×640 the room list gets about 2 rows (see `docs/visual-qa/room-ux/final-allocate-open-mobile.png`) because search, 4 chips, a count and a fixed 34vh list share the screen | The main task (choose a room) has the least space |
| **Add Room asks for things the system knows** | Fee field is mandatory even though the price comes from the fee plan; no price preview; capacity typed as a number (`before-add-room-desktop.png`) | More typing, and the admin cannot see what price the room will get |

Screenshots reviewed: `docs/visual-qa/room-ux/` (`before-*` and `final-*`, desktop and mobile), plus the running app on all 13 admin pages.

## 2. Proposed City-Hive design standards

Keep the current navy and blue brand. Define it once and reuse it. **No new dependency**: tokens are plain CSS variables and the system font stack replaces the unloaded web fonts.

**Tokens (`tokens.css`)**
- **Type scale (6 roles):** caption 12 · body-sm 14 · body 16 · title-sm 18 · title 22 · display 28. Weights 400 / 600 / 700 only. One font stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, so it looks the same on every machine and needs no download.
- **Spacing (4-pt scale):** 4 · 8 · 12 · 16 · 24 · 32 · 48. Form fields 16 apart, sections 24, page padding 16 (mobile) / 32 (desktop).
- **Radius:** 8 (controls) · 12 (cards, dialogs) · pill (badges, chips).
- **Colour roles:** brand (navy/blue), text, muted text, border, surface, plus exactly four status colours (success, warning, danger, info) each with a tint and a foreground that pass contrast. Replace the ad-hoc hex values gradually, starting with the pilot.
- **Elevation:** one shadow for dialogs, none on cards (border only).
- **Focus:** one visible 2 px ring everywhere (already there; keep).

**Components**
- **Buttons:** Primary (one per view), Secondary, Tertiary (text, for low-risk row actions), Danger. Minimum 44 px touch height on phones, 40 px on desktop.
- **Form field:** label above, optional hint below, inline error replaces the hint, required fields marked once ("Required" is the default; optional fields say "Optional").
- **Segmented control** for small fixed choices (AC / Non-AC, sharing). Selects only for long lists.
- **Dialog shell:** header (title + close), scrolling body, fixed footer with Cancel (secondary) and the primary action. Phone: a full-height sheet; desktop: centred, three widths (small 440, medium 560, large 720).
- **Page template:** page title, one line of description, primary action on the right, filter bar, content. Remove the small caps eyebrow line and the fade-in that makes headings look washed out.
- **States:** one Loading (skeleton), one Empty (icon-less sentence + the action to fix it), one Error (what failed + Retry), one Success (toast). Same wording pattern everywhere.
- **Progressive disclosure:** advanced or rare fields (fallback fee, discount) sit behind a visible "Advanced" / "Add a discount" disclosure.

## 3. Pilot: Add Room (before and after)

**Before:** 6 fields in a 2-column grid (Branch, Number, Floor, Capacity number, Room type dropdown, "Fallback room fee"), a note about the fee, buttons below the fold on phones.

**After**
1. **Branch** pre-selected (shown only as a select if more than one active branch).
2. **Room number** and **Floor** (floor as a number input).
3. **Sharing** as a segmented control **1 · 2 · 3 · 4**, with an "Other" number input for 5 to 8 (same limits as today).
4. **Room type** segmented **AC | Non-AC**, nothing selected, required, with the same inline message "Choose AC or Non-AC before adding the room."
5. **Price panel (read-only, automatic):** "This room will use fee plan *Cityhive Luxury Men's PG · 3-person sharing*: **₹7,500 / month**, advance ₹8,000." If no plan matches: "No fee plan for 3-person sharing in this branch yet. Add one under Fees → Plans" (warning tint, does not block saving). The panel updates as branch and sharing change.
6. **Advanced (collapsed): "Fallback room fee"**, default 0, explained as "only used when no fee plan applies".
7. **Footer fixed:** Cancel · **Add room**.

Result: 5 fields visible instead of 6, the admin sees the price before saving, and a mistake in room type is far harder to make.
*Data source:* plans already come from `data.feePlans` and `/rooms[].plan`; the preview reuses them with the same date and active rules. No API change.

## 4. Pilot: Room Allocation (before and after)

**Before:** title "Room & monthly discount"; sentence naming the resident; search; four chips; count; a fixed-height scroll list of tall cards; a summary box; a discount field; note; fixed footer. On a 640 px phone the list shows about two rooms.

**After**
1. **Resident context strip** at the top: name, resident code, branch, current room ("Currently C-606-NAC"), or "No room yet".
2. **One toolbar row:** search field with a clear (×) button; beside it a segmented **All · AC · Non-AC**; and an "Available only" switch. On phones the segmented control sits under the search and never wraps to three rows.
3. **Compact room rows (about 56 px, was about 84 px):** line 1 `C-306-NAC` + type badge + price on the right; line 2 `Floor 3 · 3-person · 2 of 3 free`. Full rooms are dimmed and say "Full". The current room carries a "Current" badge.
4. **Selected room** gets a left accent bar, a tick, and a tinted row (not only a border colour, so it is not colour-only).
5. **List takes the remaining height** of the dialog instead of a fixed 34 vh, so a phone shows 4 to 5 rooms.
6. **Selection strip pinned above the footer:** "C-306-NAC · Non-AC · ₹7,500 / month · 2 free after this allocation". It replaces the large summary box.
7. **Discount hidden by default:** a link "Add a monthly discount" opens the field. If the resident already has a discount it is open.
8. **Footer fixed:** Cancel · **Confirm allocation** (disabled until a room is chosen, with the reason in text).
9. **Result message** after saving is unchanged (plan assigned / kept / choose one).

## 5. Desktop, tablet and phone behaviour

| | Desktop (≥1024) | Tablet (600–1023) | Phone (<600) |
|---|---|---|---|
| Dialog | centred, medium width (560), max height 85 % | centred, 560 | full-height sheet, header and footer fixed |
| Add Room | 2-column fields, price panel below | 2 columns | 1 column, segmented controls full width |
| Allocation toolbar | one row | one row | search above, segmented below |
| Room list | scrolls inside the dialog body | same | takes all remaining height |
| Buttons | 40 px | 44 px | 44 px, full-width pair |
| Keyboard | list is a radio group: arrows move, space selects, Esc closes, focus is trapped and returned to the trigger | same | same |

## 6. Reusable components to create or improve

New (small, CSS-only where possible; all in `frontend/src`):
1. `tokens.css`: variables above (imported first).
2. `DialogShell.jsx`: header / scrolling body / fixed footer, sizes, focus return. Used by Add Room and Allocation first; the other dialogs migrate later.
3. `FormField.jsx`: label, hint, error, optional marker.
4. `Segmented.jsx`: accessible radio-group segmented control.
5. `PricePreview.jsx`: read-only fee-plan panel (pure function of branch, sharing, plans).
6. `RoomForm.jsx`: Add/Edit room form extracted from `main.jsx` (same fields and payload).

Improve:
- `RoomPicker.jsx`: compact rows, remaining-height list, pinned selection strip, discount disclosure hook.
- Base button and input rules in `style.css`: variants and 44 px targets, scoped by a new class so other pages are not touched in the pilot.

## 7. Files likely to change (pilot only)

| File | Change |
|---|---|
| `frontend/src/tokens.css` (new) | design tokens, font stack |
| `frontend/src/DialogShell.jsx`, `FormField.jsx`, `Segmented.jsx`, `PricePreview.jsx`, `RoomForm.jsx` (new) | components above |
| `frontend/src/RoomPicker.jsx` | compact rows, layout, keyboard |
| `frontend/src/main.jsx` | replace the Add/Edit room form and allocation dialog body with the new components; import tokens. **Only those two dialogs** |
| `frontend/src/features.css` | move picker and dialog styles into scoped classes; remove the global `.form-actions` sticky rule once no dialog depends on it |
| `frontend/src/style.css` | font stack and button variants, added behind the new classes |
| `e2e/tests/rooms.spec.js`, `e2e/tests/responsive.spec.js` | update selectors (segmented controls), add price-preview and keyboard checks |

**Not changed:** backend, database, API contracts, fee calculation, fee-plan assignment, Gate Passes, public site, historical data.

## 8. Regression risks and how I would control them

| Risk | Level | Control |
|---|---|---|
| `main.jsx` is a 100 KB single file; edits can break unrelated screens | Medium | extract the two dialogs into their own files, change only those blocks, run the full Playwright suite (27 tests) and all-pages overflow test |
| Global CSS (`.modal`, `.form-actions`, base buttons) affects every dialog | Medium | new scoped classes (`.dialog--sheet`, `.btn--primary`); no global rule changed in the pilot |
| Font stack change alters text metrics on every page | Low–medium | apply via tokens, then re-run the phone/tablet/laptop overflow tests and compare screenshots of all 13 pages |
| Price preview could disagree with the server | Medium | reuse the exact plan fields from `/rooms` and `/fee-plans`, label it "applies on save", and cover with a test that compares the preview to the saved room's `plan` |
| Segmented controls replace selects, so existing test selectors and the validation hook change | Low | rewrite the affected tests first; keep the same required rule and message; keep a native `<input>` radio underneath for keyboard and screen readers |
| Removing the discount from view could hide an existing discount | Low | open the disclosure automatically when the resident's discount is above 0 |
| `:has()` selectors on older browsers | Low | replace with an explicit class on the dialog |
| Focus trap and focus return are new | Medium | test with keyboard-only flow in Playwright |

## 9. Other admin pages: inconsistencies and recommended direction

| Page | Inconsistencies seen | Direction |
|---|---|---|
| **Dashboard** | KPI cards centre their text on phones but left-align on desktop; previews are lists while everything else is tables; large heading fades in and looks pale | One `StatCard`, left-aligned; previews use the same `ListRow` as the room picker; remove the fade |
| **Residents** | table with a status badge button, an allocation link and a Manage menu: three action styles in one row; filter bar differs from Fees | row = name, room, status badge + one overflow menu; shared FilterBar |
| **Admissions** | dense table, review and enrol in two dialogs, status wording varies ("needs_info" vs "needs information") | status badge component with one vocabulary; one "Review" side panel with next steps |
| **Branches** | card grid with up to 5 buttons per card, publishing hidden behind a button whose rules are shown as a checklist | card = summary + one primary action; publish state as a toggle with the reason shown inline |
| **Fees & payments** | new tabs, but the invoice filters (`ledger-filters`) and generate-invoices bar are bespoke; plan form has 10 fields; Reverse beside Receipt | adopt the shared FilterBar; plan form with defaults and an Advanced section; Reverse inside the overflow menu with a confirm |
| **Financial analytics** | own filter grid, 4 tabs, many wide tables, no printing/summary hierarchy | summary row first, filters in the shared bar, tables use one responsive pattern |
| **Complaints** | cards instead of a table, two dialogs (assign, respond) | one list pattern with inline status, one "Respond" dialog |
| **Stay requests** | table with no filters; "Process due move-outs" runs without a preview | add the shared FilterBar and a preview step (as a UI-only confirmation) |
| **Account** | long technical service block above the password form | put the password form first; collapse "Service configuration" for owners only |

Cross-cutting: unify buttons (primary/secondary/tertiary/danger), the filter bar, empty/loading/error states, status badges, tables-to-cards on phones, and dialogs.

## 10. Suggested rollout (each step reviewable, no commit without approval)
1. **Pilot (this proposal):** tokens + Add Room + Room Allocation.
2. **Review checkpoint** with screenshots at 360, 768 and 1280 px.
3. Apply tokens, buttons, FilterBar and states to **Dashboard, Residents, Fees**.
4. Then Admissions, Complaints, Stay requests, Branches, Analytics, Account.

Awaiting your approval before any implementation.
