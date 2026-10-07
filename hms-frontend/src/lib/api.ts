import axios from "axios";
import { useAuthStore } from "@/store/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { Accept: "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login when token dies
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().clear();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);