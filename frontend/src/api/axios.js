import axios from "axios";

const configuredBaseURL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
if (!configuredBaseURL) {
  throw new Error("VITE_API_URL must be set to the backend deployment URL.");
}

const baseURL = /\/api$/i.test(configuredBaseURL)
  ? configuredBaseURL
  : `${configuredBaseURL}/api`;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (typeof token === "string" && token.trim()) {
      config.headers.set("Authorization", `Bearer ${token.trim()}`);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
