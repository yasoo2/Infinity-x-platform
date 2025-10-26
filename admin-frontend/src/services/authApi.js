import { makeClient } from "./apiClient.js";

export async function loginWithEmail(email, password) {
  const c = makeClient();
  const r = await c.post("/auth/login/email", { email, password });
  return r.data;
}

export async function loginWithPhone(phone, password) {
  const c = makeClient();
  const r = await c.post("/auth/login/phone", { phone, password });
  return r.data;
}

// تسجيل الدخول بجوجل لاحقاً:
// front-end يفتح نافذة OAuth -> يرجع code -> نبعت /auth/google/callback?code=...
