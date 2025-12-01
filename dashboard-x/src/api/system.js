import apiClient from './client';

  // Base path helpers
  const v1 = (p) => `/api/v1${p}`;
  const joe = (p) => v1(`/joe${p}`);
  const admin = (p) => v1(`/admin${p}`);
  
  const chatHistory = (p) => v1(`/chat-history${p}`);

  const mockKey = 'mock_chat_sessions';
  const readMock = () => { try { const v = localStorage.getItem(mockKey); return v ? JSON.parse(v) : null; } catch { return null; } };
  const writeMock = (val) => { try { localStorage.setItem(mockKey, JSON.stringify(val)); } catch { void 0; } };
  const ensureMockStore = () => {
    let s = readMock();
    if (!s) {
      const id = `sess-${Date.now()}`;
      s = { sessions: [{ id, title: 'جلسة تجريبية' }], details: { [id]: { interactions: [{ command: 'مرحبا', result: 'أهلاً', metadata: { timestamp: Date.now() } }] } } };
      writeMock(s);
    }
    return s;
  };
  const useMockChat = (() => { try { const v = localStorage.getItem('useMockChat'); return v === 'true' || v === null; } catch { return true; } })();
  const mockGetChatSessions = async () => {
    const s = ensureMockStore();
    return { success: true, sessions: s.sessions.map(x => ({ id: x.id, title: x.title, lastUpdated: new Date().toISOString() })) };
  };
  const mockGetChatSessionById = async (id) => {
    const s = ensureMockStore();
    const d = s.details[id] || { interactions: [] };
    return { success: true, session: { id, interactions: d.interactions } };
  };
  const mockCreateChatSession = async (title) => {
    const s = ensureMockStore();
    const id = `sess-${Date.now()}`;
    s.sessions.unshift({ id, title: title || 'جلسة جديدة' });
    s.details[id] = { interactions: [] };
    writeMock(s);
    return { success: true, session: { id } };
  };
  const mockUpdateChatSession = async (id, patch) => {
    const s = ensureMockStore();
    s.sessions = s.sessions.map(x => x.id === id ? { ...x, title: patch?.title || x.title } : x);
    writeMock(s);
    return { success: true };
  };
  const mockGetChatMessages = async (id) => {
    const s = ensureMockStore();
    const d = s.details[id] || { interactions: [] };
    const messages = [];
    for (const it of d.interactions) {
      if (it.command) messages.push({ type: 'user', content: it.command });
      if (it.result) messages.push({ type: 'joe', content: it.result });
    }
    return { success: true, messages };
  };
  const mockAddChatMessage = async (id, payload) => {
    const s = ensureMockStore();
    const d = s.details[id] || { interactions: [] };
    if (!s.details[id]) s.details[id] = d;
    const command = payload?.content || '';
    const result = command ? `تم استلام: ${command}` : '';
    d.interactions.push({ command, result, metadata: { timestamp: Date.now() } });
    writeMock(s);
    return { success: true };
  };
  const mockDeleteChatSession = async (id) => {
    const s = ensureMockStore();
    s.sessions = s.sessions.filter(x => x.id !== id);
    delete s.details[id];
    writeMock(s);
    return { success: true };
  };
  const mockDeleteChatMessage = async (id, messageId) => {
    const s = ensureMockStore();
    const d = s.details[id];
    if (d) {
      d.interactions = d.interactions.filter((_it, idx) => String(idx) !== String(messageId));
      writeMock(s);
    }
    return { success: true };
  };

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

export const getChatSessions = async (opts) => {
  if (useMockChat) return await mockGetChatSessions();
  try { const { data } = await apiClient.get(chatHistory('/sessions'), { signal: opts?.signal }); return data; } catch { return await mockGetChatSessions(); }
};

export const getChatSessionById = async (id, opts) => {
  if (useMockChat) return await mockGetChatSessionById(id);
  try { const { data } = await apiClient.get(chatHistory(`/sessions/${id}`), { signal: opts?.signal }); return data; } catch { return await mockGetChatSessionById(id); }
};

export const deleteChatSession = async (id, opts) => {
  if (useMockChat) return await mockDeleteChatSession(id);
  try { const { data } = await apiClient.delete(chatHistory(`/sessions/${id}`), { signal: opts?.signal }); return data; } catch { return await mockDeleteChatSession(id); }
};

export const getUserContext = (params) =>
  call(() => apiClient.get(chatHistory('/user-context'), { params: { limit: params?.limit }, signal: params?.signal }));

// Guest token issuance
export const getGuestToken = (opts) =>
  call(() => apiClient.post(v1('/auth/guest-token'), undefined, { signal: opts?.signal }));

export const createChatSession = async (title, opts) => {
  if (useMockChat) return await mockCreateChatSession(title);
  try { const { data } = await apiClient.post(chatHistory('/sessions'), { title }, { signal: opts?.signal }); return data; } catch { return await mockCreateChatSession(title); }
};

export const updateChatSession = async (id, patch, opts) => {
  if (useMockChat) return await mockUpdateChatSession(id, patch);
  try { const { data } = await apiClient.put(chatHistory(`/sessions/${id}`), patch, { signal: opts?.signal }); return data; } catch { return await mockUpdateChatSession(id, patch); }
};

export const getChatMessages = async (id, opts) => {
  if (useMockChat) return await mockGetChatMessages(id);
  try { const { data } = await apiClient.get(chatHistory(`/sessions/${id}/messages`), { signal: opts?.signal }); return data; } catch { return await mockGetChatMessages(id); }
};

export const addChatMessage = async (id, payload, opts) => {
  if (useMockChat) return await mockAddChatMessage(id, payload);
  try { const { data } = await apiClient.post(chatHistory(`/sessions/${id}/messages`), payload, { signal: opts?.signal }); return data; } catch { return await mockAddChatMessage(id, payload); }
};

export const deleteChatMessage = async (id, messageId, opts) => {
  if (useMockChat) return await mockDeleteChatMessage(id, messageId);
  try { const { data } = await apiClient.delete(chatHistory(`/sessions/${id}/messages/${messageId}`), { signal: opts?.signal }); return data; } catch { return await mockDeleteChatMessage(id, messageId); }
};
