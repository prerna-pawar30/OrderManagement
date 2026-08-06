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
};

export const InvoiceService = {
  create: async (payload) => {
    const response = await apiClient.post(API_ROUTES.INVOICE.CREATE, payload);
    return response.data;
  },
};
