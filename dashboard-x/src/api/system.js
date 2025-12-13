import apiClient from './client';

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
  call(() => apiClient.get(v1('/health'), { signal: opts?.signal, _noRedirect401: true }));

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
export const getAIProviders = (opts) =>
    call(() => apiClient.get(v1('/ai/providers'), { signal: opts?.signal, timeout: 20000, _noRedirect401: true }));

export const validateAIKey = (provider, apiKey, opts) =>
    call(() => apiClient.post(v1('/ai/validate'), { provider, apiKey }, { signal: opts?.signal, timeout: 45000, _noRedirect401: true }));

export const activateAIProvider = (provider, apiKey, opts) =>
    call(() => apiClient.post(v1('/ai/activate'), { provider, apiKey }, { signal: opts?.signal, timeout: 30000, _noRedirect401: true }));

export const getChatSessions = async (opts) => {
  try {
    const { data } = await apiClient.get(chatHistory('/sessions'), { signal: opts?.signal, _noRedirect401: true });
    return data;
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    if (status === 404 || String(e?.details?.error || e?.code || '').toUpperCase() === 'NOT_FOUND') {
      return { success: true, sessions: [] };
    }
    throw e;
  }
};

export const getChatSessionById = async (id, opts) => {
  try {
    const { data } = await apiClient.get(chatHistory(`/sessions/${id}`), { signal: opts?.signal, _noRedirect401: true });
    return data;
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    if (status === 404 || String(e?.details?.error || e?.code || '').toUpperCase() === 'NOT_FOUND') {
      return { success: false, session: null, messages: [] };
    }
    throw e;
  }
};

export const deleteChatSession = (id, opts) =>
  call(() => apiClient.delete(chatHistory(`/sessions/${id}`), { signal: opts?.signal, timeout: opts?.timeout ?? 12000, _noRedirect401: true }));

export const getUserContext = (params) =>
  call(() => apiClient.get(chatHistory('/user-context'), { params: { limit: params?.limit }, signal: params?.signal, _noRedirect401: true }));

// Guest token issuance
export const getGuestToken = (opts) =>
  call(() => apiClient.post(v1('/auth/guest-token'), undefined, { signal: opts?.signal }));

export const createChatSession = (title, opts) =>
  call(() => apiClient.post(chatHistory('/sessions'), { title }, { signal: opts?.signal, _noRedirect401: true }));

export const updateChatSession = (id, patch, opts) =>
  call(() => apiClient.put(chatHistory(`/sessions/${id}`), patch, { signal: opts?.signal, _noRedirect401: true }));

export const getChatMessages = (id, opts) =>
  call(async () => {
    try {
      return await apiClient.get(chatHistory(`/sessions/${id}/messages`), { signal: opts?.signal, _noRedirect401: true });
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      if (status === 405 || status === 404) {
        try {
          const res = await apiClient.get(chatHistory(`/sessions/${id}`), { signal: opts?.signal, _noRedirect401: true });
          const messages = Array.isArray(res?.data?.messages) ? res.data.messages : [];
          return { data: { success: true, messages } };
        } catch (e2) {
          const s2 = e2?.status ?? e2?.response?.status;
          if (s2 === 404) {
            return { data: { success: true, messages: [] } };
          }
          throw e2;
        }
      }
      throw e;
    }
  });

export const addChatMessage = (id, payload, opts) =>
  call(() => apiClient.post(chatHistory(`/sessions/${id}/messages`), payload, { signal: opts?.signal, _noRedirect401: true }));

export const deleteChatMessage = (id, messageId, opts) =>
  call(() => apiClient.delete(chatHistory(`/sessions/${id}/messages/${messageId}`), { signal: opts?.signal, _noRedirect401: true }));

export const executeJoe = async (instruction, ctx, opts) => {
  const payload = { instruction, lang: ctx?.lang, model: ctx?.model, sessionId: ctx?.sessionId, provider: ctx?.provider, apiKey: ctx?.apiKey };
  try {
    const { data } = await apiClient.post(v1('/joe/execute'), payload, { signal: opts?.signal, _noRedirect401: true });
    return data;
  } catch (e) {
    const status = e?.status ?? e?.response?.status;
    if (status === 405 || status === 404) {
      const params = new URLSearchParams();
      params.set('instruction', instruction);
      if (payload.lang) params.set('lang', String(payload.lang));
      if (payload.model) params.set('model', String(payload.model));
      if (payload.sessionId) params.set('sessionId', String(payload.sessionId));
      if (payload.provider) params.set('provider', String(payload.provider));
      if (payload.apiKey) params.set('apiKey', String(payload.apiKey));
      try {
        const { data } = await apiClient.get(`${v1('/joe/execute')}?${params.toString()}`, { signal: opts?.signal, _noRedirect401: true });
        return data;
      } catch (e2) {
        const s2 = e2?.status ?? e2?.response?.status;
        if (s2 === 404) {
          try {
            const { data } = await apiClient.post(v1('/joe-chat-advanced'), { message: instruction, sessionId: payload.sessionId }, { signal: opts?.signal, _noRedirect401: true });
            return data;
          } catch (e3) {
            throw e3;
          }
        }
        throw e2;
      }
    }
    throw e;
  }
};

// User uploads (images)
export const listUserUploads = (opts) =>
  call(() => apiClient.get(v1('/file/uploads/list'), { signal: opts?.signal }));

export const deleteUserUpload = (name, opts) =>
  call(() => apiClient.delete(v1('/file/uploads/delete'), { data: { name }, signal: opts?.signal }));
