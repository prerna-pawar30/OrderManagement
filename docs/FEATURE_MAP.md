# Feature map — Digident Manual Order Console

For every screen: where it lives, what it is built from and which API calls it makes (including calls made by its components). Generated from the code; regenerate after big changes.

## AnalyticsPage

Analytics dashboard: revenue, orders, statuses, funnel, products and locations for a date range (manual orders + direct invoices).

- **File:** `pages/AnalyticsPage.jsx`
- **Opened by:** `/analytics`
- **Components:** `components/dashboard/CenterLabelDonut.jsx`, `components/dashboard/ChartCard.jsx`, `components/dashboard/FulfillmentFunnel.jsx`, `components/dashboard/IconStatTile.jsx`, `components/dashboard/LocationLeaderboard.jsx`, `components/dashboard/RadialTickRing.jsx`, `components/dashboard/StageTile.jsx`, `components/dashboard/WelcomeBanner.jsx`
- **Hooks:** `hooks/UseIsMobile.js`
- **Helpers:** `utils/Format.js`, `utils/InvoiceAnalytics.js`, `utils/InvoiceCustomers.js`
- **Constants:** `constants/AnalyticsConfig.js`, `constants/MuiTheme.js`
- **Shared state:** `context/AuthContext.jsx`, `context/ThemeContext.jsx`
- **API calls:** `InvoiceService.getAllInvoices`, `ManualOrderService.getAnalytics`

## CreateInvoicePage

Form to create a standalone tax invoice: pick or type a client, add items, apply available credit, and submit.

- **File:** `pages/CreateInvoicePage.jsx`
- **Opened by:** `/invoices/create`
- **Components:** `components/ui/DropdownGroup.jsx`
- **API calls:** `CreditNoteService.applyCreditSource`, `InvoiceService.checkCredit`, `InvoiceService.createInvoice`, `InvoiceService.searchClients`

## CreateOrderPage

Form to create a manual order (customer, addresses, items, optional credit as discount); the backend then creates its invoice.

- **File:** `pages/CreateOrderPage.jsx`
- **Opened by:** `/orders/new`
- **Components:** `components/ui/FormField.jsx`
- **Helpers:** `utils/Format.js`, `utils/InvoiceHelpers.js`
- **API calls:** `CreditNoteService.applyCreditSource`, `InvoiceService.checkCredit`, `ManualOrderService.create`

## CreditNotesPage

List of all credit notes with filters; open one to apply, refund or cancel it, or create a new one.

- **File:** `pages/CreditNotesPage.jsx`
- **Opened by:** `/credit-notes`
- **Components:** `components/creditnote/CreateCreditNoteModal.jsx`, `components/creditnote/CreditNoteDetailModal.jsx`, `components/creditnote/InvoicePicker.jsx`, `components/ui/FormField.jsx`
- **Helpers:** `utils/CreditNotePdf.js`, `utils/CreditNoteRules.js`, `utils/Format.js`
- **API calls:** `CreditNoteService.applyToInvoice`, `CreditNoteService.cancel`, `CreditNoteService.create`, `CreditNoteService.getAll`, `CreditNoteService.getApplyTargets`, `CreditNoteService.refund`, `InvoiceService.searchInvoices`

## CustomerDetailPage

One customer's page: summary numbers, orders, invoices, credit notes, statement and PDF downloads.

- **File:** `pages/CustomerDetailPage.jsx`
- **Opened by:** `/customers/:phone`
- **Components:** `components/creditnote/CreateCreditNoteModal.jsx`, `components/creditnote/CreditNoteDetailModal.jsx`, `components/creditnote/InvoicePicker.jsx`, `components/customer/EmptyRow.jsx`, `components/customer/InvoicePdfButton.jsx`, `components/customer/MiniStat.jsx`, `components/customer/Section.jsx`, `components/customer/SummaryCard.jsx`, `components/invoice/InvoiceDetailModal.jsx`, `components/invoice/InvoiceTableRow.jsx`, `components/invoice/RecordInvoiceReturnModal.jsx`, `components/invoice/SettleInvoiceCreditModal.jsx`, `components/order/StatusBadge.jsx`, `components/ui/FormField.jsx`
- **Helpers:** `utils/CreditNotePdf.js`, `utils/CreditNoteRules.js`, `utils/Format.js`, `utils/InvoicePdf.js`, `utils/InvoiceSource.js`, `utils/StatementPdf.js`
- **API calls:** `CreditNoteService.applyToInvoice`, `CreditNoteService.cancel`, `CreditNoteService.create`, `CreditNoteService.getAll`, `CreditNoteService.getApplyTargets`, `CreditNoteService.refund`, `InvoiceService.createReturn`, `InvoiceService.getInvoiceById`, `InvoiceService.searchInvoices`, `InvoiceService.settleCredit`, `ManualOrderService.getCustomerLedger`

## CustomerLedgerPage

Who owes whom: every customer's balance worked out from their invoices, with filters and a drawer per customer.

- **File:** `pages/CustomerLedgerPage.jsx`
- **Opened by:** `/customer-ledger`
- **Components:** `components/customer/CustomerLedgerDrawer.jsx`, `components/order/StatusBadge.jsx`
- **Helpers:** `utils/Format.js`, `utils/InvoiceCustomers.js`
- **API calls:** `InvoiceService.getAllInvoices`, `InvoiceService.getCustomers`

## InvoiceListPage

All invoices grouped by customer, with source tabs (client / manual order / ecommerce / old / direct), agent filter, fuzzy search, PDF, statement and Excel export.

- **File:** `pages/InvoiceListPage.jsx`
- **Opened by:** `/invoices`
- **Components:** `components/creditnote/CreateCreditNoteModal.jsx`, `components/creditnote/InvoicePicker.jsx`, `components/invoice/CustomerGroup.jsx`, `components/invoice/InvoiceDetailModal.jsx`, `components/invoice/InvoiceRow.jsx`, `components/invoice/InvoiceTableRow.jsx`, `components/invoice/LgButton.jsx`, `components/invoice/MonthYearExcelExport.jsx`, `components/invoice/RecordInvoiceReturnModal.jsx`, `components/invoice/SettleInvoiceCreditModal.jsx`, `components/invoice/UpdateInvoiceModal.jsx`, `components/ui/DropdownGroup.jsx`, `components/ui/FormField.jsx`
- **Hooks:** `hooks/UseDebounced.js`
- **Helpers:** `utils/CreditNotePdf.js`, `utils/CreditNoteRules.js`, `utils/Format.js`, `utils/FuzzyMatch.js`, `utils/InvoiceExcelReport.js`, `utils/InvoiceListHelpers.js`, `utils/InvoiceSource.js`, `utils/StatementPdf.js`
- **API calls:** `CreditNoteService.create`, `CreditNoteService.getAll`, `InvoiceService.createReturn`, `InvoiceService.getAllInvoices`, `InvoiceService.getCustomerInvoicesById`, `InvoiceService.getCustomers`, `InvoiceService.getInvoiceById`, `InvoiceService.getInvoicesByMonthYear`, `InvoiceService.searchInvoices`, `InvoiceService.settleCredit`, `InvoiceService.updateInvoice`

## LoginPage

Staff sign-in screen.

- **File:** `pages/LoginPage.jsx`
- **Opened by:** `/login`
- **Shared state:** `context/AuthContext.jsx`

## OrdersListPage

Table of manual orders with search, status / payment actions, courier, returns and invoice PDF; opens OrderDetailDrawer.

- **File:** `pages/OrdersListPage.jsx`
- **Opened by:** `/orders`
- **Components:** `components/creditnote/SettleRefundModal.jsx`, `components/invoice/MarkPaidModal.jsx`, `components/invoice/PaymentActionMenu.jsx`, `components/order/CancelOrderModal.jsx`, `components/order/CourierAssignModal.jsx`, `components/order/OrderDetailDrawer.jsx`, `components/order/OrderProgressTracker.jsx`, `components/order/OrderTotal.jsx`, `components/order/ReturnOrderModal.jsx`, `components/order/StatusActionMenu.jsx`, `components/order/StatusBadge.jsx`, `components/ui/FormField.jsx`
- **Hooks:** `hooks/UsePopover.js`
- **Helpers:** `utils/CreditNotePdf.js`, `utils/Format.js`, `utils/InvoiceCustomers.js`, `utils/InvoiceHelpers.js`, `utils/InvoicePdf.js`, `utils/OrderNarrative.js`
- **Constants:** `constants/MuiTheme.js`
- **API calls:** `InvoiceService.getAllInvoices`, `InvoiceService.getInvoiceById`, `InvoiceService.settleCredit`, `ManualOrderService.cancel`, `ManualOrderService.createReturn`, `ManualOrderService.getAll`, `ManualOrderService.getOne`, `ManualOrderService.updateCourier`, `ManualOrderService.updatePaymentStatus`, `ManualOrderService.updateStatus`
