import { useState } from "react";
// بيحتفظ بالتوكن وبمعلومات المستخدم بعد تسجيل الدخول
export function useAuthStore() {
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null); // { email, role, phone }

  return { token, setToken, me, setMe };
}
