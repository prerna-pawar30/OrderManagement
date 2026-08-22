import apiClient from "./client";
import { API_ROUTES, PERMISSIONS } from "./ApiRoutes";

export const AuthService = {
  login: async (credentials) => {
    const response = await apiClient.post(API_ROUTES.AUTH.LOGIN, credentials);
    return response.data;
  },

  refreshToken: async () => {
    const response = await apiClient.post(API_ROUTES.AUTH.REFRESH_TOKEN);
    return response.data;
  },

  logout: async () => {
    // No dedicated logout route was supplied by the backend — this clears
    // client-side session state. Wire this to a real endpoint if one exists.
    return { success: true };
  },
};

export const EmployeeService = {
  getAllEmployees: async () => {
    const response = await apiClient.get(API_ROUTES.EMPLOYEE.GET_ALL);
    return response.data;
  },

  getEmployeeByEmail: async (email) => {
    const response = await apiClient.get(API_ROUTES.EMPLOYEE.GET_PROFILE(email));
    return response.data;
  },

  changePassword: async (passwords) => {
    const response = await apiClient.post(API_ROUTES.EMPLOYEE.CHANGE_PASSWORD, passwords);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post(API_ROUTES.EMPLOYEE.FORGOT_PASSWORD, { email });
    return response.data;
  },

  resetPassword: async (token, passwordData) => {
    const response = await apiClient.post(API_ROUTES.EMPLOYEE.RESET_PASSWORD(token), passwordData);
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await apiClient.post(API_ROUTES.EMPLOYEE.VERIFY_EMAIL(token));
    return response.data;
  },
};

export const ManualOrderService = {
  create: async (payload) => {
    const response = await apiClient.post(API_ROUTES.MANUAL_ORDER.CREATE, {
      permission: PERMISSIONS.ORDER_WRITE,
      ...payload,
    });
    return response.data;
  },

  getAll: async ({ page = 1, limit = 10 } = {}) => {
    const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.GET_ALL(page, limit));
    return response.data;
  },

  getOne: async (orderId) => {
    const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.GET_ONE(orderId));
    return response.data;
  },

  updateStatus: async (orderId, status) => {
    const response = await apiClient.patch(API_ROUTES.MANUAL_ORDER.STATUS_UPDATE(orderId), {
      permission: PERMISSIONS.ORDER_WRITE,
      status,
    });
    return response.data;
  },

  updatePaymentStatus: async (orderId, { paymentStatus, paymentMethod, paymentReference }) => {
    const response = await apiClient.patch(API_ROUTES.MANUAL_ORDER.PAYMENT_STATUS_UPDATE(orderId), {
      permission: PERMISSIONS.ORDER_WRITE,
      paymentStatus,
      paymentMethod,
      paymentReference,
    });
    return response.data;
  },

  cancel: async (orderId, reason) => {
    const response = await apiClient.put(API_ROUTES.MANUAL_ORDER.CANCEL(orderId), {
      permission: PERMISSIONS.ORDER_WRITE,
      reason,
    });
    return response.data;
  },

  updateCourier: async (orderId, { corourseServiceName, DOCNumber }) => {
    const response = await apiClient.put(API_ROUTES.MANUAL_ORDER.COURIER_UPDATE(orderId), {
      permission: PERMISSIONS.ORDER_WRITE,
      corourseServiceName,
      DOCNumber,
    });
    return response.data;
  },

  createReturn: async ({ orderId, returnItems, refundNow, refundMethod, notes }) => {
    const response = await apiClient.post(API_ROUTES.MANUAL_ORDER.RETURN_CREATE, {
      permission: PERMISSIONS.ORDER_WRITE,
      orderId,
      returnItems,
      refundNow,
      refundMethod,
      notes,
    });
    return response.data;
  },

  getAnalytics: async ({
    startDate,
    endDate,
    topLimit = 8,
    locationLimit = 8,
    includeCancelled = false,
    groupBy = "day",
  } = {}) => {
    const params = { topLimit, locationLimit, includeCancelled, groupBy };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.ANALYTICS(), { params });
    return response.data;
  },

  // Per-customer returns & balance ledger — who the company owes a refund
  // to, and who still owes the company money.
  getCustomerLedger: async ({ startDate, endDate, search, balanceStatus, sortBy } = {}) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (search) params.search = search;
    if (balanceStatus) params.balanceStatus = balanceStatus;
    if (sortBy) params.sortBy = sortBy;

    const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.CUSTOMER_LEDGER(), { params });
    return response.data;
  },

  // "Customer said they'll take it next time" (or a straight cash/UPI/bank
  // payout) — marks an order's pending refund as settled once it's
  // actually been paid back or applied as credit on a new order.
  settleCredit: async (orderId, { amount, method, reference, appliedToOrderId, notes } = {}) => {
    const response = await apiClient.put(API_ROUTES.MANUAL_ORDER.CREDIT_SETTLE(orderId), {
      permission: PERMISSIONS.ORDER_WRITE,
      amount,
      method,
      reference,
      appliedToOrderId,
      notes,
    });
    return response.data;
  },

  // Every credit note ever issued (method: "credit_note" entries across all
  // orders' refundHistory) — powers the dedicated Credit Notes page.
  getCreditNotes: async ({ search, startDate, endDate } = {}) => {
    const params = {};
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.CREDIT_NOTES(), { params });
    return response.data;
  },
};

// Invoices come from your existing real invoice backend — nothing there was
// touched. This service just calls it directly from the frontend at the
// right moments (order create, return).
export const InvoiceService = {
  createInvoice: async (payload) => {
    const response = await apiClient.post(API_ROUTES.INVOICE.CREATE, {
      permission: PERMISSIONS.INVOICE_CREATE,
      ...payload,
    });
    return response.data;
  },

  updateInvoice: async (invoiceId, data) => {
    const response = await apiClient.put(API_ROUTES.INVOICE.UPDATE(invoiceId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      ...data,
    });
    return response.data;
  },

  deleteInvoice: async (invoiceId) => {
    const response = await apiClient.delete(API_ROUTES.INVOICE.DELETE(invoiceId), {
      data: { permission: PERMISSIONS.INVOICE_UPDATE },
    });
    return response.data;
  },

  getInvoiceById: async (invoiceId) => {
    const res = await apiClient.get(API_ROUTES.INVOICE.GET_BY_ID(invoiceId));
    return res.data?.data || res.data;
  },

  getAllInvoices: async (page = 1, limit = 12) => {
    const res = await apiClient.get(API_ROUTES.INVOICE.GET_ALL(undefined, page, limit));
    const data = res.data?.data;
    return {
      invoices: data?.invoices || [],
      pagination: data?.pagination || { totalPages: 1, totalItems: data?.invoices?.length || 0, currentPage: page },
    };
  },

  getInvoicesByMonthYear: async (month, year, limit = 500) => {
    const res = await apiClient.get(API_ROUTES.INVOICE.GET_BY_MONTH_YEAR(), {
      params: { month, year, limit },
    });
    const data = res.data?.data;
    return data?.invoices || data || [];
  },

  getCustomers: async () => {
    try {
      const res = await apiClient.get(API_ROUTES.INVOICE.GET_CUSTOMERS);
      return res.data?.data || [];
    } catch (error) {
      console.error("InvoiceService Fetch Customers Error:", error);
      return [];
    }
  },

  getCustomerInvoicesById: async (customerNo) => {
    try {
      const res = await apiClient.get(API_ROUTES.INVOICE.GET_CUSTOMER_INVOICES_BY_ID(customerNo));
      return res.data?.data || [];
    } catch (error) {
      console.error("InvoiceService Fetch Customer Invoices Error:", error);
      return [];
    }
  },
};
