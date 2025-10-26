import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://infinity-x-platform.onrender.com";

export function makeClient(token) {
  return axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}
