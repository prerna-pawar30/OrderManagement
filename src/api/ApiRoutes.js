// const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
// const VERSION = "/api/v1";
// const FULL_API_PATH = `${BASE_URL}${VERSION}`;

// // checkPermission reads a `:permission` slug from the URL for GET routes and
// // from the body for everything else (see manualOrder.routes.js). Adjust
// // these slugs to whatever your permission records are actually named.
// export const PERMISSIONS = {
//   ORDER_READ: "order-get",
//   ORDER_WRITE: "Order-create",
//   INVOICE_READ: "invoice.manage.read", // TODO: confirm this permission slug matches what's in your Permission collection
//   INVOICE_CREATE: "invoice.manage.create",
//   INVOICE_UPDATE: "invoice.manage.update",
// };

// // Every value here is a full, absolute URL (protocol + host + /api/v1 + path).
// // Axios ignores its own baseURL whenever the url passed to it is already
// // absolute, so building routes this way makes it impossible to accidentally
// // end up with a doubled-up /api/v1/api/v1 prefix again.
// export const API_ROUTES = {
//   AUTH: {
//     LOGIN: `${FULL_API_PATH}/employee/login`,
//     REFRESH_TOKEN: `${FULL_API_PATH}/employee/refresh-token`,
//   },
//   EMPLOYEE: {
//     GET_ALL: `${FULL_API_PATH}/employee/get`,
//     CHANGE_PASSWORD: `${FULL_API_PATH}/employee/change-password`,
//     FORGOT_PASSWORD: `${FULL_API_PATH}/employee/forget-password`,
//     RESET_PASSWORD: (token) => `${FULL_API_PATH}/employee/reset-password/${token}`,
//     VERIFY_EMAIL: (token) => `${FULL_API_PATH}/employee/verify-email/${token}`,
//     GET_PROFILE: (email) => `${FULL_API_PATH}/employee/get/${email}`,
//   },
//   MANUAL_ORDER: {
//     CREATE: `${FULL_API_PATH}/manual-order/create`,
//     GET_ALL: (page = 1, limit = 10, permission = PERMISSIONS.ORDER_READ) =>
//       `${FULL_API_PATH}/manual-order/get/all/${permission}?page=${page}&limit=${limit}`,
//     GET_ONE: (orderId, permission = PERMISSIONS.ORDER_READ) =>
//       `${FULL_API_PATH}/manual-order/get/${orderId}/${permission}`,
//     STATUS_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/status/${orderId}`,
//     PAYMENT_STATUS_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/payment-status/${orderId}`,
//     CANCEL: (orderId) => `${FULL_API_PATH}/manual-order/cancel/${orderId}`,
//     COURIER_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/courier/${orderId}`,
//     RETURN_CREATE: `${FULL_API_PATH}/manual-order/return`,
//     ANALYTICS: (permission = PERMISSIONS.ORDER_READ) =>
//       `${FULL_API_PATH}/manual-order/analytics/${permission}`,
//     CUSTOMER_LEDGER: (permission = PERMISSIONS.ORDER_READ) =>
//       `${FULL_API_PATH}/manual-order/ledger/${permission}`,
//     CREDIT_SETTLE: (orderId) => `${FULL_API_PATH}/manual-order/credit-settle/${orderId}`,
//     CREDIT_NOTES: (permission = PERMISSIONS.ORDER_READ) =>
//       `${FULL_API_PATH}/manual-order/credit-notes/${permission}`,
//   },
//   INVOICE: {
//     // Real invoice backend — untouched. Called directly from the frontend.
//     CREATE: `${FULL_API_PATH}/invoice/manage/create`,
//     UPDATE: (invoiceId) => `${FULL_API_PATH}/invoice/manage/update/${invoiceId}`,
//     DELETE: (invoiceId) => `${FULL_API_PATH}/invoice/manage/delete/${invoiceId}`,
//     GET_BY_ID: (invoiceId, permission = PERMISSIONS.INVOICE_READ) =>
//       `${FULL_API_PATH}/invoice/manage/get/${invoiceId}/${permission}`,
//     GET_ALL: (permission = PERMISSIONS.INVOICE_READ, page = 1, limit = 20) =>
//       `${FULL_API_PATH}/invoice/manage/get/${permission}?page=${page}&limit=${limit}`,
//     GET_BY_MONTH_YEAR: (permission = PERMISSIONS.INVOICE_READ) =>
//       `${FULL_API_PATH}/invoice/manage/get/${permission}`,
//     GET_CUSTOMERS: `${FULL_API_PATH}/invoice/customers`,
//     GET_CUSTOMER_INVOICES_BY_ID: (customerNo) => `${FULL_API_PATH}/invoice/customer/${customerNo}`,
//   },
// };

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const VERSION = "/api/v1";
const FULL_API_PATH = `${BASE_URL}${VERSION}`;

// checkPermission reads a `:permission` slug from the URL for GET routes and
// from the body for everything else (see manualOrder.routes.js). Adjust
// these slugs to whatever your permission records are actually named.
export const PERMISSIONS = {
  ORDER_READ: "order-get",
  ORDER_WRITE: "Order-create",
  INVOICE_READ: "invoice.manage.read", // TODO: confirm this permission slug matches what's in your Permission collection
  INVOICE_CREATE: "invoice.manage.create",
  INVOICE_UPDATE: "invoice.manage.update",
};

// Every value here is a full, absolute URL (protocol + host + /api/v1 + path).
// Axios ignores its own baseURL whenever the url passed to it is already
// absolute, so building routes this way makes it impossible to accidentally
// end up with a doubled-up /api/v1/api/v1 prefix again.
export const API_ROUTES = {
  AUTH: {
    LOGIN: `${FULL_API_PATH}/employee/login`,
    REFRESH_TOKEN: `${FULL_API_PATH}/employee/refresh-token`,
  },
  EMPLOYEE: {
    GET_ALL: `${FULL_API_PATH}/employee/get`,
    CHANGE_PASSWORD: `${FULL_API_PATH}/employee/change-password`,
    FORGOT_PASSWORD: `${FULL_API_PATH}/employee/forget-password`,
    RESET_PASSWORD: (token) => `${FULL_API_PATH}/employee/reset-password/${token}`,
    VERIFY_EMAIL: (token) => `${FULL_API_PATH}/employee/verify-email/${token}`,
    GET_PROFILE: (email) => `${FULL_API_PATH}/employee/get/${email}`,
  },
  MANUAL_ORDER: {
    CREATE: `${FULL_API_PATH}/manual-order/create`,
    GET_ALL: (page = 1, limit = 10, permission = PERMISSIONS.ORDER_READ) =>
      `${FULL_API_PATH}/manual-order/get/all/${permission}?page=${page}&limit=${limit}`,
    GET_ONE: (orderId, permission = PERMISSIONS.ORDER_READ) =>
      `${FULL_API_PATH}/manual-order/get/${orderId}/${permission}`,
    STATUS_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/status/${orderId}`,
    PAYMENT_STATUS_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/payment-status/${orderId}`,
    CANCEL: (orderId) => `${FULL_API_PATH}/manual-order/cancel/${orderId}`,
    COURIER_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/courier/${orderId}`,
    RETURN_CREATE: `${FULL_API_PATH}/manual-order/return`,
    ANALYTICS: (permission = PERMISSIONS.ORDER_READ) =>
      `${FULL_API_PATH}/manual-order/analytics/${permission}`,
    CUSTOMER_LEDGER: (permission = PERMISSIONS.ORDER_READ) =>
      `${FULL_API_PATH}/manual-order/ledger/${permission}`,
    // Credit-note settlement + the credit notes list now live on the
    // Invoice itself (INVOICE.CREDIT_SETTLE / INVOICE.CREDIT_NOTES below) —
    // refunds are tracked on the Invoice regardless of whether it came from
    // a manual order, an ecommerce order, or was created directly. These
    // manual-order-specific routes no longer exist on the backend.
  },
  INVOICE: {
    // Real invoice backend — untouched. Called directly from the frontend.
    CREATE: `${FULL_API_PATH}/invoice/manage/create`,
    UPDATE: (invoiceId) => `${FULL_API_PATH}/invoice/manage/update/${invoiceId}`,
    DELETE: (invoiceId) => `${FULL_API_PATH}/invoice/manage/delete/${invoiceId}`,
    GET_BY_ID: (invoiceId, permission = PERMISSIONS.INVOICE_READ) =>
      `${FULL_API_PATH}/invoice/manage/get/${invoiceId}/${permission}`,
    GET_ALL: (permission = PERMISSIONS.INVOICE_READ, page = 1, limit = 20) =>
      `${FULL_API_PATH}/invoice/manage/get/${permission}?page=${page}&limit=${limit}`,
    GET_BY_MONTH_YEAR: (permission = PERMISSIONS.INVOICE_READ) =>
      `${FULL_API_PATH}/invoice/manage/get/${permission}`,
    GET_CUSTOMERS: `${FULL_API_PATH}/invoice/customers`,
    GET_CUSTOMER_INVOICES_BY_ID: (customerNo) => `${FULL_API_PATH}/invoice/customer/${customerNo}`,

    // NEW — credit-note settlement. Works for a manual-order invoice, an
    // ecommerce invoice, and a standalone ("Create Invoice") invoice alike,
    // since refunds are tracked on the Invoice itself now.
    CREDIT_SETTLE: (invoiceId) => `${FULL_API_PATH}/invoice/manage/credit-settle/${invoiceId}`,
    // NEW — every credit note issued across all invoices, for the Credit
    // Notes page.
    CREDIT_NOTES: (permission = PERMISSIONS.INVOICE_READ) =>
      `${FULL_API_PATH}/invoice/manage/credit-notes/${permission}`,
    // NEW — record a return directly on a STANDALONE invoice
    // (sourceOrderId === null). Manual-order invoices use
    // MANUAL_ORDER.RETURN_CREATE instead; ecommerce invoices use the
    // ecommerce return-request flow.
    RETURN_CREATE: (invoiceId) => `${FULL_API_PATH}/invoice/manage/return/${invoiceId}`,
    // NEW — "Check credit": every invoice (manual/ecommerce/standalone)
    // that still owes this phone number money right now.
    CREDIT_LOOKUP: (phone) => `${FULL_API_PATH}/invoice/manage/credit-lookup/${encodeURIComponent(phone)}`,
  },

  // NEW — Credit notes have their own model/service/controller/routes now,
  // same as invoices (backend mounted at /api/v1/credit-note).
  CREDIT_NOTE: {
    CREATE: `${FULL_API_PATH}/credit-note/manage/create`,
    CREATE_FROM_INVOICE: (invoiceId) => `${FULL_API_PATH}/credit-note/manage/from-invoice/${invoiceId}`,
    GET_ALL: (permission = PERMISSIONS.INVOICE_READ) => `${FULL_API_PATH}/credit-note/manage/get/${permission}`,
    GET_BY_ID: (creditNoteId, permission = PERMISSIONS.INVOICE_READ) =>
      `${FULL_API_PATH}/credit-note/manage/get/${encodeURIComponent(creditNoteId)}/${permission}`,
    APPLY: (creditNoteId) => `${FULL_API_PATH}/credit-note/manage/apply/${creditNoteId}`,
    // one-screen flow: this customer's unpaid invoices + apply onto one of them
    APPLY_TARGETS: (creditNoteId, permission = PERMISSIONS.INVOICE_READ) =>
      `${FULL_API_PATH}/credit-note/manage/apply-targets/${creditNoteId}/${permission}`,
    APPLY_TO_INVOICE: (creditNoteId) => `${FULL_API_PATH}/credit-note/manage/apply-to-invoice/${creditNoteId}`,
    REFUND: (creditNoteId) => `${FULL_API_PATH}/credit-note/manage/refund/${creditNoteId}`,
    CANCEL: (creditNoteId) => `${FULL_API_PATH}/credit-note/manage/cancel/${creditNoteId}`,
  },
};
