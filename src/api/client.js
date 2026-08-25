import axios from "axios";
import { API_ROUTES } from "./ApiRoutes";
import { tokenStorage, extractToken } from "./tokenStorage";

// withCredentials stays on in case the backend also sets a refresh cookie,
// but the access token in the Authorization header is what actually
// authorizes each request (the server responds AUTH_HEADER_MISSING without
// it), so it's attached on every outgoing call below.
const apiClient = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const flushQueue = (error) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRoute =
      originalRequest?.url === API_ROUTES.AUTH.LOGIN ||
      originalRequest?.url === API_ROUTES.AUTH.REFRESH_TOKEN;

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // queue requests while a refresh is already in flight
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshRes = await apiClient.post(API_ROUTES.AUTH.REFRESH_TOKEN);
        const newToken = extractToken(refreshRes.data);
        if (newToken) tokenStorage.set(newToken);
        flushQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError);
        tokenStorage.clear();
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
