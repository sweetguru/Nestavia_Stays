import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nestavia_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (e) => e?.response?.data?.detail || e?.message || "Something went wrong";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const fmtDate = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
