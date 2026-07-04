import axios from "axios";

const PORTAL_TOKEN_COOKIE = "portal_token";

function clearPortalTokenCookie() {
  document.cookie = `${PORTAL_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("portal_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isLoginRequest = err.config?.url?.includes("/auth/login");

    if (err.response?.status === 401 && !isLoginRequest && typeof window !== "undefined") {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      clearPortalTokenCookie();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
