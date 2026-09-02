# Financial Statement Generator

Upload a Trial Balance (`.xls`, `.xlsx`, `.csv`) → generate the Balance Sheet and
Income Statement → validate → export to Excel. Internal finance tool at
`/financial-statement-generator`.

This is accounting automation, not an AI tool. No LLM, no model call, no
machine-learning classification and no probabilistic matching exists anywhere in
the feature. Every figure is a deterministic function of the uploaded Trial
Balance and the approved GL mapping table.

## The rules that shape everything

- **An unmapped account is never guessed.** Not from its description, not from
  the sign of its balance, not from the nearest account. It becomes a blocking
  `unmapped_account` exception and reaches neither statement.
- **A difference is never plugged.** No balancing entry, no rounding line, no
  adjustment to equity. An out-of-balance sheet is reported with its exact
  difference and cannot be finalized.
- **Integer cents everywhere.** Every amount is a `bigint` of cents. Floating
  point touches a monetary value at exactly one point, `centsToNumber`, at the
  Excel/JSON boundary.
- **Debit and credit come from the source columns.** Never inferred from an
  account's type. One signed convention exists — `netCents = debit − credit`,
  debit positive — and the sign is flipped only at presentation, in
  `presentCents`.
- **One calculation engine.** `engine/generateStatements.ts` produces the result;
  the workspace and the Excel export both render that same object. There is no
  second calculator, so an exported figure cannot disagree with a reviewed one.
- **Net income exists once.** The Income Statement computes it; the Balance Sheet
  presents it verbatim as current-period earnings. A separate cross-check
  re-derives it from the mapped rows and raises an exception on disagreement,
  but never supplies the number.

## Layout

```
lib/financial-statements/
  money.ts                     integer-cent parsing, formatting, arithmetic
  types.ts                     domain model
  accounts/normalizeAccount.ts GL code decomposition (raw / full / base)
  mapping/resolveMapping.ts    deterministic resolution + precedence
  mapping/validateMappings.ts  table validation, exhaustive collision sweep
  mapping/csv.ts               finance-readable CSV import/export
  config/*Mappings.ts          the migrated mapping table (generated, reviewed)
  config/statementPresentation.ts  line order, labels, natural balances
  parsers/parseTrialBalance.ts signature detection, header detection, row reading
  engine/                      statement generation (the only calculator)
  validation/                  validations and typed exceptions
  exports/types.ts             shared export contract (scope, format, naming)
  exports/excelExporter.ts     renders the stored result to .xlsx
  exports/pdfExporter.ts       renders the same result to .pdf (pdf-lib)
  store/                       FinancialStore contract + local JSON store
```

UI in `components/financial-statements/`, pages under
`app/financial-statement-generator/`, API under `app/api/financial-statements/`.

## Mapping model

Four explicit match types, no wildcard and no regular expression ever shown to a
user or stored in the table:

| Match type | Claims |
|---|---|
| `EXACT_FULL_CODE` | one whole account, e.g. `3100-K-I` |
| `BASE_GL_CODE` | one base code and all its sub-accounts, e.g. `1101` |
| `GL_CODE_SET` | an explicit list of base codes |
| `NUMERIC_RANGE` | an inclusive span of base codes |

Precedence is exact → set/base → range, so a narrower rule always wins. **Ties
inside a tier are never resolved by first-match**: two equally specific rules
that disagree produce a blocking `ambiguous_mapping`. `findCollisions` sweeps the
whole 0000–9999 code space and runs on every save, so a conflicting edit is
refused while the user is editing rather than discovered on a statement.

## Legacy migration

`scripts/migrate-legacy-fs-mappings.mjs` converts the ExcelReport-Master
workbook into the checked-in TypeScript config. It is a one-time, re-runnable
migration; the workbook is not needed to build, test or run the app.

The legacy workbook documented its own semantics in its notes rows, including
*"the first match will be used"*. Rather than reproduce first-match-wins at
runtime, each collision it actually contained was resolved once, during
migration, in a way that is behaviour-identical to the legacy result:

| Legacy collision | Resolution |
|---|---|
| `7750` claimed by both Bonus (row 41) and Management Fees (row 42) | removed from Management Fees; row 41 won under legacy first-match |
| `8000`/`8001` claimed by Income Tax Provision (row 45) and an ignore rule (row 47) | ignore rule dropped — it was fully shadowed |
| `4950` claimed by Interco Admin Fees (row 13) and an ignore rule (row 46) | ignore rule dropped — fully shadowed |
| `3100-K-X` / `3100-K-Y` listed twice, identically | de-duplicated |

Three presentation splits were added beyond the legacy master, each provable to
the cent against the reviewed July 2026 statements:

- **Right of Use Asset-Office** = accounts 1950 and 2950, carved out of the
  Capital Assets ranges by precedence alone.
- **Lease Obligation** = account 3600, moved out of the Accounts Payable set.
- **Other** (Fees & Other Income) presents the legacy Other and Rental Income
  buckets on one line.

Each split was checked to the cent against the reviewed statements.

## Golden regression

The reviewed, human-signed Balance Sheet and Income Statement for a real closed
month are the oracle. `__tests__/local/goldenJuly2026.test.ts` runs that month's
Trial Balance through the engine and asserts every figure on both statements —
totals, subtotals and each individual line — plus the reconciliation and
finalization checks. None of it is hard-coded: the engine has no notion of which
month it is reading.

The Sage export also prints its own net-income control figure, which the parser
captures and the test asserts against. That number is computed by Sage rather
than by us, so agreement is independent evidence for the whole pipeline.

**This test and its fixture are deliberately not in the repository.** They hold
real client balances and named advisors, and this repository is public, so
`lib/financial-statements/__fixtures__/` and `lib/financial-statements/__tests__/local/`
are gitignored. Drop the Trial Balance into the fixtures directory on a machine
that is allowed to hold it and the suite picks the tests up automatically;
everywhere else they are simply absent.

`__tests__/pipeline.test.ts` covers the same path — file bytes in, statements and
both export formats out — on invented figures, so the wiring stays under test
here.

### One documented variance

The reviewed statements split a single expense account across two presented
lines. That account is one line in the Trial Balance and no account of the
moved amount exists anywhere in its range, so the split cannot be derived from
the source by any mapping; the reviewed PDF carries handwritten adjustment
notes, and the preparer's own margin annotations are payout ratios showing the
move was deliberate.

Because the adjustment is offsetting, every subtotal from that section's total
downwards — and the whole Balance Sheet — still agrees to the cent. The engine
reports the mapping-derived split and the variance is left visible rather than
plugged or hard-coded. The specifics are recorded in the local golden test.

## Storage is optional

Generating statements never depends on storage, because a serverless function
root is read-only and this tool has to work there. The store resolves a writable
location once — an explicit `FINANCIAL_STATEMENTS_DATA_DIR`, else
`.data/financial-statements` — and reports `isPersistenceAvailable()`. Where
neither can be created it runs stateless:

| | Writable (local) | Read-only (serverless) |
|---|---|---|
| Upload → statements | ✓ | ✓ |
| Excel and PDF downloads | ✓ | ✓ (Trial Balance posted back) |
| Package history, finalize, audit trail | ✓ | not offered |

The OS temp directory is deliberately not a fallback. On serverless it is
writable but private to one short-lived instance, so a package written during
the upload request is often gone by the time the browser follows a link to it.
Storing there would hand out URLs that 404; keeping no history is better.

The mapping table ships as checked-in configuration, so it is always available;
storage only ever holds edits made through the GL Mapping screen.

Downloads take two routes to the same result. Against a stored package,
`GET /api/financial-statements/packages/[id]/export` renders the stored version.
With no storage, the browser keeps the uploaded file and posts it to
`POST /api/financial-statements/export`, which regenerates and renders. The
engine is deterministic and the mapping table is fixed configuration, so both
produce identical figures — verified by regenerating and comparing.

The uploaded spreadsheet is never written to disk in either mode. Where a run is
kept, only the normalized rows and generated results are stored.

## Finalization

`assessFinalization` returns eight explicit checks: Trial Balance balances, every
account mapped, no ambiguous mappings, Balance Sheet balances, net income
reconciles, every line traces to its GL rows, every row reconciled, no blocking
exceptions. Finalizing is disabled until all eight pass.
