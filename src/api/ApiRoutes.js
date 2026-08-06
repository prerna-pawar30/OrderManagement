const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const VERSION = "/api/v1";
const FULL_API_PATH = `${BASE_URL}${VERSION}`;

// checkPermission reads a `:permission` slug from the URL for GET routes and
// from the body for everything else (see manualOrder.routes.js). Adjust
// these slugs to whatever your permission records are actually named.
export const PERMISSIONS = {
  ORDER_READ: "order-get",
  ORDER_WRITE: "Order-create",
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
    CANCEL: (orderId) => `${FULL_API_PATH}/manual-order/cancel/${orderId}`,
    COURIER_UPDATE: (orderId) => `${FULL_API_PATH}/manual-order/courier/${orderId}`,
    RETURN_CREATE: `${FULL_API_PATH}/manual-order/return`,
  },
  INVOICE: {
    CREATE: `${FULL_API_PATH}/invoice/create`,
  },
};
