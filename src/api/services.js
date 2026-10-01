// import apiClient from "./client";
// import { API_ROUTES, PERMISSIONS } from "./ApiRoutes";

// export const AuthService = {
//   login: async (credentials) => {
//     const response = await apiClient.post(API_ROUTES.AUTH.LOGIN, credentials);
//     return response.data;
//   },

//   refreshToken: async () => {
//     const response = await apiClient.post(API_ROUTES.AUTH.REFRESH_TOKEN);
//     return response.data;
//   },

//   logout: async () => {
//     // No dedicated logout route was supplied by the backend — this clears
//     // client-side session state. Wire this to a real endpoint if one exists.
//     return { success: true };
//   },
// };

// export const EmployeeService = {
//   getAllEmployees: async () => {
//     const response = await apiClient.get(API_ROUTES.EMPLOYEE.GET_ALL);
//     return response.data;
//   },

//   getEmployeeByEmail: async (email) => {
//     const response = await apiClient.get(API_ROUTES.EMPLOYEE.GET_PROFILE(email));
//     return response.data;
//   },

//   changePassword: async (passwords) => {
//     const response = await apiClient.post(API_ROUTES.EMPLOYEE.CHANGE_PASSWORD, passwords);
//     return response.data;
//   },

//   forgotPassword: async (email) => {
//     const response = await apiClient.post(API_ROUTES.EMPLOYEE.FORGOT_PASSWORD, { email });
//     return response.data;
//   },

//   resetPassword: async (token, passwordData) => {
//     const response = await apiClient.post(API_ROUTES.EMPLOYEE.RESET_PASSWORD(token), passwordData);
//     return response.data;
//   },

//   verifyEmail: async (token) => {
//     const response = await apiClient.post(API_ROUTES.EMPLOYEE.VERIFY_EMAIL(token));
//     return response.data;
//   },
// };

// export const ManualOrderService = {
//   create: async (payload) => {
//     const response = await apiClient.post(API_ROUTES.MANUAL_ORDER.CREATE, {
//       permission: PERMISSIONS.ORDER_WRITE,
//       ...payload,
//     });
//     return response.data;
//   },

//   getAll: async ({ page = 1, limit = 10 } = {}) => {
//     const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.GET_ALL(page, limit));
//     return response.data;
//   },

//   getOne: async (orderId) => {
//     const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.GET_ONE(orderId));
//     return response.data;
//   },

//   updateStatus: async (orderId, status) => {
//     const response = await apiClient.patch(API_ROUTES.MANUAL_ORDER.STATUS_UPDATE(orderId), {
//       permission: PERMISSIONS.ORDER_WRITE,
//       status,
//     });
//     return response.data;
//   },

//   updatePaymentStatus: async (orderId, { paymentStatus, paymentMethod, paymentReference }) => {
//     const response = await apiClient.patch(API_ROUTES.MANUAL_ORDER.PAYMENT_STATUS_UPDATE(orderId), {
//       permission: PERMISSIONS.ORDER_WRITE,
//       paymentStatus,
//       paymentMethod,
//       paymentReference,
//     });
//     return response.data;
//   },

//   cancel: async (orderId, reason) => {
//     const response = await apiClient.put(API_ROUTES.MANUAL_ORDER.CANCEL(orderId), {
//       permission: PERMISSIONS.ORDER_WRITE,
//       reason,
//     });
//     return response.data;
//   },

//   updateCourier: async (orderId, { corourseServiceName, DOCNumber }) => {
//     const response = await apiClient.put(API_ROUTES.MANUAL_ORDER.COURIER_UPDATE(orderId), {
//       permission: PERMISSIONS.ORDER_WRITE,
//       corourseServiceName,
//       DOCNumber,
//     });
//     return response.data;
//   },

//   createReturn: async ({ orderId, returnItems, refundNow, refundMethod, notes }) => {
//     const response = await apiClient.post(API_ROUTES.MANUAL_ORDER.RETURN_CREATE, {
//       permission: PERMISSIONS.ORDER_WRITE,
//       orderId,
//       returnItems,
//       refundNow,
//       refundMethod,
//       notes,
//     });
//     return response.data;
//   },

//   getAnalytics: async ({
//     startDate,
//     endDate,
//     topLimit = 8,
//     locationLimit = 8,
//     includeCancelled = false,
//     groupBy = "day",
//   } = {}) => {
//     const params = { topLimit, locationLimit, includeCancelled, groupBy };
//     if (startDate) params.startDate = startDate;
//     if (endDate) params.endDate = endDate;

//     const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.ANALYTICS(), { params });
//     return response.data;
//   },

//   // Per-customer returns & balance ledger — who the company owes a refund
//   // to, and who still owes the company money.
//   getCustomerLedger: async ({ startDate, endDate, search, balanceStatus, sortBy } = {}) => {
//     const params = {};
//     if (startDate) params.startDate = startDate;
//     if (endDate) params.endDate = endDate;
//     if (search) params.search = search;
//     if (balanceStatus) params.balanceStatus = balanceStatus;
//     if (sortBy) params.sortBy = sortBy;

//     const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.CUSTOMER_LEDGER(), { params });
//     return response.data;
//   },

//   // "Customer said they'll take it next time" (or a straight cash/UPI/bank
//   // payout) — marks an order's pending refund as settled once it's
//   // actually been paid back or applied as credit on a new order.
//   settleCredit: async (orderId, { amount, method, reference, appliedToOrderId, notes } = {}) => {
//     const response = await apiClient.put(API_ROUTES.MANUAL_ORDER.CREDIT_SETTLE(orderId), {
//       permission: PERMISSIONS.ORDER_WRITE,
//       amount,
//       method,
//       reference,
//       appliedToOrderId,
//       notes,
//     });
//     return response.data;
//   },

//   // Every credit note ever issued (method: "credit_note" entries across all
//   // orders' refundHistory) — powers the dedicated Credit Notes page.
//   getCreditNotes: async ({ search, startDate, endDate } = {}) => {
//     const params = {};
//     if (search) params.search = search;
//     if (startDate) params.startDate = startDate;
//     if (endDate) params.endDate = endDate;

//     const response = await apiClient.get(API_ROUTES.MANUAL_ORDER.CREDIT_NOTES(), { params });
//     return response.data;
//   },
// };

// // Invoices come from your existing real invoice backend — nothing there was
// // touched. This service just calls it directly from the frontend at the
// // right moments (order create, return).
// export const InvoiceService = {
//   createInvoice: async (payload) => {
//     const response = await apiClient.post(API_ROUTES.INVOICE.CREATE, {
//       permission: PERMISSIONS.INVOICE_CREATE,
//       ...payload,
//     });
//     return response.data;
//   },

//   updateInvoice: async (invoiceId, data) => {
//     const response = await apiClient.put(API_ROUTES.INVOICE.UPDATE(invoiceId), {
//       permission: PERMISSIONS.INVOICE_UPDATE,
//       ...data,
//     });
//     return response.data;
//   },

//   deleteInvoice: async (invoiceId) => {
//     const response = await apiClient.delete(API_ROUTES.INVOICE.DELETE(invoiceId), {
//       data: { permission: PERMISSIONS.INVOICE_UPDATE },
//     });
//     return response.data;
//   },

//   getInvoiceById: async (invoiceId) => {
//     const res = await apiClient.get(API_ROUTES.INVOICE.GET_BY_ID(invoiceId));
//     return res.data?.data || res.data;
//   },

//   getAllInvoices: async (page = 1, limit = 12) => {
//     const res = await apiClient.get(API_ROUTES.INVOICE.GET_ALL(undefined, page, limit));
//     const data = res.data?.data;
//     return {
//       invoices: data?.invoices || [],
//       pagination: data?.pagination || { totalPages: 1, totalItems: data?.invoices?.length || 0, currentPage: page },
//     };
//   },

//   getInvoicesByMonthYear: async (month, year, limit = 500) => {
//     const res = await apiClient.get(API_ROUTES.INVOICE.GET_BY_MONTH_YEAR(), {
//       params: { month, year, limit },
//     });
//     const data = res.data?.data;
//     return data?.invoices || data || [];
//   },

//   getCustomers: async () => {
//     try {
//       const res = await apiClient.get(API_ROUTES.INVOICE.GET_CUSTOMERS);
//       return res.data?.data || [];
//     } catch (error) {
//       console.error("InvoiceService Fetch Customers Error:", error);
//       return [];
//     }
//   },

//   getCustomerInvoicesById: async (customerNo) => {
//     try {
//       const res = await apiClient.get(API_ROUTES.INVOICE.GET_CUSTOMER_INVOICES_BY_ID(customerNo));
//       return res.data?.data || [];
//     } catch (error) {
//       console.error("InvoiceService Fetch Customer Invoices Error:", error);
//       return [];
//     }
//   },
// };

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

  // "Customer said they'll take it next time" (or a straight cash/UPI/bank
  // payout) — marks an invoice's pending refund as settled once it's
  // actually been paid back or applied as credit on a new order/invoice.
  // Works for a manual-order invoice, an ecommerce invoice, or a standalone
  // invoice alike — pass that invoice's invoiceId (order.invoiceId for a
  // manual order, invoice.invoiceId for a standalone one).
  settleCredit: async (invoiceId, { amount, method, reference, appliedToOrderId, notes } = {}) => {
    const response = await apiClient.put(API_ROUTES.INVOICE.CREDIT_SETTLE(invoiceId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      amount,
      method,
      reference,
      appliedToOrderId,
      notes,
    });
    return response.data;
  },

  // Every credit note ever issued (method: "credit_note" entries across all
  // invoices' refundHistory) — powers the dedicated Credit Notes page.
  getCreditNotes: async ({ search, startDate, endDate } = {}) => {
    const params = {};
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // Credit notes now live in their own collection — read from there.
    const response = await apiClient.get(API_ROUTES.CREDIT_NOTE.GET_ALL(), { params });
    return response.data;
  },

  // Search invoices by number / company / order no. (credit note picker).
  searchInvoices: async (search, limit = 10) => {
    const res = await apiClient.get(API_ROUTES.INVOICE.GET_BY_MONTH_YEAR(), {
      params: { search, limit },
    });
    const data = res.data?.data;
    return data?.invoices || [];
  },

  // Record a return directly on a STANDALONE invoice (sourceOrderId ===
  // null) — the customer called in, staff pulls up the invoice created via
  // "Create Invoice", and picks which line items/quantities came back.
  createReturn: async (invoiceId, { returnItems, refundNow, refundMethod, reference, notes } = {}) => {
    const response = await apiClient.post(API_ROUTES.INVOICE.RETURN_CREATE(invoiceId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      returnItems,
      refundNow,
      refundMethod,
      reference,
      notes,
    });
    return response.data;
  },

  // "Check credit" — every invoice (manual-order, ecommerce, or standalone)
  // that still owes this phone number money right now (not yet settled).
  // Used at order/invoice-creation time to apply that pending amount as a
  // discount and settle it in the same step ("Tarika A" — never settle a
  // return on its own; leave it pending until the next order/invoice
  // actually exists to apply it to).
  checkCredit: async (phone) => {
    const response = await apiClient.get(API_ROUTES.INVOICE.CREDIT_LOOKUP(phone));
    return response.data;
  },
};

/* =============================================================================
   CREDIT NOTES — own module, same shape as InvoiceService.
   A credit note is made either by hand (create) or from an invoice's pending
   refund (createFromInvoice / settleCredit with method "credit_note"), then
   used up by apply (discount on a new order/invoice) or refund (pay back).
   ============================================================================= */
export const CreditNoteService = {
  // By hand. payload: { invoiceId?, billTo?, reason, items? | amount, gstPercent?,
  //                     creditNoteDate?, notes?, refundMethod?, reference? }
  create: async (payload) => {
    const response = await apiClient.post(API_ROUTES.CREDIT_NOTE.CREATE, {
      permission: PERMISSIONS.INVOICE_CREATE,
      ...payload,
    });
    return response.data;
  },

  // From an invoice's pending refund. { amount, appliedToOrderId?, notes? }
  createFromInvoice: async (invoiceId, { amount, appliedToOrderId, notes } = {}) => {
    const response = await apiClient.post(API_ROUTES.CREDIT_NOTE.CREATE_FROM_INVOICE(invoiceId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      amount,
      appliedToOrderId,
      notes,
    });
    return response.data;
  },

  // { search, startDate, endDate, status, type, invoiceId, phone, page, limit }
  getAll: async (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
    const response = await apiClient.get(API_ROUTES.CREDIT_NOTE.GET_ALL(), { params: clean });
    return response.data;
  },

  getById: async (creditNoteId) => {
    const response = await apiClient.get(API_ROUTES.CREDIT_NOTE.GET_BY_ID(creditNoteId));
    return response.data?.data || response.data;
  },

  // Use as a discount on a new order/invoice (appliedToId = orderId or invoiceId)
  apply: async (creditNoteId, { amount, appliedToId, notes } = {}) => {
    const response = await apiClient.put(API_ROUTES.CREDIT_NOTE.APPLY(creditNoteId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      amount,
      appliedToId,
      notes,
    });
    return response.data;
  },

  // This customer's invoices that still have an amount due (same phone).
  getApplyTargets: async (creditNoteId) => {
    const response = await apiClient.get(API_ROUTES.CREDIT_NOTE.APPLY_TARGETS(creditNoteId));
    return response.data;
  },

  // Use the credit as PAYMENT on an existing unpaid invoice (its amount due
  // goes down). amount is optional — defaults to min(credit left, amount due).
  applyToInvoice: async (creditNoteId, { invoiceId, amount } = {}) => {
    const response = await apiClient.put(API_ROUTES.CREDIT_NOTE.APPLY_TO_INVOICE(creditNoteId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      invoiceId,
      amount,
    });
    return response.data;
  },

  // Pay it back. method: cash | upi | bank_transfer | card | other
  refund: async (creditNoteId, { amount, method, reference, notes } = {}) => {
    const response = await apiClient.put(API_ROUTES.CREDIT_NOTE.REFUND(creditNoteId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      amount,
      method,
      reference,
      notes,
    });
    return response.data;
  },

  // Only an unused manual credit note.
  cancel: async (creditNoteId, reason) => {
    const response = await apiClient.put(API_ROUTES.CREDIT_NOTE.CANCEL(creditNoteId), {
      permission: PERMISSIONS.INVOICE_UPDATE,
      reason,
    });
    return response.data;
  },

  // "Check credit" returns two kinds of sources — an invoice with a refund
  // still pending (kind "invoice") or an open credit note (kind
  // "credit_note"). This spends `amount` from either kind on the new
  // order/invoice, so CreateOrderPage / CreateInvoicePage don't care which.
  useCreditSource: async (source, { amount, appliedToId, notes } = {}) => {
    if (source.kind === "credit_note" && source.creditNoteId) {
      return CreditNoteService.apply(source.creditNoteId, { amount, appliedToId, notes });
    }
    return InvoiceService.settleCredit(source.invoiceId, {
      amount,
      method: "credit_note",
      appliedToOrderId: appliedToId,
      notes,
    });
  },
};
