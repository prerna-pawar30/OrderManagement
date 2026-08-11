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
};

// Builds the full invoice payload the API expects (billTo, per-item discount/GST,
// summary, dates) out of a manual order, filling anything the order doesn't
// track (discounts, GST, freight breakdown, terms) with neutral defaults.
export const buildInvoicePayloadFromOrder = (order) => {
  const addressParts = [
    order.billingAddress?.street,
    order.billingAddress?.area,
    order.billingAddress?.city,
    order.billingAddress?.state,
    order.billingAddress?.pincode,
    order.billingAddress?.country,
  ].filter(Boolean);

  const today = new Date();
  const dueDate = new Date(today.getTime() + 10 * 86400000);

  return {
    permission: PERMISSIONS.INVOICE_WRITE,
    orderId: order.orderId,
    orderRef: order._id,
    status: order.paymentStatus === "paid" ? "paid" : "issued",
    paymentTerms: "Payable due amount in 10 days",
    termsOfDelivery: "",
    shippingCondition: "Normal",
    customerServiceRep: "",
    invoiceDate: today.toISOString(),
    dueDate: dueDate.toISOString(),
    deliveryDate: null,
    billTo: {
      companyName: order.organizationName || order.customerName,
      contactPerson: order.customerName,
      contactNumber: order.customerPhone,
      address: addressParts.join(", "),
      gstin: order.gstNumber || "",
    },
    items: (order.items || []).map((i) => ({
      description: i.variantName ? `${i.productName} - ${i.variantName}` : i.productName,
      qty: i.quantity,
      price: i.price,
      discountPercent: 0,
      discountValue: 0,
      gstType: "IGST",
      gstPercent: 0,
    })),
    summary: {
      freightCost: order.shippingCharge || 0,
      paidAmount: order.paymentStatus === "paid" ? order.grandTotal || 0 : 0,
    },
  };
};

export const InvoiceService = {
  create: async (payload) => {
    const response = await apiClient.post(API_ROUTES.INVOICE.CREATE, payload);
    return response.data;
  },
};
