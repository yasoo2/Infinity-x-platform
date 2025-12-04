
import apiClient from './client';

export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/api/v1/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};
