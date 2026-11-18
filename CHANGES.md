# Restructure to Frontend Architecture Standards v1.0.0

No business logic was changed. Files were moved/renamed and every import updated.

## Moved / renamed (old → new)

- `src/assets/QR.png` → `src/assets/BankQr.png`
- `src/assets/digident-png .png` → `src/assets/DigidentLogo.png`
- `src/assets/digident-png 2.png` → `src/assets/DigidentLogoWatermark.png`
- `src/api/ApiRoutes.js` → `src/backend/ApiRoutes.js`
- `src/api/services.js` → `src/backend/ApiService.js`
- `src/components/CreateCreditNoteModal.jsx` → `src/components/creditnote/CreateCreditNoteModal.jsx`
- `src/components/CreditNoteDetailModal.jsx` → `src/components/creditnote/CreditNoteDetailModal.jsx`
- `src/components/SettleRefundModal.jsx` → `src/components/creditnote/SettleRefundModal.jsx`
- `src/components/CustomerLedgerDrawer.jsx` → `src/components/customer/CustomerLedgerDrawer.jsx`
- `src/components/FulfillmentFunnel.jsx` → `src/components/dashboard/FulfillmentFunnel.jsx`
- `src/components/RadialTickRing.jsx` → `src/components/dashboard/RadialTickRing.jsx`
- `src/components/WelcomeBanner.jsx` → `src/components/dashboard/WelcomeBanner.jsx`
- `src/pages/invoices/InvoiceDetailModal.jsx` → `src/components/invoice/InvoiceDetailModal.jsx`
- `src/pages/invoices/InvoiceTableRow.jsx` → `src/components/invoice/InvoiceTableRow.jsx`
- `src/components/MarkPaidModal.jsx` → `src/components/invoice/MarkPaidModal.jsx`
- `src/pages/invoices/Monthyearexcelexport.jsx` → `src/components/invoice/MonthYearExcelExport.jsx`
- `src/components/PaymentActionMenu.jsx` → `src/components/invoice/PaymentActionMenu.jsx`
- `src/components/RecordInvoiceReturnModal.jsx` → `src/components/invoice/RecordInvoiceReturnModal.jsx`
- `src/components/SettleInvoiceCreditModal.jsx` → `src/components/invoice/SettleInvoiceCreditModal.jsx`
- `src/pages/UpdateInvoiceModal.jsx` → `src/components/invoice/UpdateInvoiceModal.jsx`
- `src/layout/DashboardLayout.jsx` → `src/components/layout/DashboardLayout.jsx`
- `src/layout/Header.jsx` → `src/components/layout/Header.jsx`
- `src/layout/Sidebar.jsx` → `src/components/layout/Sidebar.jsx`
- `src/components/CancelOrderModal.jsx` → `src/components/order/CancelOrderModal.jsx`
- `src/components/CourierAssignModal.jsx` → `src/components/order/CourierAssignModal.jsx`
- `src/components/OrderDetailDrawer.jsx` → `src/components/order/OrderDetailDrawer.jsx`
- `src/components/OrderProgressTracker.jsx` → `src/components/order/OrderProgressTracker.jsx`
- `src/components/ReturnOrderModal.jsx` → `src/components/order/ReturnOrderModal.jsx`
- `src/components/StatusActionMenu.jsx` → `src/components/order/StatusActionMenu.jsx`
- `src/components/StatusBadge.jsx` → `src/components/order/StatusBadge.jsx`
- `src/components/FormField.jsx` → `src/components/ui/FormField.jsx`
- `src/theme/muiTheme.js` → `src/constants/MuiTheme.js`
- `src/components/usePopover.js` → `src/hooks/UsePopover.js`
- `src/pages/invoices/InvoiceListPage.jsx` → `src/pages/InvoiceListPage.jsx`
- `src/lib/generateCreditNotePdf.js` → `src/utils/CreditNotePdf.js`
- `src/lib/format.js` → `src/utils/Format.js`
- `src/lib/Fuzzymatch.js` → `src/utils/FuzzyMatch.js`
- `src/lib/invoiceAnalytics.js` → `src/utils/InvoiceAnalytics.js`
- `src/lib/invoiceCustomers.js` → `src/utils/InvoiceCustomers.js`
- `src/lib/invoiceHelpers.js` → `src/utils/InvoiceHelpers.js`
- `src/lib/generateInvoicePdf.js` → `src/utils/InvoicePdf.js`
- `src/lib/Invoicesource.js` → `src/utils/InvoiceSource.js`
- `src/lib/generateStatementPdf.js` → `src/utils/StatementPdf.js`

## Deleted (unused or duplicate)

- `public/digident-manual-orders (1).code-workspace`
- `src/api/client.js` (merged into `src/backend/ApiService.js`)
- `src/api/tokenStorage.js` (merged into `src/backend/ApiService.js`)
- `src/components/SalesLocationMap.jsx`
- `src/components/ui/Pagination.jsx`
- `src/pages/invoices/CustomerGroupItem.jsx`
- `src/pages/invoices/InvoiceSearch.jsx`

## Added

- `src/constants/NavigationLinks.js`
- `src/routes/AppRoutes.jsx`
