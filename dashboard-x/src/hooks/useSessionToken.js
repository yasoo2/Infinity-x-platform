// src/hooks/useSessionToken.js
import { useState, useEffect } from 'react';

/**
 * useSessionToken
 * - SSR-safe (يتحقق من window)
 * - مزامنة تلقائية بين التابات
 * - اختيار التخزين: localStorage أو sessionStorage
 * - خيار انتهاء صلاحية للتوكن (TTL)
 *
 * Usage:
 * const { token, saveToken, clearToken, isAuthenticated } =
 *   useSessionToken({ key: 'sessionToken', storage: 'local', withExpiry: true });
 *
 * saveToken('abc123', 60_000); // يحفظ التوكن لمدة 60 ثانية إذا withExpiry=true
 */
export const useSessionToken = (opts = {}) => {
  const {
    key = 'sessionToken',
    storage = 'local',          // 'local' | 'session'
    withExpiry = false,         // عندما true: نخزن { value, exp }
  } = opts;

  const getStore = () => {
    if (typeof window === 'undefined') return null;
    return storage === 'session' ? window.sessionStorage : window.localStorage;
  };

  const readFromStore = () => {
    try {
      const store = getStore();
      if (!store) return null;
      const raw = store.getItem(key);
      if (!raw) return null;
      if (!withExpiry) return raw;

      // مع انتهاء صلاحية
      const parsed = JSON.parse(raw);
      if (parsed?.exp && Date.now() > parsed.exp) {
        store.removeItem(key);
        return null;
      }
      return parsed?.value ?? null;
    } catch {
      return null;
    }
  };

  // تهيئة Lazy + آمنة لـ SSR
  const [token, setToken] = useState(() => readFromStore());

  // هيدرشن بعد التركيب (في حال SSR كانت null)
  useEffect(() => {
    if (token == null) {
      const existing = readFromStore();
      if (existing != null) setToken(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // مزامنة عبر التابات
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e) => {
      if (e.key !== key) return;
      // قد تكون القيمة string أو JSON مع expiry
      const next = readFromStore();
      setToken(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storage, withExpiry]);

  const saveToken = (newToken, ttlMs) => {
    try {
      const store = getStore();
      if (!store) return;
      if (withExpiry && ttlMs && Number.isFinite(ttlMs)) {
        const payload = JSON.stringify({ value: newToken, exp: Date.now() + ttlMs });
        store.setItem(key, payload);
      } else {
        store.setItem(key, String(newToken));
      }
      setToken(newToken);
    } catch {
      // تجاهل أخطاء الكوتا/الوصول
    }
  };

  const clearToken = () => {
    try {
      const store = getStore();
      if (store) store.removeItem(key);
    } catch { /* Ignore quota/access errors */ }
    setToken(null);
  };

  const isAuthenticated = () => !!token;

  return { token, saveToken, clearToken, isAuthenticated };
};
