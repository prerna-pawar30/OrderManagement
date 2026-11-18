# Phase 0: Baseline (OrderManagement)

Recorded before any change, so every later phase can be compared with it.

## How the numbers were produced

| What | Command | Notes |
|---|---|---|
| Code metrics | `node scripts/code-metrics.mjs` | raw data in `metrics.baseline.json` |
| Lint | `npx eslint src` with the shared `eslint.config.js` (added in Phase 1) | see "Lint" below |
| Build proof | `node scripts/proxy-build.mjs <dir>` | hashes in `build-manifest.baseline.txt` |

`vite build` could not be run in the refactor workspace, because npm packages cannot be downloaded there.
The proxy build bundles **the app's own source** with esbuild (the bundler Vite already ships with): minified,
with npm packages left external. Two source trees that produce the same manifest behave identically.
Please also run `npm run build` before and after on your machine and compare `dist/` (steps in `PHASE1_REPORT.md`).

## Code metrics

| Metric | Value |
|---|---:|
| JS/JSX files in `src/` | 56 |
| Total lines | 18,075 |
| Files over 300 lines | 17 |
| Comment lines | 5,032 |
| Commented-out code lines (detected) | 2,878 |
| Files where more than 30% of lines are comments | 11 |
| `console.*` calls | 12 (0 `console.log`, 9 `console.error`, 2 `console.warn`, 1 `console.table`) |
| Magic numbers (ESLint `no-magic-numbers`, ignore -1/0/1/2/100) | 671 |
| Nested ternaries | 37 |

The brief estimated about 1,200 lines of commented-out code. The detector finds 2,878: most of the 11 heavy files
start with a full commented-out older copy of themselves (for example `CreateInvoicePage.jsx`, `utils/InvoiceHelpers.js`).
That copy includes its own old comments, which appear as `// // ...`.

### Files over 300 lines

```
 1523  src/pages/CreateInvoicePage.jsx
 1376  src/components/order/OrderDetailDrawer.jsx
 1330  src/pages/CreateOrderPage.jsx
 1179  src/components/invoice/UpdateInvoiceModal.jsx
 1124  src/pages/CustomerDetailPage.jsx
 1076  src/pages/OrdersListPage.jsx
  977  src/pages/InvoiceListPage.jsx
  855  src/pages/AnalyticsPage.jsx
  724  src/components/invoice/MonthYearExcelExport.jsx
  660  src/components/invoice/InvoiceDetailModal.jsx
  645  src/components/creditnote/CreditNoteDetailModal.jsx
  585  src/utils/CreditNotePdf.js
  506  src/backend/ApiService.js
  469  src/pages/CreditNotesPage.jsx
  465  src/components/order/ReturnOrderModal.jsx
  414  src/components/creditnote/CreateCreditNoteModal.jsx
  365  src/components/creditnote/SettleRefundModal.jsx
```

### Files with more than 30% comments (comment lines / total, of which commented-out code)

| File | Comments | Old code |
|---|---:|---:|
| `components/order/OrderDetailDrawer.jsx` | 682 / 1376 (50%) | 485 |
| `pages/CreateOrderPage.jsx` | 672 / 1330 (51%) | 316 |
| `pages/CreateInvoicePage.jsx` | 564 / 1523 (37%) | 399 |
| `components/invoice/UpdateInvoiceModal.jsx` | 562 / 1179 (48%) | 317 |
| `pages/OrdersListPage.jsx` | 536 / 1076 (50%) | 319 |
| `pages/CustomerDetailPage.jsx` | 499 / 1124 (44%) | 422 |
| `utils/CreditNotePdf.js` | 262 / 585 (45%) | 206 |
| `components/invoice/InvoiceDetailModal.jsx` | 235 / 660 (36%) | 121 |
| `components/order/ReturnOrderModal.jsx` | 223 / 465 (48%) | 155 |
| `components/creditnote/SettleRefundModal.jsx` | 188 / 365 (52%) | 92 |
| `utils/InvoiceHelpers.js` | 73 / 140 (52%) | 49 |

## Lint (shared config, all rules at "warn")

**0 errors, 1,321 warnings.**

| Rule | Count |
|---|---:|
| `no-magic-numbers` | 671 |
| `id-length` (one-letter names) | 474 |
| `max-lines-per-function` (40) | 68 |
| `no-unused-vars` | 40 |
| `no-nested-ternary` | 37 |
| `max-lines` (300, blank lines and comments not counted) | 14 |
| `no-console` | 12 |
| `max-depth` (3) | 4 |
| `no-empty` | 1 |

`react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` could not be measured offline (the plugin could not be
installed). They will show up in your first `npm run lint`.

## Build

- Proxy build: 60 source inputs → `main.js` (340,202 bytes), `main.css`, 3 PNG assets. Output is deterministic (built twice, same hashes).
- Every file under `src/` is reachable from `src/main.jsx`. There are no dead files.
- Dynamic imports: `exceljs`, `jspdf`, `jspdf-autotable` (lazy-loaded PDF/Excel code).
