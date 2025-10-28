// dashboard-x/src/apiClient/adminApi.js

const API_BASE = "https://api.xelitesolutions.com"; 
// مهم: هذا هو الدومين تبع الباك إند تبعك (نفس اللي شغال وبيجاوب)
// إذا رجعنا نستخدم admin.xelitesolutions.com بدل api.xelitesolutions.com ما في مشكلة
// بس خلّيه api.* أولاً عشان نضل ثابتين.

async function doJson(url, method = "GET", body = null, sessionToken = null) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["x-session-token"] = sessionToken;
  }

  const res = await fetch(API_BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  // نحاول نقرأ JSON، حتى لو كان خطأ
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { raw: await res.text(), status: res.status };
  }

  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

// 1) تسجيل الدخول (يرجع sessionToken)
export async function loginWithEmailPassword(emailOrPhone, password) {
  return doJson(
    "/api/auth/login",
    "POST",
    { emailOrPhone, password },
    null
  );
}

// 2) إحضار حالة النظام للوحة (عدد يوزرات، sessions، وضع جو، وضع المصنع)
export async function getSystemStatus(sessionToken) {
  return doJson(
    "/api/dashboard/status",
    "GET",
    null,
    sessionToken
  );
}

// 3) إحضار قائمة المستخدمين + الإحصائيات
export async function getAllUsers(sessionToken) {
  return doJson(
    "/api/admin/users",
    "GET",
    null,
    sessionToken
  );
}

// 4) إرسال أمر لجو (أنت تحكي لجو يشتغل)
export async function sendJoeCommand(sessionToken, commandText, lang = "ar") {
  return doJson(
    "/api/joe/command",
    "POST",
    {
      sessionToken,
      lang,
      voice: false,
      commandText
    },
    null // مهم: هذا الراوت حالياً ما يتطلب x-session-token بالهيدر، بياخد sessionToken من الـ body
  );
}

// 5) تجيب آخر نشاط مباشر لجو (للشاشة اللي بتورجيك جو شو قاعد يسوي الآن)
export async function getJoeActivity() {
  return doJson(
    "/api/joe/activity-stream",
    "GET",
    null,
    null
  );
}
