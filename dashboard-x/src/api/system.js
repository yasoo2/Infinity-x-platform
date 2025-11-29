  import apiClient from './client';

  // Base path helpers
  const v1 = (p) => `/api/v1${p}`;
  const joe = (p) => v1(`/joe${p}`);
  const admin = (p) => v1(`/admin${p}`);
  
  const chatHistory = (p) => v1(`/chat-history${p}`);

  // Unified call wrapper to normalize errors and support AbortSignal
  /**
   * @template T
   * @param {() => Promise<{ data: T }>} fn
   * @returns {Promise<T>}
   */
  const call = async (fn) => {
    try {
      const res = await fn();
      return res.data;
    } catch (e) {
      // If using the normalized error from client.ts, it already has {status, code, message}
      // Otherwise fall back to Axios error shape.
      const err = /** @type {any} */ (e);
      const message =
        err?.message ||
        err?.response?.data?.message ||
        'حدث خطأ أثناء الاتصال بالخادم';
      const status = err?.status ?? err?.response?.status;
      const details = err?.details ?? err?.response?.data;
      const code = err?.code ?? err?.response?.data?.code;
      const normalized = { status, code, message, details };
      // Re-throw normalized error to upper layers (UI/toasts)
      throw normalized;
    }
  };

  /**
   * Get system status and health metrics
   * @param {{ signal?: AbortSignal }=} opts
   */
export const getSystemStatus = (opts) =>
  call(() => apiClient.get(v1('/health'), { signal: opts?.signal }));

  /**
   * Get activity/events stream (polling JSON). For SSE, use EventSource instead.
   * @param {{ page?: number, pageSize?: number, since?: string, signal?: AbortSignal }=} params
   */
  export const getActivityStream = (params) =>
    call(() =>
      apiClient.get(joe('/activity-stream'), {
        params: {
          page: params?.page,
          pageSize: params?.pageSize,
          since: params?.since,
        },
        signal: params?.signal,
      })
    );

  /**
   * Send command to Joe
   * @param {{ sessionToken?: string, lang?: string, voice?: string, commandText: string }} payload
   * @param {{ signal?: AbortSignal }=} opts
   */
  export const sendCommand = (payload, opts) =>
    call(() => apiClient.post(joe('/command'), payload, { signal: opts?.signal }));

  /**
   * Get admin users list
   * @param {{ page?: number, pageSize?: number, query?: string, signal?: AbortSignal }=} params
   */
  export const getAdminUsers = (params) =>
    call(() =>
      apiClient.get(admin('/users'), {
        params: {
          page: params?.page,
          pageSize: params?.pageSize,
          q: params?.query,
        },
        signal: params?.signal,
      })
    );

  /**
   * Create admin/user
   * @param {{ email: string, password: string, phone?: string, role?: 'user'|'admin'|'super_admin' }} payload
   */
  export const createAdminUser = (payload) =>
    call(() => apiClient.post(admin('/users'), payload));

  /**
   * Update admin/user by id
   * @param {string} id
   * @param {{ email?: string, password?: string, phone?: string|null, role?: 'user'|'admin'|'super_admin' }} payload
   */
  export const updateAdminUser = (id, payload) =>
    call(() => apiClient.put(admin(`/users/${id}`), payload));

  /**
   * Delete admin/user by id
   * @param {string} id
   */
  export const deleteAdminUser = (id) =>
    call(() => apiClient.delete(admin(`/users/${id}`)));

  /**
   * Get Joe suggestions
   * @param {{ limit?: number, signal?: AbortSignal }=} params
   */
  export const getJoeSuggestions = (params) =>
    call(() =>
      apiClient.get(joe('/suggestions'), {
        params: { limit: params?.limit },
        signal: params?.signal,
      })
    );

  /**
   * Submit decision on Joe suggestion
   * @param {{ suggestionId: string, decision: 'approve' | 'reject', reason?: string }} payload
   * @param {{ signal?: AbortSignal }=} opts
   */
  export const submitSuggestionDecision = (payload, opts) =>
    call(() => apiClient.post(joe('/suggestions/decision'), payload, { signal: opts?.signal }));

  // Optional: helper for cancellable calls
  export const withAbort = () => {
    const controller = new AbortController();
    return { controller, signal: controller.signal };
  };

  // AI Providers Management
  export const getAIProviders = () =>
    call(() => apiClient.get(v1('/ai/providers')));

  export const validateAIKey = (provider, apiKey) =>
    call(() => apiClient.post(v1('/ai/validate'), { provider, apiKey }));

  export const activateAIProvider = (provider, model) =>
    call(() => apiClient.post(v1('/ai/activate'), { provider, model }));

  export const getChatSessions = (opts) =>
    call(() => apiClient.get(chatHistory('/sessions'), { signal: opts?.signal }));

  export const getChatSessionById = (id, opts) =>
    call(() => apiClient.get(chatHistory(`/sessions/${id}`), { signal: opts?.signal }));

  export const deleteChatSession = (id, opts) =>
    call(() => apiClient.delete(chatHistory(`/sessions/${id}`), { signal: opts?.signal }));

  export const getUserContext = (params) =>
    call(() => apiClient.get(chatHistory('/user-context'), { params: { limit: params?.limit }, signal: params?.signal }));

  // Guest token issuance
  export const getGuestToken = (opts) =>
    call(() => apiClient.post(v1('/auth/guest-token'), undefined, { signal: opts?.signal }));
