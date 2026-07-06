import axios from "axios";

const PORTAL_TOKEN_COOKIE = "portal_token";
const API_MODE_STORAGE_KEY = "tripnest_api_mode";
const API_MODE_EVENT = "tripnest-api-mode-change";
const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
const FAILOVER_API_URL = process.env.NEXT_PUBLIC_FAILOVER_API_URL ?? "http://localhost:8000/api/v1";

function clearPortalTokenCookie() {
  document.cookie = `${PORTAL_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function setApiMode(mode: "PRIMARY" | "PHP_FAILOVER") {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(API_MODE_EVENT, { detail: mode }));
}

function shouldRetryOnFailover(err: any) {
  const status = err.response?.status;
  return !err.config?._failoverTried && (!err.response || err.code === "ECONNABORTED" || status >= 500);
}

const api = axios.create({
  baseURL: PRIMARY_API_URL,
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("portal_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => {
    setApiMode(r.config.baseURL === FAILOVER_API_URL ? "PHP_FAILOVER" : "PRIMARY");
    return r;
  },
  (err) => {
    const isLoginRequest = err.config?.url?.includes("/auth/login");

    if (err.response?.status === 401 && !isLoginRequest && typeof window !== "undefined") {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      clearPortalTokenCookie();
      window.location.href = "/login";
    }

    if (!isLoginRequest && shouldRetryOnFailover(err)) {
      const retryConfig = {
        ...err.config,
        baseURL: FAILOVER_API_URL,
        timeout: 8000,
        _failoverTried: true,
      };
      setApiMode("PHP_FAILOVER");
      return api.request(retryConfig);
    }

    return Promise.reject(err);
  }
);

export default api;
export { API_MODE_EVENT, API_MODE_STORAGE_KEY, FAILOVER_API_URL, PRIMARY_API_URL };
