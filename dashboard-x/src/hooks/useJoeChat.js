
import { useReducer, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import apiClient from '../api/client';
import { v4 as uuidv4 } from 'uuid';
import { getChatSessions, getChatSessionById, getGuestToken, getSystemStatus, createChatSession, updateChatSession, addChatMessage, getChatMessages } from '../api/system';

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
            let convId = currentConversationId;
            let conv = currentConvo;
            if (!convId || !conv) {
                return {
                    ...state,
                    input: '',
                    isProcessing: true,
                    progress: 0,
                    currentStep: 'Processing...',
                    plan: [],
                };
            }
            const title = (!conv?.title || conv?.title === 'New Conversation') ? normalizeTitle(action.payload) : conv.title;
            const updatedConvo = { ...conv, title, lastModified: Date.now() };
            const nextConversations = { ...conversations, [convId]: updatedConvo };
            return {
                ...state,
                input: '',
                isProcessing: true,
                progress: 0,
                currentStep: 'Processing...',
                conversations: nextConversations,
                currentConversationId: convId,
                plan: [],
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
	            [convoId]: { id: convoId, title: 'New Conversation', messages: [], lastModified: Date.now(), pinned: false, sessionId: null },
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
            nextState.lastSentEcho = newMessage;
            nextState.lastSentEchoConvId = convoId;
	    // Note: SEND_MESSAGE should not set isProcessing, progress, currentStep, or plan.
	    // START_PROCESSING will handle that later.
	    return nextState;
        }

        case 'APPEND_MESSAGE': {
            let convoId = currentConversationId;
            let convo = currentConvo;
            if (!convoId) {
                convoId = uuidv4();
            }
            if (!convo) {
                const firstTitle = action.payload.type === 'user' ? normalizeTitle(action.payload.content) : 'New Conversation';
                convo = { id: convoId, title: firstTitle, messages: [], lastModified: Date.now(), pinned: false };
            }
            const lastMessage = convo.messages[convo.messages.length - 1];
            let updatedMessages;
            if (lastMessage && lastMessage.type === 'joe' && action.payload.type === 'joe') {
                updatedMessages = [...convo.messages.slice(0, -1), { ...lastMessage, content: lastMessage.content + action.payload.content }];
            } else {
                updatedMessages = [...convo.messages, { type: action.payload.type, content: action.payload.content, id: uuidv4() }];
            }
            const updatedConvo = { ...convo, messages: updatedMessages, lastModified: Date.now() };
            const nextConversations = { ...conversations, [convoId]: updatedConvo };
            return { ...state, conversations: nextConversations, currentConversationId: convoId };
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

        case 'CLEAR_WS_LOGS':
            return { ...state, wsLog: [], pendingHandledLogIds: [] };

        case 'CLEAR_ECHO':
            return { ...state, lastSentEcho: null, lastSentEchoConvId: null };

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
            // Keep current input to avoid sudden clearing while user is typing
            return { ...state, currentConversationId: action.payload, isProcessing: false, plan: [], progress: 0, currentStep: '' };

        case 'NEW_CONVERSATION': {
            const selectNew = typeof action.payload === 'object' ? (action.payload.selectNew !== false) : (action.payload !== false);
            const explicitId = (typeof action.payload === 'object' && action.payload.id) ? action.payload.id : null;
            const newId = explicitId || uuidv4();
            console.warn('[NEW_CONVERSATION] Creating new conversation with ID:', newId);
            const dynamicText = typeof action.payload === 'object' && action.payload.welcomeMessage ? action.payload.welcomeMessage : 'Welcome to Joe AI Assistant! 👋';
            const welcomeMessage = { type: 'joe', content: dynamicText, id: uuidv4() };
            const newConversations = {
                ...conversations,
                [newId]: { id: newId, title: 'New Conversation', messages: [welcomeMessage], lastModified: Date.now(), pinned: false, sessionId: (typeof action.payload === 'object' && action.payload.sessionId) ? action.payload.sessionId : null },
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

        case 'SET_SESSION_ID': {
            const { id, sessionId } = action.payload;
            const convo = state.conversations[id];
            if (!convo) return state;
            const updated = { ...convo, sessionId, lastModified: Date.now() };
            return { ...state, conversations: { ...state.conversations, [id]: updated } };
        }

        case 'SET_MESSAGES_FOR_CONVERSATION': {
            const { id, messages } = action.payload;
            const convo = state.conversations[id];
            if (!convo) return state;
            const updated = { ...convo, messages, lastModified: Date.now() };
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
  const sioRef = useRef(null);
  const recognition = useRef(null);
  const keepListeningRef = useRef(false);
  const isListeningRef = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const isConnectingRef = useRef(false);
  const reconnectCountdownInterval = useRef(null);
  const syncRef = useRef(null);
  const syncAbortRef = useRef(null);
  const syncInProgressRef = useRef(false);
  const syncRetryTimerRef = useRef(null);
  const syncBackoffRef = useRef(1000);
  const saveTimerRef = useRef(null);
  const sioSendTimeoutRef = useRef(null);
  const activeModelRef = useRef(null);

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
    lastSentEcho: null,
    lastSentEchoConvId: null,
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    const fetchActiveModel = async () => {
      try {
        const { data } = await apiClient.get('/api/v1/ai/providers', { signal });
        const m = data?.activeModel || null;
        if (m) activeModelRef.current = m;
      } catch { /* noop */ }
    };
    fetchActiveModel();
    const onRuntime = () => { fetchActiveModel(); };
    try { window.addEventListener('joe:runtime', onRuntime); } catch { /* noop */ }
    return () => { ac.abort(); try { window.removeEventListener('joe:runtime', onRuntime); } catch { /* noop */ } };
  }, []);

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
            const hint = getLang() === 'ar' ? 'تحليل الخطأ ومتابعة العمل: ' : 'Analyze error and continue: ';
            dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: `${hint}${text}` } });
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
  });

  // ... (useEffect for localStorage loading remains the same)
  const handleNewConversation = useCallback(async (selectNew = true) => {
    let toolsCount = 0;
    try {
      const controller = new AbortController();
      const status = await getSystemStatus({ signal: controller.signal });
      toolsCount = Number(status?.toolsCount || 0);
    } catch (err) {
      const m = String(err?.message || '');
      if (/canceled|abort(ed)?/i.test(m)) { /* ignore */ } else { toolsCount = 0; }
    }
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
    const sid = session._id || session.id;
    return { id: sid, title, messages, lastModified, pinned: false, sessionId: sid };
  }, []);

  const syncBackendSessions = useCallback(async () => {
    if (state.isProcessing) return;
    if (syncInProgressRef.current) return;
    try {
      syncInProgressRef.current = true;
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
      const seen = new Set();
      const validList = list.filter((sess) => {
        const id = String(sess?.id || '').trim();
        if (!id || seen.has(id)) return false;
        seen.add(id);
        const isObjId = /^[a-f0-9]{24}$/i.test(id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        return isObjId || isUuid;
      });
      const convs = { ...state.conversations };
      for (const sess of validList) {
        if (!sess?.id) continue;
        try {
          const detail = await getChatSessionById(sess.id, { signal });
          if (detail?.success && detail?.session) {
            const mapped = mapSessionToConversation(detail.session);
            convs[mapped.id] = mapped;
          }
        } catch (err) {
          const status = err?.status ?? err?.response?.status;
          const code = err?.code ?? err?.response?.data?.code;
          const notFound = status === 404 || String(err?.details?.error || code || '').toUpperCase() === 'NOT_FOUND';
          if (!notFound) {
            console.warn('syncBackendSessions detail fetch error:', err);
          }
          if (notFound && sess?.id) {
            try { delete convs[sess.id]; } catch { /* ignore */ }
          }
          continue;
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
      const status = e?.status ?? e?.response?.status;
      const code = e?.code ?? e?.response?.data?.code;
      const notFound = status === 404 || String(e?.details?.error || code || '').toUpperCase() === 'NOT_FOUND';
      if (e?.status !== 403 && !notFound) {
        console.warn('syncBackendSessions error:', e);
        try { dispatch({ type: 'ADD_WS_LOG', payload: { id: Date.now(), type: 'error', text: '[NET] فشل مزامنة الجلسات: ' + (e?.message || 'Network Error') } }); } catch { /* noop */ }
        try { if (syncRetryTimerRef.current) { clearTimeout(syncRetryTimerRef.current); syncRetryTimerRef.current = null; } } catch { /* noop */ }
        const delay = Math.min(Math.max(Number(syncBackoffRef.current || 1000), 500), 10000);
        syncRetryTimerRef.current = setTimeout(() => {
          try { syncBackendSessions(); } catch { /* noop */ }
        }, delay);
        syncBackoffRef.current = Math.min(delay * 2, 10000);
      }
    } finally {
      syncInProgressRef.current = false;
      try { if (!syncRetryTimerRef.current) { syncBackoffRef.current = 1000; } } catch { /* noop */ }
    }
  }, [state.conversations, state.currentConversationId, state.isProcessing, mapSessionToConversation]);

  useEffect(() => {
    syncBackendSessions();
  }, [syncBackendSessions]);

  useEffect(() => {
    syncRef.current = syncBackendSessions;
  }, [syncBackendSessions]);


  

  useEffect(() => {
    if (Object.keys(state.conversations).length > 0) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const payload = {
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      };
      const count = Object.keys(payload.conversations).length;
      const id = payload.currentConversationId;
      saveTimerRef.current = setTimeout(() => {
        try {
          if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            console.warn('[useEffect] Saving to localStorage:', { conversationCount: count, currentId: id });
          }
          const nextStr = JSON.stringify(payload);
          const prevStr = localStorage.getItem(JOE_CHAT_HISTORY);
          if (prevStr !== nextStr) {
            localStorage.setItem(JOE_CHAT_HISTORY, nextStr);
          }
        } catch (e) {
          try { console.warn('Failed to save chat history:', e); } catch { void 0; }
        }
      }, 400);
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
            const uid = String(p?.userId || '');
            const role = String(p?.role || '');
            const isObjectId = /^[a-f0-9]{24}$/i.test(uid);
            // Force refresh for legacy dev tokens or malformed super_admin IDs
            if (uid === 'super-admin-id-dev' || (role === 'super_admin' && !isObjectId)) {
              try { localStorage.removeItem('sessionToken'); } catch { void 0; }
              t = null;
              return true;
            }
            // Guest tokens are acceptable; only refresh when near expiry
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
        let sioUrl;
        const httpBase2 = typeof apiClient?.defaults?.baseURL === 'string'
          ? apiClient.defaults.baseURL
          : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
        const sanitizedHttp = String(httpBase2).replace(/\/+$/, '');
        let sioBase = sanitizedHttp;
        try {
          const u = new URL(sanitizedHttp);
          const isLocal = (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
          const devPorts = new Set(['4173','5173','3000']);
          if (isLocal && devPorts.has(u.port || '')) {
            sioBase = `${u.protocol}//${u.hostname}:4000`;
          } else if (u.hostname === 'www.xelitesolutions.com' || u.hostname === 'xelitesolutions.com') {
            sioBase = `${u.protocol}//api.xelitesolutions.com`;
          }
        } catch { /* noop */ }
        sioUrl = `${sioBase}/joe-agent`;
        const isDevLocal = (() => {
          try { const u = new URL(sioBase); return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && ['4173','5173','3000'].includes(u.port || ''); } catch { return false; }
        })();
        const initialTransports = isDevLocal ? ['websocket','polling'] : ['websocket','polling'];
        const socket = io(sioUrl, {
          auth: { token: sessionToken },
          path: '/socket.io',
          transports: initialTransports,
          upgrade: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 500,
          reconnectionDelayMax: 4000,
          timeout: 5000,
          forceNew: true,
          withCredentials: false,
        });
        socket.on('connect', () => {
          reconnectAttempts.current = 0;
          isConnectingRef.current = false;
          if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
          if (reconnectCountdownInterval.current) { clearInterval(reconnectCountdownInterval.current); reconnectCountdownInterval.current = null; }
          dispatch({ type: 'SET_WS_CONNECTED', payload: true });
          dispatch({ type: 'SET_RECONNECT_STATE', payload: { active: false, attempt: 0, delayMs: 0, etaTs: 0 } });
          dispatch({ type: 'ADD_WS_LOG', payload: '[SIO] Connection established' });
        });
        socket.on('disconnect', (reason) => {
          dispatch({ type: 'SET_WS_CONNECTED', payload: false });
          dispatch({ type: 'STOP_PROCESSING' });
          dispatch({ type: 'ADD_WS_LOG', payload: `[SIO] Disconnected: ${String(reason||'')}` });
        });
        socket.on('connect_error', async (err) => {
          const msg = String(err?.message || 'connect_error');
          if (/websocket error/i.test(msg)) {
            try { socket.io.opts.transports = ['polling']; socket.connect(); } catch { /* noop */ }
            return;
          }
          if (/xhr poll error|transport error/i.test(msg)) {
            try { socket.io.opts.transports = ['websocket']; socket.connect(); } catch { /* noop */ }
            return;
          }
          dispatch({ type: 'ADD_WS_LOG', payload: `[SIO] Connect error: ${msg}` });
          // If production and SIO keeps failing, fall back to native WebSocket automatically
          try {
            const h = window.location.hostname;
            const isProd = h && !(/localhost|127\.0\.0\.1/.test(h));
            if (isProd) {
              try { localStorage.setItem('joeUseWS', 'true'); } catch { /* noop */ }
              // Trigger WS path
              try { if (ws.current && ws.current.readyState !== WebSocket.CLOSED) { ws.current.close(); } } catch { /* noop */ }
            }
          } catch { /* noop */ }
          if (/INVALID_TOKEN|NO_TOKEN/i.test(msg)) {
            try { localStorage.removeItem('sessionToken'); } catch { /* noop */ }
            try {
              const r = await getGuestToken();
              if ((r?.ok || r?.success) && r?.token) {
                try { localStorage.setItem('sessionToken', r.token); } catch { /* noop */ }
                socket.auth = { token: r.token };
                try { socket.connect(); } catch { /* noop */ }
              }
            } catch { /* noop */ }
          }
        });
        socket.on('error', async (err) => {
          const msg = typeof err === 'string' ? err : String(err?.message || 'error');
          dispatch({ type: 'ADD_WS_LOG', payload: `[SIO] Error: ${msg}` });
          if (/xhr poll error|transport error/i.test(msg)) {
            try { socket.io.opts.transports = ['websocket']; socket.connect(); } catch { /* noop */ }
          }
          if (/INVALID_TOKEN|NO_TOKEN/i.test(msg)) {
            try { localStorage.removeItem('sessionToken'); } catch { /* noop */ }
            try {
              const r = await getGuestToken();
              if ((r?.ok || r?.success) && r?.token) {
                try { localStorage.setItem('sessionToken', r.token); } catch { /* noop */ }
                socket.auth = { token: r.token };
                try { socket.connect(); } catch { /* noop */ }
              }
            } catch { /* noop */ }
          }
        });
        socket.on('status', (d) => { dispatch({ type: 'ADD_WS_LOG', payload: `[SIO] ${JSON.stringify(d)}` }); });
        socket.on('stream', (d) => { if (typeof d?.content === 'string') { dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: d.content } }); } });
        socket.on('progress', (d) => { const p = Number(d?.progress || d?.pct || 0); const step = d?.step || d?.status || ''; dispatch({ type: 'SET_PROGRESS', payload: { progress: p, step } }); });
        socket.on('response', (d) => {
          const text = String(d?.response || '').trim();
          if (text) {
            try {
              const id = stateRef.current.currentConversationId;
              const msgs = id ? (stateRef.current.conversations[id]?.messages || []) : [];
              const last = msgs.length ? String(msgs[msgs.length - 1]?.content || '') : '';
              if (text !== last) {
                dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } });
              }
            } catch { dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } }); }
          }
          dispatch({ type: 'STOP_PROCESSING' });
          dispatch({ type: 'REMOVE_PENDING_LOGS' });
          try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
          if (syncRef.current) syncRef.current();
        });
        socket.on('task_complete', () => {
          dispatch({ type: 'STOP_PROCESSING' });
          dispatch({ type: 'REMOVE_PENDING_LOGS' });
          try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
          if (syncRef.current) syncRef.current();
        });
        socket.on('session_updated', () => { if (syncRef.current) syncRef.current(); });
        socket.on('error', (e) => {
          const msg = typeof e === 'string' ? e : (e?.message || 'ERROR');
          dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: `[ERROR]: ${msg}` } });
          dispatch({ type: 'STOP_PROCESSING' });
          try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
        });
        sioRef.current = socket;
        const useWs = (() => { try { return localStorage.getItem('joeUseWS') === 'true'; } catch { return false; } })();
        if (!useWs) {
          return;
        }
        let wsUrl;
        const baseCandidate = typeof apiClient?.defaults?.baseURL === 'string'
          ? apiClient.defaults.baseURL
          : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
        let wsBase;
        try {
          const u = new URL(String(baseCandidate).replace(/\/(api.*)?$/, '').replace(/\/+$/, ''));
          const isLocal = (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
          const devPorts = new Set(['4173','5173','3000']);
          let host = u.host;
          if (isLocal && devPorts.has(u.port || '')) {
            host = `${u.hostname}:4000`;
          } else if (u.hostname === 'www.xelitesolutions.com' || u.hostname === 'xelitesolutions.com') {
            host = 'api.xelitesolutions.com';
          }
          const proto = u.protocol === 'https:' ? 'wss' : 'ws';
          wsBase = `${proto}://${host}`;
        } catch {
          let origin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
          try {
            const u2 = new URL(String(origin));
            let host2 = u2.host;
            if (u2.hostname === 'www.xelitesolutions.com' || u2.hostname === 'xelitesolutions.com') {
              host2 = 'api.xelitesolutions.com';
            }
            const proto2 = u2.protocol === 'https:' ? 'wss' : 'ws';
            wsBase = `${proto2}://${host2}`;
          } catch {
            wsBase = 'ws://localhost:4000';
          }
        }
        wsUrl = `${wsBase}/ws/joe-agent?token=${sessionToken}`;
        let isValidWs = false;
        try {
          const u3 = new URL(wsUrl);
          isValidWs = (u3.protocol === 'ws:' || u3.protocol === 'wss:') && !!u3.host;
        } catch { isValidWs = false; }
        if (!isValidWs) {
          const hostFallback = (() => {
            try {
              const h = typeof window !== 'undefined' ? window.location.hostname : '';
              return h && !(/localhost|127\.0\.0\.1/.test(h)) ? 'api.xelitesolutions.com' : 'localhost:4000';
            } catch {
              return 'localhost:4000';
            }
          })();
          const protoFallback = (() => {
            try { return (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss' : 'ws'; } catch { return 'ws'; }
          })();
          wsUrl = `${protoFallback}://${hostFallback}/ws/joe-agent?token=${sessionToken}`;
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
          dispatch({ type: 'STOP_PROCESSING' });
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
        
        ws.current.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Received: ${event.data}` });

          const type = data.type || data.event || '';
          const isCompleteEvent = (
            type === 'task_complete' ||
            type === 'complete' ||
            type === 'completed' ||
            type === 'finished' ||
            type === 'finish' ||
            type === 'end' ||
            data.done === true ||
            data.final === true
          );

          if (type === 'stream') {
            if (typeof data.content === 'string') {
              dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: data.content } });
            }
            return;
          }

          if (type === 'progress' || type === 'progress_update') {
            const p = Number(data.progress || data.pct || 0);
            const step = data.step || data.status || '';
            dispatch({ type: 'SET_PROGRESS', payload: { progress: p, step } });
            return;
          }

          if (type === 'response' || typeof data.response === 'string') {
            const text = String(data.response || '').trim();
            if (text) {
              dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } });
              dispatch({ type: 'CLEAR_ECHO' });
              try {
                const id = stateRef.current.currentConversationId;
                const conv = stateRef.current.conversations[id];
                const sid = conv?.sessionId || id;
                if (sid) {
                  const r = await getChatMessages(sid);
                  const exists = (r?.messages || []).some(m => String(m?.content || '') === text && m?.type !== 'user');
                  if (!exists) {
                    await addChatMessage(sid, { type: 'joe', content: text });
                  }
                }
              } catch { void 0; }
            }
            try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
            dispatch({ type: 'STOP_PROCESSING' });
            dispatch({ type: 'REMOVE_PENDING_LOGS' });
            if (syncRef.current) syncRef.current();
            return;
          }

          if (type === 'session_updated') {
            if (syncRef.current) syncRef.current();
            return;
          }

          if (type === 'thought') {
            dispatch({ type: 'ADD_PLAN_STEP', payload: { type: 'thought', content: data.content } });
            return;
          }

          if (type === 'tool_used') {
            dispatch({ type: 'ADD_PLAN_STEP', payload: { type: 'tool_used', content: data.tool, details: data.details } });
            return;
          }

          if (type === 'error') {
            dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: `[ERROR]: ${data.message}` } });
            try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
            dispatch({ type: 'STOP_PROCESSING' });
            return;
          }

          if (isCompleteEvent) {
            dispatch({ type: 'STOP_PROCESSING' });
            dispatch({ type: 'REMOVE_PENDING_LOGS' });
            if (syncRef.current) syncRef.current();
            return;
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

  const handleSend = useCallback(async () => {
    const inputText = state.input.trim();
    if (!inputText) return;
    let convId = state.currentConversationId;
	    // 1. Update UI state immediately (append message, clear input, start processing)
	    dispatch({ type: 'SEND_MESSAGE', payload: inputText });
	    // 2. Start processing after UI update
	    dispatch({ type: 'START_PROCESSING', payload: inputText });
    let sid = null;
    try {
      let t = localStorage.getItem('sessionToken');
      if (!t) {
        const r = await getGuestToken();
        if (r?.ok && r?.token) {
          localStorage.setItem('sessionToken', r.token);
          t = r.token;
        }
      }
      const conv = state.conversations[convId] || null;
      sid = conv?.sessionId || null;
      if (!sid) {
        const created = await createChatSession(normalizeTitle(inputText));
        const s = created?.session;
        sid = s?._id || s?.id || null;
        if (sid) dispatch({ type: 'SET_SESSION_ID', payload: { id: convId, sessionId: sid } });
      } else {
        await updateChatSession(sid, { title: normalizeTitle(inputText) }).catch(() => {});
      }
      if (sid) {
        await addChatMessage(sid, { type: 'user', content: inputText }).catch(() => {});
      }
    } catch { void 0; }

    const trySend = (attempt = 0) => {
      if (sioRef.current && sioRef.current.connected) {
        let selectedModel = activeModelRef.current || localStorage.getItem('aiSelectedModel');
        if (!selectedModel) {
          selectedModel = null;
        }
        const lang = getLang();
        const conv = state.conversations[convId] || null;
        const sidToUse = conv?.sessionId || sid || null;
        const payload = { action: 'instruct', message: inputText, sessionId: sidToUse || undefined, lang };
        if (selectedModel) payload.model = selectedModel;
        sioRef.current.emit('message', payload);
        try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
        sioSendTimeoutRef.current = setTimeout(async () => {
          try {
            const ctx = { sessionId: sidToUse || undefined, lang };
            if (selectedModel) ctx.model = selectedModel;
            const { data } = await apiClient.post('/api/v1/joe/execute', { instruction: inputText, context: ctx });
            const text = String(data?.response || data?.message || '').trim();
            if (text) {
              try {
                const id = sidToUse;
                const msgs = id ? (state.conversations[id]?.messages || []) : [];
                const last = msgs.length ? String(msgs[msgs.length - 1]?.content || '') : '';
                if (text !== last) {
                  dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } });
                }
              } catch { dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } }); }
              try {
                const isObjId = typeof sidToUse === 'string' && /^[a-f0-9]{24}$/i.test(sidToUse);
                if (isObjId) {
                  const r = await getChatMessages(sidToUse);
                  const exists = (r?.messages || []).some(m => String(m?.content || '') === text && m?.type !== 'user');
                  if (!exists) { await addChatMessage(sidToUse, { type: 'joe', content: text }); }
                }
              } catch { /* noop */ }
            }
          } catch { /* noop */ } finally {
            dispatch({ type: 'STOP_PROCESSING' });
            dispatch({ type: 'REMOVE_PENDING_LOGS' });
            try { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } catch { /* noop */ }
            if (syncRef.current) syncRef.current();
          }
        }, 8000);
        return;
      }
      if (ws.current?.readyState === WebSocket.OPEN) {
        let selectedModel = activeModelRef.current || localStorage.getItem('aiSelectedModel');
        if (!selectedModel) {
          selectedModel = null;
        }
        const lang = getLang();
      const conv = state.conversations[convId] || null;
      const sidToUse = conv?.sessionId || sid || null;
        const msg = { action: 'instruct', message: inputText, sessionId: sidToUse, lang };
        if (selectedModel) msg.model = selectedModel;
        ws.current.send(JSON.stringify(msg));
        try { if (sioSendTimeoutRef.current) { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } } catch { /* noop */ }
        sioSendTimeoutRef.current = setTimeout(async () => {
          try {
            const ctx2 = { sessionId: sidToUse || undefined, lang };
            if (selectedModel) ctx2.model = selectedModel;
            const { data } = await apiClient.post('/api/v1/joe/execute', { instruction: inputText, context: ctx2 });
            const text = String(data?.response || data?.message || '').trim();
            if (text) {
              dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } });
              try {
                const isObjId = typeof sidToUse === 'string' && /^[a-f0-9]{24}$/i.test(sidToUse);
                if (isObjId) {
                  const r = await getChatMessages(sidToUse);
                  const exists = (r?.messages || []).some(m => String(m?.content || '') === text && m?.type !== 'user');
                  if (!exists) { await addChatMessage(sidToUse, { type: 'joe', content: text }); }
                }
              } catch { /* noop */ }
            }
          } catch { /* noop */ } finally {
            dispatch({ type: 'STOP_PROCESSING' });
            dispatch({ type: 'REMOVE_PENDING_LOGS' });
            try { clearTimeout(sioSendTimeoutRef.current); sioSendTimeoutRef.current = null; } catch { /* noop */ }
            if (syncRef.current) syncRef.current();
          }
        }, 8000);
        return;
      }
      if (attempt < 12) {
        setTimeout(() => trySend(attempt + 1), 500);
        return;
      }
      (async () => {
        let selectedModel = activeModelRef.current || localStorage.getItem('aiSelectedModel');
        if (!selectedModel) {
          selectedModel = null;
        }
        const lang = getLang();
        const conv = state.conversations[convId] || null;
        const sidToUse = conv?.sessionId || sid || null;
        try {
          const { data } = await apiClient.post('/api/v1/joe/execute', {
            instruction: inputText,
            context: (() => { const c = { sessionId: sidToUse || undefined, lang }; if (selectedModel) c.model = selectedModel; return c; })()
          });
          const text = String(data?.response || data?.message || '').trim();
          if (text) {
            dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: text } });
            try {
              const isObjId = typeof sidToUse === 'string' && /^[a-f0-9]{24}$/i.test(sidToUse);
              if (isObjId) {
                const r = await getChatMessages(sidToUse);
                const exists = (r?.messages || []).some(m => String(m?.content || '') === text && m?.type !== 'user');
                if (!exists) {
                  await addChatMessage(sidToUse, { type: 'joe', content: text });
                }
              }
            } catch { /* ignore */ }
          }
        } catch (e) {
          const m = lang === 'ar' ? 'فشل الإرسال عبر REST، حاول لاحقًا.' : 'REST fallback failed, please try again later.';
          dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: `${m} ${e?.message || ''}`.trim() } });
        } finally {
          dispatch({ type: 'STOP_PROCESSING' });
          dispatch({ type: 'REMOVE_PENDING_LOGS' });
          if (syncRef.current) syncRef.current();
        }
      })();
    };
    trySend();
  }, [state.input, state.currentConversationId, state.conversations]);

  useEffect(() => {
    const id = state.currentConversationId;
    if (!id) return;
    if (state.isProcessing) return;
    const convo = state.conversations[id];
    const sid = convo?.sessionId || id;
    if (!sid) return;
    const isMongoObjectId = /^[a-f0-9]{24}$/i.test(String(sid));
    if (!isMongoObjectId) {
      return;
    }
    (async () => {
      try {
        const r = await getChatMessages(sid);
        const fetched = (r?.messages || []).map(m => ({ type: m.type === 'user' ? 'user' : 'joe', content: m.content, id: m._id || uuidv4() }));
        const local = state.conversations[id]?.messages || [];
        const seen = new Set(fetched.map(m => `${m.type}:${m.content}`));
        const merged = [...fetched];
        for (const lm of local) {
          const key = `${lm.type}:${lm.content}`;
          if (!seen.has(key)) merged.push(lm);
        }
        dispatch({ type: 'SET_MESSAGES_FOR_CONVERSATION', payload: { id, messages: merged } });
      } catch { void 0; }
    })();
  }, [state.currentConversationId, state.conversations, state.isProcessing]);

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
    messages: (() => {
      const msgs = state.conversations[state.currentConversationId]?.messages || [];
      if (msgs.length === 0 && state.lastSentEcho && state.lastSentEchoConvId === state.currentConversationId) {
        return [state.lastSentEcho];
      }
      return msgs;
    })(),
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
    clearLogs: () => dispatch({ type: 'CLEAR_WS_LOGS' }),
    appendUserMessage: (text) => {
      const content = String(text || '').trim();
      if (!content) return;
      dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'user', content } });
    },
  };
};
