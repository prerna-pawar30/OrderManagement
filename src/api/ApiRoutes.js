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
    CREDIT_SETTLE: (orderId) => `${FULL_API_PATH}/manual-order/credit-settle/${orderId}`,
    CREDIT_NOTES: (permission = PERMISSIONS.ORDER_READ) =>
      `${FULL_API_PATH}/manual-order/credit-notes/${permission}`,
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
  },
};
