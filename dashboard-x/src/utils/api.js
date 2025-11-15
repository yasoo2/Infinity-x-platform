// dashboard-x/src/utils/api.js
import config from '../config.js';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('sessionToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['X-Session-Token'] = token;
  }

  const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};
