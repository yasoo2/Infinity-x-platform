import apiClient from './client';

/**
 * Get system status and health metrics
 */
export const getSystemStatus = async () => {
  const response = await apiClient.get('/api/system/metrics');
  return response.data;
};

/**
 * Get activity/events stream
 */
export const getActivityStream = async () => {
  const response = await apiClient.get('/api/joe/activity-stream');
  return response.data;
};

/**
 * Send command to Joe
 * @param {Object} payload - { sessionToken, lang, voice, commandText }
 */
export const sendCommand = async (payload) => {
  const response = await apiClient.post('/api/joe/command', payload);
  return response.data;
};

/**
 * Get admin users list
 */
export const getAdminUsers = async () => {
  const response = await apiClient.get('/api/admin/users');
  return response.data;
};

/**
 * Get Joe suggestions
 */
export const getJoeSuggestions = async () => {
  const response = await apiClient.get('/api/joe/suggestions');
  return response.data;
};

/**
 * Submit decision on Joe suggestion
 * @param {Object} payload - { suggestionId, decision }
 */
export const submitSuggestionDecision = async (payload) => {
  const response = await apiClient.post('/api/joe/suggestions/decision', payload);
  return response.data;
};
