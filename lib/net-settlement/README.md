# Net Settlement Reconciliation (browser-local)

A **100% client-side** tool that compares a **Fundserv N$M** export against a
**Winfund** trust transaction export, matches transactions, and surfaces the
required adjustments — with Excel/PDF export. **Nothing is uploaded, saved, or
sent anywhere.** No Supabase, no API routes, no saved runs, no approval workflow.

Route: **`/net-settlement`** (also in the sidebar under *Business Processing*,
and the “Settlement — daily process” card on the Business Processing department).

---

## How it works

```
open /net-settlement
  → two drop zones (Fundserv | Winfund)
  → drop files (or paste a table); drop both together → auto-routed by headers
  → parse locally (xlsx / csv / pdf / html / json)
  → normalize (decimal-safe cents, dates, ids, txn types)
  → match (reference → composite → date-tolerant → aggregate → probable)
  → summary + required adjustments render immediately below
  → export Excel / Adjustments CSV / PDF, or Clear & start again
```

Progress states shown while comparing: reading each file → detecting columns →
normalizing → matching → calculating discrepancies → preparing adjustments.

## File map

```
lib/net-settlement/
  parse.ts          browser parsing: xlsx/csv/html/json + pasted tables (ArrayBuffer in)
  parsePdf.ts       PDF table extraction from the pdf.js text layer (row/column clustering)
  parseFile.ts      single entry point — routes PDFs to parsePdf, everything else to parse
  detectSource.ts   Fundserv vs Winfund detection from headers/filename
  normalize.ts      header resolution + date/id/code/amount/txn normalization
  money.ts          decimal-safe cents (NO floating point)
  mapRecords.ts     parsed sheet -> normalized Fundserv/Winfund records
  match.ts          deterministic staged matching engine
  summary.ts        totals, category (exact/possible/discrepancy/only), exceptions
  recommendation.ts plain-language required action + computed adjustment
  reconcile.ts      orchestrator: sheets -> records -> matches -> summary + detected details
  clientExport.ts   local Excel (xlsx), Adjustments CSV, and PDF (pdf-lib) generation
  types.ts          domain types
  __fixtures__/     anonymized CSV fixtures
  __tests__/        vitest specs

components/net-settlement/
  NetSettlementTool.tsx   orchestrator UI: drop zones, progress, summary, adjustments, exports
  ComparisonTable.tsx     tabs + table + side-by-side side panel + export view
  PasteTableModal.tsx     paste Fundserv/Winfund list-view table
  ColumnMappingModal.tsx  map unrecognized columns, then auto re-compare
  ui.tsx                  badges + summary cards

app/net-settlement/page.tsx   the page (renders the client tool)
```

## Matching stages (`match.ts`)

1. **Reference** — orderId/sourceIdentifier/contract ↔ wireOrderNumber/sourceReference
2. **Composite** — dealer+currency+fund+account+type+amount+date
3. **Date-tolerant** — composite minus date, within tolerance (default 0)
4. **Aggregate** — group totals equal (1-many / many-1)
5. **Probable** — same amount+fund/account; flagged for confirmation only

A record is never reused across matches. Amounts compare on absolute value
(Fundserv/Winfund use opposite buy/sell signs) with the signed difference reported.

## Required-adjustment wording

Guidance is advisory (“Review / Confirm / Check / possible adjustment”) — it
never asserts a record must be changed. Examples produced from the fixtures:

- **Amount mismatch** → *Required adjustment: Increase Winfund amount by $50.00*
- **Missing in Winfund** → *Check whether a manual trust entry is required*
- **Missing bank code** → *Add or confirm the bank code before settlement*
- **Extra in Winfund** → *Confirm whether it should be removed or excluded*

## Exports (all generated in-browser)

- **Reconciliation Excel** — Summary, Required Adjustments, Exact/Possible/Discrepancies, Fundserv Only, Winfund Only, Raw Fundserv, Raw Winfund
- **Required Adjustments CSV**
- **PDF Summary** — files, detected details, totals, difference, adjustments, timestamp, disclaimer
- **Print** and **Clear files & start again**

## Privacy

All parsing and reconciliation happen in the browser session and are discarded
on refresh/clear — the UI states “Files are processed in this browser session and
are not saved.” No network requests are made by this feature.

## Testing

`npm i -D vitest` then `npm test`. Specs cover money parsing, date/txn
normalization, source detection, and the full match/reconcile pipeline against
anonymized fixtures.

## Known limitations

- PDF tables are reconstructed from the text layer by clustering rows/columns; unusual
  report layouts may need column mapping. Scanned/image-only PDFs have no text layer
  and are reported as such (no OCR).
- Date tolerance uses calendar days, not a business-day calendar.
- Aggregate matching pairs by composite-key group totals (not subset-sum search).
- Very large files parse synchronously on the main thread (fine for daily volumes;
  a Web Worker could be added for tens of thousands of rows).
