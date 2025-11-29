
import { useReducer, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getChatSessions, getChatSessionById, getGuestToken, getSystemStatus } from '../api/system';

const JOE_CHAT_HISTORY = 'joeChatHistory';

const getLang = () => {
  try {
    const v = localStorage.getItem('lang');
    return v === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
};

const normalizeTitle = (text) => {
    if (!text) return 'New Conversation';
    const cleaned = String(text).trim().replace(/\s+/g, ' ');
    return cleaned.length > 60 ? cleaned.slice(0, 60) + '…' : cleaned;
};

const normalizeConversationsData = (raw) => {
    try {
        if (!raw) return {};
        // If it's already an object map
        if (typeof raw === 'object' && !Array.isArray(raw)) {
            return raw;
        }
        // If it's an array, convert to object keyed by id
        if (Array.isArray(raw)) {
            const obj = {};
            raw.forEach((c) => {
                if (c && c.id) {
                    obj[c.id] = {
                        id: c.id,
                        title: c.title || 'New Conversation',
                        messages: Array.isArray(c.messages) ? c.messages : [],
                        lastModified: c.lastModified || Date.now(),
                        pinned: !!c.pinned,
                    };
                }
            });
            return obj;
        }
        return {};
    } catch {
        return {};
    }
};

const chatReducer = (state, action) => {
    const { currentConversationId, conversations } = state;
    const currentConvo = conversations[currentConversationId];

    switch (action.type) {
        // ... (existing cases like SET_INPUT, APPEND_MESSAGE, etc.)
        case 'SET_INPUT':
            return { ...state, input: action.payload };

        case 'START_PROCESSING': {
            if (!currentConversationId) return state;
            const newMessage = { type: 'user', content: action.payload, id: uuidv4() };
            const updatedMessages = [...(currentConvo?.messages || []), newMessage];
            const title = (!currentConvo?.title || currentConvo?.title === 'New Conversation') ? normalizeTitle(action.payload) : currentConvo.title;
            const updatedConvo = { ...currentConvo, messages: updatedMessages, title, lastModified: Date.now() };
            
            return {
                ...state,
                input: '',
                isProcessing: true,
                progress: 0,
                currentStep: 'Processing...',
                conversations: { ...conversations, [currentConversationId]: updatedConvo },
                plan: [], // CLEAR_PLAN on start
            };
        }

        case 'SEND_MESSAGE': {
            const inputText = action.payload;
            let nextState = { ...state };
            let convoId = nextState.currentConversationId;
            // Ensure a conversation exists
            if (!convoId) {
                convoId = uuidv4();
                nextState.conversations = {
                    ...nextState.conversations,
                    [convoId]: { id: convoId, title: 'New Conversation', messages: [], lastModified: Date.now(), pinned: false },
                };
                nextState.currentConversationId = convoId;
            }
            const convo = nextState.conversations[convoId];
            const newMessage = { type: 'user', content: inputText, id: uuidv4() };
            const updatedMessages = [...(convo?.messages || []), newMessage];
            const title = (!convo?.title || convo?.title === 'New Conversation') ? normalizeTitle(inputText) : convo.title;
            nextState.conversations = {
                ...nextState.conversations,
                [convoId]: { ...convo, messages: updatedMessages, title, lastModified: Date.now() },
            };
            nextState.input = '';
            nextState.isProcessing = true;
            nextState.progress = 0;
            nextState.currentStep = 'Processing...';
            nextState.plan = [];
            return nextState;
        }

        case 'APPEND_MESSAGE': {
            if (!currentConvo) return state;
            const lastMessage = currentConvo.messages[currentConvo.messages.length - 1];
            let updatedMessages;

            if (lastMessage && lastMessage.type === 'joe' && action.payload.type === 'joe') {
                updatedMessages = [...currentConvo.messages.slice(0, -1), { ...lastMessage, content: lastMessage.content + action.payload.content }];
            } else {
                updatedMessages = [...currentConvo.messages, { type: action.payload.type, content: action.payload.content, id: uuidv4() }];
            }

            const updatedConvo = { ...currentConvo, messages: updatedMessages, lastModified: Date.now() };
            if (currentConvo.title === 'New Conversation' && action.payload.type === 'joe') {
                updatedConvo.title = normalizeTitle(currentConvo.messages.find(m => m.type === 'user')?.content || 'New Conversation');
            }
            return {
                ...state,
                conversations: { ...conversations, [currentConversationId]: updatedConvo },
            };
        }

        case 'STOP_PROCESSING':
            return { ...state, isProcessing: false, progress: 0, currentStep: '', plan: [] }; // CLEAR_PLAN on stop

        case 'SET_PROGRESS':
            return { ...state, progress: action.payload.progress, currentStep: action.payload.step };

        case 'SET_LISTENING':
            return { ...state, isListening: action.payload };

        case 'SET_TRANSCRIPT':
            return { ...state, transcript: action.payload, input: action.payload };

        case 'ADD_WS_LOG':
            return { ...state, wsLog: [...state.wsLog, action.payload] };

        case 'ADD_PENDING_LOG': {
            const id = action.payload;
            const list = state.pendingHandledLogIds || [];
            return { ...state, pendingHandledLogIds: list.includes(id) ? list : [...list, id] };
        }

        case 'REMOVE_PENDING_LOGS': {
            const ids = new Set(state.pendingHandledLogIds || []);
            const remaining = (state.wsLog || []).filter(l => {
                const lid = typeof l === 'object' && l && typeof l.id !== 'undefined' ? l.id : null;
                return !ids.has(lid);
            });
            return { ...state, wsLog: remaining, pendingHandledLogIds: [] };
        }

        case 'SET_WS_CONNECTED':
            return { ...state, wsConnected: action.payload };

        case 'SET_RECONNECT_STATE': {
            const { active, attempt, delayMs, etaTs } = action.payload;
            return { ...state, reconnectActive: active, reconnectAttempt: attempt, reconnectDelayMs: delayMs, reconnectEtaTs: etaTs, reconnectRemainingMs: delayMs };
        }

        case 'SET_RECONNECT_REMAINING':
            return { ...state, reconnectRemainingMs: action.payload };

        case 'SET_CONVERSATIONS':
            return { ...state, conversations: action.payload };

        case 'SELECT_CONVERSATION':
            // Ensure full state reset to force re-render and clear old input/processing state
            return { ...state, currentConversationId: action.payload, isProcessing: false, input: '', plan: [], progress: 0, currentStep: '' };

        case 'NEW_CONVERSATION': {
            const selectNew = typeof action.payload === 'object' ? (action.payload.selectNew !== false) : (action.payload !== false);
            const newId = uuidv4();
            console.warn('[NEW_CONVERSATION] Creating new conversation with ID:', newId);
            const dynamicText = typeof action.payload === 'object' && action.payload.welcomeMessage ? action.payload.welcomeMessage : 'Welcome to Joe AI Assistant! 👋';
            const welcomeMessage = { type: 'joe', content: dynamicText, id: uuidv4() };
            const newConversations = {
                ...conversations,
                [newId]: { id: newId, title: 'New Conversation', messages: [welcomeMessage], lastModified: Date.now(), pinned: false },
            };
            const newState = {
                ...state,
                conversations: newConversations,
                currentConversationId: selectNew ? newId : state.currentConversationId,
                input: '',
                isProcessing: false,
                plan: [],
            };
            console.warn('[NEW_CONVERSATION] New state:', { conversationCount: Object.keys(newState.conversations).length, currentId: newState.currentConversationId });
            return newState;
        }

        // NEW ACTIONS FOR THE RIGHT PANEL
        case 'ADD_PLAN_STEP':
            return { ...state, plan: [...state.plan, action.payload] };
        
        case 'CLEAR_PLAN':
            return { ...state, plan: [] };

        case 'RENAME_CONVERSATION': {
            const { id, title } = action.payload;
            const convo = state.conversations[id];
            if (!convo) return state;
            const updated = { ...convo, title: normalizeTitle(title), lastModified: Date.now() };
            return { ...state, conversations: { ...state.conversations, [id]: updated } };
        }

        case 'DELETE_CONVERSATION': {
            const { id } = action.payload;
            if (!state.conversations[id]) return state;
            const rest = { ...state.conversations };
            delete rest[id];
            const ids = Object.keys(rest);
            if (ids.length === 0) {
                const newId = uuidv4();
                const welcomeMessage = { type: 'joe', content: 'Welcome to Joe AI Assistant! 👋', id: uuidv4() };
                const newConversations = { [newId]: { id: newId, title: 'New Conversation', messages: [welcomeMessage], lastModified: Date.now(), pinned: false } };
                return { ...state, conversations: newConversations, currentConversationId: newId, input: '', isProcessing: false, progress: 0, currentStep: '', plan: [] };
            }
            const nextId = ids.sort((a, b) => (rest[b].lastModified || 0) - (rest[a].lastModified || 0))[0];
            return { ...state, conversations: rest, currentConversationId: nextId, input: '', isProcessing: false, progress: 0, currentStep: '', plan: [] };
        }

        case 'PIN_TOGGLE': {
            const { id } = action.payload;
            const convo = state.conversations[id];
            if (!convo) return state;
            const updated = { ...convo, pinned: !convo.pinned, lastModified: Date.now() };
            return { ...state, conversations: { ...state.conversations, [id]: updated } };
        }

        case 'DUPLICATE_CONVERSATION': {
            const { id } = action.payload;
            const source = state.conversations[id];
            if (!source) return state;
            const newId = uuidv4();
            const copy = { ...source, id: newId, title: normalizeTitle(`${source.title} (copy)`), lastModified: Date.now() };
            return { ...state, conversations: { ...state.conversations, [newId]: copy }, currentConversationId: newId };
        }

        case 'CLEAR_MESSAGES': {
            const { id } = action.payload;
            const convo = state.conversations[id];
            if (!convo) return state;
            const cleared = { ...convo, messages: [], lastModified: Date.now() };
            return { ...state, conversations: { ...state.conversations, [id]: cleared } };
        }

        default:
            return state;
    }
};

export const useJoeChat = () => {
  const ws = useRef(null);
  const recognition = useRef(null);
  const keepListeningRef = useRef(false);
  const isListeningRef = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const isConnectingRef = useRef(false);
  const syncRef = useRef(null);
  const reconnectCountdownInterval = useRef(null);
  const syncAbortRef = useRef(null);

  const [state, dispatch] = useReducer(chatReducer, {
    conversations: {},
    currentConversationId: null,
    input: '',
    isProcessing: false,
    progress: 0,
    currentStep: '',
    isListening: false,
    transcript: '',
    wsLog: [],
    pendingHandledLogIds: [],
    plan: [], // Initial state for the plan
    wsConnected: false,
    reconnectActive: false,
    reconnectAttempt: 0,
    reconnectDelayMs: 0,
    reconnectEtaTs: 0,
    reconnectRemainingMs: 0,
  });

  useEffect(() => {
    const c = globalThis && globalThis.console ? globalThis.console : null;
    const origLog = c && c['log'] ? c['log'] : null;
    const origWarn = c && c['warn'] ? c['warn'] : null;
    const origError = c && c['error'] ? c['error'] : null;
    if (c && origLog) c['log'] = (...args) => {
      try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'info', text: args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ') } }); } catch { void 0; }
      return args.length, undefined;
    };
    if (c && origWarn) c['warn'] = (...args) => {
      try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'warning', text: args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ') } }); } catch { void 0; }
      return args.length, undefined;
    };
    if (c && origError) c['error'] = (...args) => {
      try {
        const text = args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ');
        const isAbort = /(ERR_ABORTED|CanceledError|abort(ed)?)/i.test(text);
        if (!isAbort) {
          const lid = Date.now();
          dispatch({ type: 'ADD_WS_LOG', payload: { id: lid, type: 'error', text } });
          if (/(TypeError|Failed to fetch)/i.test(text)) {
            dispatch({ type: 'SEND_MESSAGE', payload: `Analyze and fix error: ${text}` });
            dispatch({ type: 'ADD_PENDING_LOG', payload: lid });
          }
        }
      } catch { void 0; }
      return args.length, undefined;
    };
    const onWindowError = (e) => {
      try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'error', text: String(e.message || e.error || 'Error') } }); } catch { void 0; }
    };
    const onRejection = (e) => {
      try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'error', text: String(e.reason || 'Unhandled rejection') } }); } catch { void 0; }
    };
    const onAuthUnauthorized = () => { try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'warning', text: 'Unauthorized: redirecting to login' } }); } catch { void 0; } };
    const onAuthForbidden = (ev) => { try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'warning', text: `Forbidden: ${JSON.stringify(ev.detail||{})}` } }); } catch { void 0; } };
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('auth:unauthorized', onAuthUnauthorized);
    window.addEventListener('auth:forbidden', onAuthForbidden);
    return () => {
      if (c && origLog) c['log'] = origLog;
      if (c && origWarn) c['warn'] = origWarn;
      if (c && origError) c['error'] = origError;
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('auth:unauthorized', onAuthUnauthorized);
      window.removeEventListener('auth:forbidden', onAuthForbidden);
    };
  }, []);

  // ... (useEffect for localStorage loading remains the same)
  const handleNewConversation = useCallback(async (selectNew = true) => {
    let toolsCount = 0;
    try {
      const status = await getSystemStatus();
      toolsCount = Number(status?.toolsCount || 0);
    } catch { toolsCount = 0; }
    const lang = getLang();
    const en = `Welcome to Joe AI Assistant! 👋\n\nYour AI-powered engineering partner with ${toolsCount} tools and functions.\n\nI can help you with:\n💬 Chat & Ask - Get instant answers and explanations\n🛠️ Build & Create - Generate projects and applications\n🔍 Analyze & Process - Work with data and generate insights\n\nStart by typing an instruction below, attaching a file, or using your voice.`;
    const ar = `مرحبًا بك في مساعد جو الذكي! 👋\n\nشريكك الهندسي المدعوم بالذكاء مع ${toolsCount} أداة ووظيفة.\n\nأستطيع مساعدتك في:\n💬 المحادثة والسؤال - إجابات وشروحات فورية\n🛠️ البناء والإنشاء - توليد مشاريع وتطبيقات\n🔍 التحليل والمعالجة - العمل مع البيانات وتوليد رؤى\n\nابدأ بكتابة تعليماتك أدناه أو إرفاق ملف أو استخدام الصوت.`;
    const msg = lang === 'ar' ? ar : en;
    dispatch({ type: 'NEW_CONVERSATION', payload: { selectNew, welcomeMessage: msg } });
  }, []);

  const renameConversation = useCallback((id, title) => {
    dispatch({ type: 'RENAME_CONVERSATION', payload: { id, title } });
  }, []);

  const deleteConversation = useCallback((id) => {
    dispatch({ type: 'DELETE_CONVERSATION', payload: { id } });
  }, []);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(JOE_CHAT_HISTORY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        const normalized = normalizeConversationsData(parsed?.conversations);
        if (normalized && Object.keys(normalized).length > 0) {
          dispatch({ type: 'SET_CONVERSATIONS', payload: normalized });
          const sortedIds = Object.keys(normalized).sort((a, b) => (normalized[b].lastModified || 0) - (normalized[a].lastModified || 0));
          dispatch({ type: 'SELECT_CONVERSATION', payload: parsed?.currentConversationId || sortedIds[0] });
        } else {
          handleNewConversation();
        }
      } else {
        handleNewConversation();
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      handleNewConversation();
    }
  }, [handleNewConversation]);

  const mapSessionToConversation = useCallback((session) => {
    const messages = [];
    for (const i of session.interactions || []) {
      if (i?.command) messages.push({ type: 'user', content: i.command, id: uuidv4() });
      if (i?.result) messages.push({ type: 'joe', content: i.result, id: uuidv4() });
    }
    const last = (session.interactions || []).at(-1);
    const lastModified = last?.metadata?.timestamp ? new Date(last.metadata.timestamp).getTime() : Date.now();
    const title = normalizeTitle(messages.find(m => m.type === 'user')?.content || 'New Conversation');
    return { id: session.id, title, messages, lastModified, pinned: false };
  }, []);

  const syncBackendSessions = useCallback(async () => {
    if (state.isProcessing) return;
    try {
      try { syncAbortRef.current?.abort(); } catch { /* ignore */ }
      const controller = new AbortController();
      syncAbortRef.current = controller;
      const signal = controller.signal;
      let token = localStorage.getItem('sessionToken');
      if (!token) {
        try {
          const r = await getGuestToken();
          if ((r?.success || r?.ok) && r?.token) {
            localStorage.setItem('sessionToken', r.token);
            token = r.token;
          }
        } catch { void 0; }
        if (!token) return;
      }
      const s = await getChatSessions({ signal });
      const list = s?.sessions || [];
      const convs = { ...state.conversations };
      for (const sess of list) {
        if (!sess?.id) continue;
        const detail = await getChatSessionById(sess.id, { signal });
        if (detail?.success && detail?.session) {
          const mapped = mapSessionToConversation(detail.session);
          convs[mapped.id] = mapped;
        }
      }
      if (Object.keys(convs).length > 0) {
        dispatch({ type: 'SET_CONVERSATIONS', payload: convs });
        const ids = Object.keys(convs).sort((a, b) => (convs[b].lastModified || 0) - (convs[a].lastModified || 0));
        if (!state.currentConversationId) {
          dispatch({ type: 'SELECT_CONVERSATION', payload: ids[0] });
        }
      }
    } catch (e) {
      if (e?.code === 'ERR_CANCELED' || /canceled|abort(ed)?/i.test(String(e?.message || ''))) {
        return;
      }
      if (e?.status !== 403) {
        console.warn('syncBackendSessions error:', e);
      }
    }
  }, [state.conversations, state.currentConversationId, state.isProcessing, mapSessionToConversation]);

  useEffect(() => {
    syncBackendSessions();
  }, [syncBackendSessions]);

  useEffect(() => {
    syncRef.current = syncBackendSessions;
  }, [syncBackendSessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (syncRef.current) syncRef.current();
    }, 20000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (syncRef.current) syncRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncBackendSessions]);

  useEffect(() => {
    // Save only when conversations change, not just when currentConversationId changes,
    // and ensure we don't save an empty state if no conversations exist.
    if (Object.keys(state.conversations).length > 0) {
      const dataToSave = {
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      };
      console.warn('[useEffect] Saving to localStorage:', { conversationCount: Object.keys(dataToSave.conversations).length, currentId: dataToSave.currentConversationId });
      try {
        localStorage.setItem(JOE_CHAT_HISTORY, JSON.stringify(dataToSave));
      } catch (e) {
        console.warn('Failed to save chat history:', e);
      }
    }
  }, [state.conversations, state.currentConversationId]);

  useEffect(() => {
    try {
      const event = new CustomEvent('joe:processing', { detail: { processing: state.isProcessing, step: state.currentStep, progress: state.progress } });
      window.dispatchEvent(event);
    } catch { void 0; }
  }, [state.isProcessing, state.currentStep, state.progress]);

  useEffect(() => {
    const connect = () => {
      if (isConnectingRef.current) return;
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
      const validateToken = async () => {
        let t = localStorage.getItem('sessionToken');
        const needsRefresh = () => {
          if (!t) return true;
          try {
            const p = JSON.parse(atob((t.split('.')[1]) || ''));
            const exp = p?.exp;
            return typeof exp === 'number' ? (Date.now() / 1000) >= (exp - 30) : false;
          } catch {
            return false;
          }
        };
        if (needsRefresh()) {
          try {
            const r = await getGuestToken();
            if (r?.ok && r?.token) {
              localStorage.setItem('sessionToken', r.token);
              t = r.token;
            }
          } catch { void 0; }
        }
        return t || null;
      };
      isConnectingRef.current = true;
      validateToken().then((sessionToken) => {
        if (!sessionToken) {
          isConnectingRef.current = false;
          return;
        }
        // Use VITE_WS_URL if defined, otherwise build from VITE_API_BASE_URL
        let wsUrl;
        if (import.meta.env.VITE_WS_URL) {
          const baseWsUrl = import.meta.env.VITE_WS_URL.replace(/\/ws.*$/, '');
          wsUrl = `${baseWsUrl}/ws/joe-agent?token=${sessionToken}`;
        } else {
          const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
          wsUrl = `${wsBase}/ws/joe-agent?token=${sessionToken}`;
        }
        console.warn('[Joe Agent] Connecting to WebSocket:', wsUrl.replace(/token=.*/, 'token=***'));
        ws.current = new WebSocket(wsUrl);
        const connectionTimeout = setTimeout(() => {
          if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
            try { ws.current.close(); } catch { void 0; }
          }
        }, 10000);
        ws.current.onopen = () => {
          clearTimeout(connectionTimeout);
          reconnectAttempts.current = 0;
          isConnectingRef.current = false;
          if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
          }
          if (reconnectCountdownInterval.current) {
            clearInterval(reconnectCountdownInterval.current);
            reconnectCountdownInterval.current = null;
          }
          dispatch({ type: 'SET_WS_CONNECTED', payload: true });
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { active: false, attempt: 0, delayMs: 0, etaTs: 0 } });
          dispatch({ type: 'ADD_WS_LOG', payload: '[WS] Connection established' });
        };
        ws.current.onclose = (e) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          const code = e?.code;
          const reason = e?.reason || '';
          dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Connection closed (code=${code} reason=${reason}). Reconnecting...` });
          const shouldResetToken = code === 1008 || /invalid token|malformed|signature/i.test(reason);
          if (shouldResetToken) {
            try { localStorage.removeItem('sessionToken'); } catch { void 0; }
          }
          dispatch({ type: 'SET_WS_CONNECTED', payload: false });
          const attempt = (reconnectAttempts.current || 0) + 1;
          reconnectAttempts.current = attempt;
          const jitter = Math.floor(Math.random() * 500);
          let delay = Math.min(30000, 1000 * Math.pow(2, attempt)) + jitter;
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            delay = Math.max(delay, 5000);
          }
          const eta = Date.now() + delay;
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { active: true, attempt, delayMs: delay, etaTs: eta } });
          if (reconnectCountdownInterval.current) clearInterval(reconnectCountdownInterval.current);
          reconnectCountdownInterval.current = setInterval(() => {
            const remaining = Math.max(0, eta - Date.now());
            dispatch({ type: 'SET_RECONNECT_REMAINING', payload: remaining });
          }, 250);
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(async () => {
            if (shouldResetToken) {
              try {
                const r = await getGuestToken();
                if (r?.ok && r?.token) localStorage.setItem('sessionToken', r.token);
              } catch { void 0; }
            }
            connect();
          }, delay);
        };
        ws.current.onerror = (err) => {
          dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Error: ${err.message}` });
          const m = String(err?.message || '').toLowerCase();
          if (m.includes('invalid') || m.includes('malformed') || m.includes('signature')) {
            try { localStorage.removeItem('sessionToken'); } catch { void 0; }
          }
        };
        
        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Received: ${event.data}` });

        switch(data.type) {
          case 'stream':
            dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: data.content } });
            break;
          case 'progress':
            dispatch({ type: 'SET_PROGRESS', payload: { progress: data.progress, step: data.step } });
            break;
          case 'task_complete':
            dispatch({ type: 'STOP_PROCESSING' });
            dispatch({ type: 'REMOVE_PENDING_LOGS' });
            if (syncRef.current) syncRef.current();
            break;
          case 'session_updated':
            if (syncRef.current) syncRef.current();
            break;
          // MODIFIED: Handle plan steps
          case 'thought':
            dispatch({ type: 'ADD_PLAN_STEP', payload: { type: 'thought', content: data.content } });
            break;
          case 'tool_used':
            dispatch({ type: 'ADD_PLAN_STEP', payload: { type: 'tool_used', content: data.tool, details: data.details } });
            break;
          case 'error':
            dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: `[ERROR]: ${data.message}` } });
            dispatch({ type: 'STOP_PROCESSING' });
            break;
          default:
            break;
          }
        };
      });
    };
    
    connect();
    const onOnline = () => {
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        reconnectAttempts.current = 0;
        connect();
      }
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (reconnectCountdownInterval.current) {
        clearInterval(reconnectCountdownInterval.current);
        reconnectCountdownInterval.current = null;
      }
      try { ws.current?.close(); } catch { void 0; }
    };
  }, []);

  useEffect(() => {
    const onForbidden = () => {
      const lang = getLang();
      const m = lang === 'ar' ? 'انتهت صلاحية جلسة الدخول أو ليس لديك إذن. يرجى تسجيل الدخول مرة أخرى.' : 'Your session expired or you lack permission. Please log in again.';
      dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: m } });
    };
    window.addEventListener('auth:forbidden', onForbidden);
    return () => window.removeEventListener('auth:forbidden', onForbidden);
  }, []);

  const handleSend = useCallback(() => {
    const inputText = state.input.trim();
    if (!inputText) return;
    dispatch({ type: 'SEND_MESSAGE', payload: inputText });

    const trySend = (attempt = 0) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        const selectedModel = localStorage.getItem('aiSelectedModel') || 'gpt-4o';
        const lang = getLang();
        ws.current.send(JSON.stringify({ action: 'instruct', message: inputText, sessionId: state.currentConversationId, model: selectedModel, lang }));
        return;
      }
      if (attempt < 6) {
        setTimeout(() => trySend(attempt + 1), 500);
        return;
      }
      const lang = getLang();
      const msg = lang === 'ar' ? 'اتصال WebSocket غير متاح حالياً، جارِ إعادة الاتصال بالخادم...' : 'WebSocket is not connected yet. Reconnecting...';
      dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: msg } });
      dispatch({ type: 'STOP_PROCESSING' });
    };
    trySend();
  }, [state.input, state.currentConversationId]);

  const stopProcessing = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'cancel' }));
    }
    dispatch({ type: 'STOP_PROCESSING' }); // This now also clears the plan
    dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: 'Processing stopped by user.' }});
  }, []);

  const handleConversationSelect = useCallback((id) => {
    dispatch({ type: 'SELECT_CONVERSATION', payload: id });
  }, []);

  const handleVoiceInput = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (state.isListening) {
      keepListeningRef.current = false;
      try { recognition.current?.stop(); } catch { void 0; }
      dispatch({ type: 'SET_LISTENING', payload: false });
      return;
    }
    try { recognition.current?.stop(); } catch { void 0; }
    recognition.current = new SR();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = getLang() === 'ar' ? 'ar-SA' : 'en-US';
    keepListeningRef.current = true;
    recognition.current.onstart = () => { isListeningRef.current = true; dispatch({ type: 'SET_LISTENING', payload: true }); };
    recognition.current.onend = () => {
      isListeningRef.current = false;
      if (keepListeningRef.current) {
        try { recognition.current?.start(); } catch { void 0; }
      } else {
        dispatch({ type: 'SET_LISTENING', payload: false });
      }
    };
    recognition.current.onerror = () => {
      if (keepListeningRef.current) {
        setTimeout(() => { try { recognition.current?.start(); } catch { void 0; } }, 400);
      } else {
        dispatch({ type: 'SET_LISTENING', payload: false });
      }
    };
    recognition.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      const interim = event.results[event.results.length - 1]?.[0]?.transcript || '';
      const text = (finalTranscript || interim).trim();
      if (text) dispatch({ type: 'SET_TRANSCRIPT', payload: text });
    };
    try { recognition.current.start(); } catch { void 0; }
  }, [state.isListening]);

  return {
    // ... (all existing returned values)
    conversations: Object.values(state.conversations).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastModified || 0) - (a.lastModified || 0);
    }),
    currentConversationId: state.currentConversationId,
    currentConversation: state.conversations[state.currentConversationId] || null,
    messages: state.conversations[state.currentConversationId]?.messages || [],
    isProcessing: state.isProcessing,
    progress: state.progress,
    currentStep: state.currentStep,
    input: state.input,
    setInput: (value) => dispatch({ type: 'SET_INPUT', payload: value }),
    isListening: state.isListening,
    transcript: state.transcript,
    wsLog: state.wsLog,
    wsConnected: state.wsConnected,
    reconnectActive: state.reconnectActive,
    reconnectAttempt: state.reconnectAttempt,
    reconnectRemainingMs: state.reconnectRemainingMs,
    reconnectDelayMs: state.reconnectDelayMs,
    handleSend,
    stopProcessing,
    handleNewConversation,
    handleConversationSelect,
    handleVoiceInput,
    renameConversation,
    deleteConversation,
    pinToggle: (id) => dispatch({ type: 'PIN_TOGGLE', payload: { id } }),
    duplicateConversation: (id) => dispatch({ type: 'DUPLICATE_CONVERSATION', payload: { id } }),
    clearMessages: (id) => dispatch({ type: 'CLEAR_MESSAGES', payload: { id } }),
    // NEWLY EXPORTED STATE
    plan: state.plan,
    addLogToChat: (log) => {
      const text = typeof log === 'string' ? log : (log?.text || JSON.stringify(log));
      const prefix = getLang() === 'ar' ? 'حل واصل العمل: ' : 'Diagnose and continue: ';
      dispatch({ type: 'SEND_MESSAGE', payload: `${prefix}${text}` });
      if (log && typeof log === 'object' && typeof log.id !== 'undefined') {
        dispatch({ type: 'ADD_PENDING_LOG', payload: log.id });
      }
    },
    addAllLogsToChat: () => {
      const lines = (state.wsLog || []).slice(-50).map(l => (typeof l === 'string') ? l : (l?.text || JSON.stringify(l))).join('\n');
      const header = getLang() === 'ar' ? 'سجل النظام الأخير:\n' : 'Recent system logs:\n';
      dispatch({ type: 'SEND_MESSAGE', payload: `${header}${lines}` });
    },
  };
};
