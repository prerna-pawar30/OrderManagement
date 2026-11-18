# Digident Manual Order Console

Staff app for manual orders: create an order, follow it until delivery, raise and track invoices and credit notes, see each customer's ledger and the sales analytics. Uses react-router; every logged-in page sits inside ProtectedRoute and DashboardLayout.

## Run it

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5173
```

## Environment variables

| Variable | What it is |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL, e.g. http://localhost:3000 |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into dist/ |
| `npm run preview` | Serve the production build |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix what ESLint can fix |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting (CI) |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests on every change |
| `npm run metrics` | Print code size / complexity numbers |
| `npm run proxy-build` | Build check when the npm registry is blocked |
| `npm run prepare` | Installs the git pre-commit hook (runs on npm install) |

## Where is what

| I want to change ... | Look in |
|---|---|
| Add or change a page URL | `src/routes/AppRoutes.jsx` |
| Add a sidebar menu item | `src/constants/NavigationLinks.js` |
| Any backend URL | `src/backend/ApiRoutes.js` |
| Any API call (and the access token) | `src/backend/ApiService.js` |
| Login state / logout | `src/context/AuthContext.jsx` |
| Light / dark theme | `src/context/ThemeContext.jsx, src/constants/MuiTheme.js` |
| Money and date text (₹, India time) | `src/utils/Format.js` |
| Invoice paid / due figures | `src/utils/InvoiceListHelpers.js, src/utils/InvoiceHelpers.js` |
| Customer grouping and ledger | `src/utils/InvoiceCustomers.js` |
| Invoice / credit note / statement PDFs | `src/utils/InvoicePdf.js, CreditNotePdf.js, StatementPdf.js` |
| Monthly Excel report | `src/utils/InvoiceExcelReport.js` |
| When a credit note is allowed | `src/utils/CreditNoteRules.js` |

Every file in `src/` starts with a short header: what it is for, its route, which files use it and which API calls it makes. Shared functions have JSDoc. Start there before reading the code.

## Folder map

### `src/`

- `App.jsx` — Root component: renders the route table. Providers (router, theme, auth, toasts) are set up in main.jsx.
- `main.jsx` — App entry point: mounts React and wraps the app in the router, theme, auth and toast providers.

### `src/routes/`

The route table (which URL or page key shows which page).

- `routes/AppRoutes.jsx` — URL -> page table. Every logged-in page sits inside ProtectedRoute and DashboardLayout.
- `routes/ProtectedRoute.jsx` — Sends visitors who are not logged in to /login.

### `src/pages/`

One file per screen. A page loads data, holds the screen's state and puts components together.

- `pages/AnalyticsPage.jsx` — Analytics dashboard: revenue, orders, statuses, funnel, products and locations for a date range (manual orders + direct invoices).
- `pages/CreateInvoicePage.jsx` — Form to create a standalone tax invoice: pick or type a client, add items, apply available credit, and submit.
- `pages/CreateOrderPage.jsx` — Form to create a manual order (customer, addresses, items, optional credit as discount); the backend then creates its invoice.
- `pages/CreditNotesPage.jsx` — List of all credit notes with filters; open one to apply, refund or cancel it, or create a new one.
- `pages/CustomerDetailPage.jsx` — One customer's page: summary numbers, orders, invoices, credit notes, statement and PDF downloads.
- `pages/CustomerLedgerPage.jsx` — Who owes whom: every customer's balance worked out from their invoices, with filters and a drawer per customer.
- `pages/InvoiceListPage.jsx` — All invoices grouped by customer, with source tabs (client / manual order / ecommerce / old / direct), agent filter, fuzzy search, PDF, statement and Excel export.
- `pages/LoginPage.jsx` — Staff sign-in screen.
- `pages/OrdersListPage.jsx` — Table of manual orders with search, status / payment actions, courier, returns and invoice PDF; opens OrderDetailDrawer.

### `src/components/`

Pieces of UI, grouped by feature (invoice/, order/, lead/ ...). ui/ holds generic building blocks.

- `components/creditnote/CreateCreditNoteModal.jsx` — Modal to create a credit note, either against an invoice (picked with InvoicePicker) or for a customer typed in by hand; saves it and offers the PDF.
- `components/creditnote/CreditNoteDetailModal.jsx` — Shows one credit note: amounts, customer, history, and the actions to apply it to an invoice, refund it, cancel it or download the PDF.
- `components/creditnote/InvoicePicker.jsx` — Search box that finds an invoice to raise a credit note against; only paid / partly paid invoices can be picked.
- `components/creditnote/SettleRefundModal.jsx` — Records how an order's pending refund was settled (cash, bank, card, store credit), moving the order towards "refunded".
- `components/customer/CustomerLedgerDrawer.jsx` — Side drawer with one customer's ledger: net balance and the list of their invoices.
- `components/customer/EmptyRow.jsx` — Empty-state row shown inside a CustomerDetailPage section when it has no rows.
- `components/customer/InvoicePdfButton.jsx` — Small button that downloads one invoice PDF (shows a spinner while it is generated).
- `components/customer/MiniStat.jsx` — Small label + value pair used in the CustomerDetailPage summary.
- `components/customer/Section.jsx` — Titled card that wraps one section (orders, invoices, credit notes) of the CustomerDetailPage.
- `components/customer/SummaryCard.jsx` — Headline number card (billed, paid, due ...) on the CustomerDetailPage.
- `components/dashboard/CenterLabelDonut.jsx` — Donut chart with the total written in the middle of the ring (Analytics page).
- `components/dashboard/ChartCard.jsx` — Card frame for one chart on the Analytics page, with an empty state when there is no data.
- `components/dashboard/FulfillmentFunnel.jsx` — Funnel chart of how many orders reached each fulfilment stage, with the drop-off between stages.
- `components/dashboard/IconStatTile.jsx` — KPI tile with an icon, a value and a caption (top row of the Analytics page).
- `components/dashboard/LocationLeaderboard.jsx` — Ranked list of cities / states by revenue on the Analytics page.
- `components/dashboard/RadialTickRing.jsx` — Decorative ring chart that shows each category's share as coloured ticks.
- `components/dashboard/StageTile.jsx` — Small tile with the count of orders in one status (Analytics page).
- `components/dashboard/WelcomeBanner.jsx` — "Hello <name>" banner at the top of the Analytics page.
- `components/invoice/CustomerGroup.jsx` — Accordion row on the Invoices page: one customer with their totals; opens to list that customer's invoices.
- `components/invoice/InvoiceDetailModal.jsx` — Full view of one invoice with the actions on it: record a return, settle a refund, create a credit note, download, edit.
- `components/invoice/InvoiceRow.jsx` — One invoice line inside a CustomerGroup: number, date, source, status, amounts and action buttons.
- `components/invoice/InvoiceTableRow.jsx` — Shared invoice-table pieces: status label/colour helpers, the ActionButton, and the rule for when an invoice may have credit notes.
- `components/invoice/LgButton.jsx` — Large button used in the CustomerGroup accordion header.
- `components/invoice/MarkPaidModal.jsx` — Modal to mark a manual order as paid and record how it was paid.
- `components/invoice/MonthYearExcelExport.jsx` — Button + dialog that exports all invoices of a chosen month and year to a two-sheet Excel report.
- `components/invoice/PaymentActionMenu.jsx` — Dropdown to change an order's payment status.
- `components/invoice/RecordInvoiceReturnModal.jsx` — Modal to record items returned on an invoice (and optionally that the money was already refunded).
- `components/invoice/SettleInvoiceCreditModal.jsx` — Modal to settle the refund owed on an invoice (cash, bank, card or store credit).
- `components/invoice/UpdateInvoiceModal.jsx` — Modal form to edit an existing invoice: customer details, dates, items, discounts and payment.
- `components/layout/DashboardLayout.jsx` — Logged-in page frame: sidebar, header and the routed page in the middle.
- `components/layout/Header.jsx` — Top bar: theme toggle, current user menu and sign out.
- `components/layout/Sidebar.jsx` — Left navigation (links from constants/NavigationLinks.js), collapsible.
- `components/order/CancelOrderModal.jsx` — Modal to cancel a manual order with a reason (cannot be undone).
- `components/order/CourierAssignModal.jsx` — Modal to enter courier details when confirming an order.
- `components/order/OrderDetailDrawer.jsx` — Side drawer with everything about one manual order: progress, status and payment actions, client, items, returns and its invoice.
- `components/order/OrderProgressTracker.jsx` — Step indicator placed -> confirmed -> shipped -> delivered for one order (or a cancelled notice).
- `components/order/OrderTotal.jsx` — Order total cell for the orders table; shows the net total after returns when it differs.
- `components/order/ReturnOrderModal.jsx` — Modal to record a full or partial return of a manual order and whether the refund was already paid.
- `components/order/StatusActionMenu.jsx` — Dropdown to move an order to its next status (or cancel it).
- `components/order/StatusBadge.jsx` — Coloured badges for order status, payment status and customer balance, plus the shared statusLabel() text helper.
- `components/ui/DropdownGroup.jsx` — Labelled select box used in the invoice forms.
- `components/ui/FormField.jsx` — Basic form controls with the app's styling: Field (label + error), TextInput, Select, TextArea.

### `src/backend/`

API layer: ApiRoutes.js (every URL) and ApiService.js (every HTTP call). Nothing else talks to the backend.

- `backend/ApiRoutes.js` — Every backend URL and permission slug used by this app. Never hard-code a URL anywhere else.
- `backend/ApiService.js` — All API calls, grouped by area (Auth, Employee, ManualOrder, Invoice, CreditNote). Attaches the access token and refreshes it silently when it expires.

### `src/context/`

React context providers (shared state for the whole app).

- `context/AuthContext.jsx` — Login state for the whole app: current employee, login(), logout(); the token is kept by ApiService.tokenStorage.
- `context/ThemeContext.jsx` — Light / dark theme state and toggle.

### `src/hooks/`

Reusable React hooks (useSomething).

- `hooks/UseDebounced.js` — useDebounced(value, delayMs): returns the value only after it stopped changing for delayMs (used for search boxes).
- `hooks/UseIsMobile.js` — useIsMobile(): true when the screen is phone-sized; updates on resize.
- `hooks/UsePopover.js` — usePopover(): open/close state and on-screen position for a dropdown menu anchored to a button.

### `src/utils/`

Plain functions: formatting, calculations, PDFs, Excel. No JSX.

- `utils/CreditNotePdf.js` — Builds and downloads the credit-note PDF (jsPDF).
- `utils/CreditNoteRules.js` — Business rule: which invoices a credit note may be raised against.
- `utils/Format.js` — The one place for display formatting: currency (INR), compact currency, dates and date-times in India time, initials.
- `utils/FuzzyMatch.js` — Typo-tolerant search: every word typed must match the invoice text exactly or with a small spelling mistake.
- `utils/InvoiceAnalytics.js` — Adds invoices created directly on the Invoices page to the manual-order analytics so the dashboard counts them too.
- `utils/InvoiceCustomers.js` — Groups invoices by customer and works out each customer's ledger (who owes how much). Also fetches all invoice pages.
- `utils/InvoiceExcelReport.js` — Builds the two-sheet monthly Excel report (invoice list + summary dashboard) with ExcelJS.
- `utils/InvoiceHelpers.js` — Order <-> invoice money helpers: applied-credit tags in order notes, payment state from the linked invoice, discount ratio, returned value and net total.
- `utils/InvoiceListHelpers.js` — Small helpers for the Invoices page: HSN code, INR text, sorting, agent id/name, and an invoice's paid / due figures.
- `utils/InvoicePdf.js` — Builds and downloads the tax-invoice PDF (jsPDF + autotable).
- `utils/InvoiceSource.js` — Works out where an invoice came from (client, manual order, ecommerce, old, direct) and who created it.
- `utils/OrderNarrative.js` — Plain-English sentence describing where an order stands (for example "Paid, waiting to ship") and its colour style.
- `utils/StatementPdf.js` — Builds and downloads a customer statement PDF (all invoices, paid, due) in the Digident design.

### `src/constants/`

Fixed values: menus, themes, config, page CSS.

- `constants/AnalyticsConfig.js` — Fixed lists the Analytics page uses: status display order, funnel stages, radar metrics and location tabs.
- `constants/MuiTheme.js` — Material UI theme (light / dark) and the chart colour palettes.
- `constants/NavigationLinks.js` — Sidebar menu entries (label, icon, route).

## Documents

- `docs/CODING_STANDARDS.md` — how we write code here (read this first).
- `docs/FEATURE_MAP.md` — every screen and the components, hooks, helpers and API calls behind it.
- `docs/GLOSSARY.md` — business words (lead, client, credit note, settlement ...).
- `docs/quality/REPORT.md` — what was changed in the clean-up and how it was checked.
