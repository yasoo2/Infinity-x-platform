import axios from "axios"

// لو انت فاتح الداشبورد لوكالي:
// - Vite حيعمل proxy على /api تلقائياً ل Render backend
// لو نشرنا الداشبورد اونلاين، بنقدر نغير baseURL ل HTTPS تبع الـ backend

const api = axios.create({
  baseURL: "/api",
})

// استرجع حالة النظام (users online, joe activity, redis, ...)
export async function fetchStatus(sessionToken) {
  const res = await api.get("/dashboard/status", {
    headers: {
      "x-session-token": sessionToken
    }
  })
  return res.data
}

// استرجع آخر الشغل المباشر لجو (الشاشة الصغيرة)
export async function fetchJoeActivity() {
  const res = await api.get("/joe/activity-stream")
  return res.data
}

// استرجع المستخدمين عشان تبويب إدارة الصلاحيات
export async function fetchUsers(sessionToken) {
  const res = await api.get("/admin/users", {
    headers: {
      "x-session-token": sessionToken
    }
  })
  return res.data
}

// ارسال أمر لجو (أمر صوتي/نصي)
export async function sendJoeCommand(sessionToken, text) {
  const res = await api.post("/joe/command", {
    sessionToken,
    lang: "en",
    voice: false,
    commandText: text
  })
  return res.data
}