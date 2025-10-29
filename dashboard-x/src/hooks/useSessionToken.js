import { useState, useEffect } from 'react';

/**
 * Custom hook to manage session token in localStorage
 */
export const useSessionToken = () => {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('sessionToken') || null;
  });

  const saveToken = (newToken) => {
    localStorage.setItem('sessionToken', newToken);
    setToken(newToken);
  };

  const clearToken = () => {
    localStorage.removeItem('sessionToken');
    setToken(null);
  };

  const isAuthenticated = () => {
    return !!token;
  };

  return {
    token,
    saveToken,
    clearToken,
    isAuthenticated,
  };
};
