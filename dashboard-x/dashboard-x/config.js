// dashboard-x/config.js

export const API_BASE_URL = "https://api.xelitesolutions.com";

// helper to call backend with session token
export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["x-session-token"] = token;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // نحاول نرجع JSON، ولو فشل نرجع النص
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }

  return { ok: res.ok, status: res.status, data };
}