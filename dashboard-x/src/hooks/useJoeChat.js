
import { useReducer, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getChatSessions, getChatSessionById, getGuestToken } from '../api/system';

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

        case 'SET_CONVERSATIONS':
            return { ...state, conversations: action.payload };

        case 'SELECT_CONVERSATION':
            // Ensure full state reset to force re-render and clear old input/processing state
            return { ...state, currentConversationId: action.payload, isProcessing: false, input: '', plan: [], progress: 0, currentStep: '' };

        case 'NEW_CONVERSATION': {
            const selectNew = action.payload !== false;
            const newId = uuidv4();
            console.log('[NEW_CONVERSATION] Creating new conversation with ID:', newId);
            const lang = getLang();
            const welcomeEn = 'Welcome to Joe AI Assistant! 👋\n\nYour AI-powered engineering partner with 82 tools and functions.\n\nI can help you with:\n💬 Chat & Ask - Get instant answers and explanations\n🛠️ Build & Create - Generate projects and applications\n🔍 Analyze & Process - Work with data and generate insights\n\nStart by typing an instruction below, attaching a file, or using your voice.';
            const welcomeAr = 'مرحبًا بك في مساعد جو الذكي! 👋\n\nشريكك الهندسي المدعوم بالذكاء مع 82 أداة ووظيفة.\n\nأستطيع مساعدتك في:\n💬 المحادثة والسؤال - إجابات وشروحات فورية\n🛠️ البناء والإنشاء - توليد مشاريع وتطبيقات\n🔍 التحليل والمعالجة - العمل مع البيانات وتوليد رؤى\n\nابدأ بكتابة تعليماتك أدناه أو إرفاق ملف أو استخدام الصوت.';
            const welcomeMessage = { type: 'joe', content: lang === 'ar' ? welcomeAr : welcomeEn, id: uuidv4() };
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
            console.log('[NEW_CONVERSATION] New state:', { conversationCount: Object.keys(newState.conversations).length, currentId: newState.currentConversationId });
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
            const { [id]: _, ...rest } = state.conversations;
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
    plan: [], // Initial state for the plan
  });

  // ... (useEffect for localStorage loading remains the same)
  const handleNewConversation = useCallback((selectNew = true) => {
    dispatch({ type: 'NEW_CONVERSATION', payload: selectNew });
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
    try {
      let token = localStorage.getItem('sessionToken');
      if (!token) {
        try {
          const r = await getGuestToken();
          if (r?.ok && r?.token) {
            localStorage.setItem('sessionToken', r.token);
            token = r.token;
          }
        } catch {}
        if (!token) return;
      }
      const s = await getChatSessions();
      const list = s?.sessions || [];
      const convs = { ...state.conversations };
      for (const sess of list) {
        if (!sess?.id) continue;
        const detail = await getChatSessionById(sess.id);
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
      // Ignore 403 Forbidden gracefully
      if (e?.status !== 403) {
        console.warn('syncBackendSessions error:', e);
      }
    }
  }, [state.conversations, state.currentConversationId, mapSessionToConversation]);

  useEffect(() => {
    syncBackendSessions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      syncBackendSessions();
    }, 20000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncBackendSessions();
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
      console.log('[useEffect] Saving to localStorage:', { conversationCount: Object.keys(dataToSave.conversations).length, currentId: dataToSave.currentConversationId });
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
    } catch {}
  }, [state.isProcessing, state.currentStep, state.progress]);

  useEffect(() => {
    const connect = () => {
      let sessionToken = localStorage.getItem('sessionToken');
      const ensureToken = async () => {
        if (!sessionToken) {
          try {
            const r = await getGuestToken();
            if (r?.ok && r?.token) {
              localStorage.setItem('sessionToken', r.token);
              sessionToken = r.token;
            }
          } catch {}
        }
      };
      // Ensure token before attempting connection
      ensureToken().then(() => {
        if (!sessionToken) return;
        // Use VITE_WS_URL if defined, otherwise build from VITE_API_BASE_URL
        let wsUrl;
        if (import.meta.env.VITE_WS_URL) {
          // Use predefined WebSocket URL and append token
          // التأكد من استخدام المسار الصحيح /ws/joe-agent حتى لو كان VITE_WS_URL مُعرفًا
          const baseWsUrl = import.meta.env.VITE_WS_URL.replace(/\/ws.*$/, ''); // إزالة أي مسار موجود
          wsUrl = `${baseWsUrl}/ws/joe-agent?token=${sessionToken}`;
        } else {
          // Build from API base URL (dev/local friendly)
          const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
          wsUrl = `${wsBase}/ws/joe-agent?token=${sessionToken}`;
        }
        // Diagnostic log to verify WebSocket URL
        console.log('[Joe Agent] Connecting to WebSocket:', wsUrl.replace(/token=.*/, 'token=***'));
        ws.current = new WebSocket(wsUrl);
        ws.current.onopen = () => dispatch({ type: 'ADD_WS_LOG', payload: '[WS] Connection established' });
        ws.current.onclose = (e) => {
          const code = e?.code;
          const reason = e?.reason || '';
          dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Connection closed (code=${code} reason=${reason}). Reconnecting...` });
          // If policy violation or invalid token, clear token and fetch a new guest token before reconnecting
          const shouldResetToken = code === 1008 || /invalid token|malformed|signature/i.test(reason);
          if (shouldResetToken) {
            try { localStorage.removeItem('sessionToken'); } catch {}
          }
          setTimeout(async () => {
            if (shouldResetToken) {
              try {
                const r = await getGuestToken();
                if (r?.ok && r?.token) localStorage.setItem('sessionToken', r.token);
              } catch {}
            }
            connect();
          }, 1000);
        };
        ws.current.onerror = (err) => {
          dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Error: ${err.message}` });
          const m = String(err?.message || '').toLowerCase();
          if (m.includes('invalid') || m.includes('malformed') || m.includes('signature')) {
            try { localStorage.removeItem('sessionToken'); } catch {}
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
            syncBackendSessions();
            break;
          case 'session_updated':
            syncBackendSessions();
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
    return () => ws.current?.close();
  }, []);

  useEffect(() => {
    const onForbidden = (e) => {
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
    // Single action ensures conversation creation, title update, and message append
    dispatch({ type: 'SEND_MESSAGE', payload: inputText });

    // Send via WebSocket
    if (ws.current?.readyState === WebSocket.OPEN) {
      const selectedModel = localStorage.getItem('aiSelectedModel') || 'gpt-4o';
      const lang = getLang();
      ws.current.send(JSON.stringify({ action: 'instruct', message: inputText, sessionId: state.currentConversationId, model: selectedModel, lang }));
    } else {
      const lang = getLang();
      const msg = lang === 'ar' ? 'اتصال WebSocket غير متاح حالياً، جارِ إعادة الاتصال بالخادم...' : 'WebSocket is not connected yet. Reconnecting...';
      dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: msg } });
      dispatch({ type: 'STOP_PROCESSING' });
    }
  }, [state.input]);

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
    // ... (voice logic remains unchanged)
    if (state.isListening) {
        recognition.current?.stop();
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'en-US';
    recognition.current.onstart = () => dispatch({ type: 'SET_LISTENING', payload: true });
    recognition.current.onend = () => dispatch({ type: 'SET_LISTENING', payload: false });
    recognition.current.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0]).map(r => r.transcript).join('');
      dispatch({ type: 'SET_TRANSCRIPT', payload: transcript });
    };
    recognition.current.start();
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
  };
};
