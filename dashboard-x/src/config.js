// نقطة الاتصال الرسمية للباك إند تبع InfinityX
// لو قررت تغيّرها لـ admin.xelitesolutions.com بس عدّل السطر هذا.
export const API_BASE = "https://api.xelitesolutions.com";

// Endpoints اللي راح نستعملها
export const ENDPOINTS = {
  health:        `${API_BASE}/`,                      // فحص السيرفر
  login:         `${API_BASE}/api/auth/login`,        // POST { email, password }
  usersList:     `${API_BASE}/api/admin/users`,       // GET (لازم session token بالهيدر)
  joeCommand:    `${API_BASE}/api/joe/command`,       // POST أوامر جـو
};