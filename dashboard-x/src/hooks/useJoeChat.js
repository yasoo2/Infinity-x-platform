
import { useReducer, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const JOE_CHAT_HISTORY = 'joeChatHistory';

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
            const title = currentConvo?.title === 'New Conversation' ? action.payload.substring(0, 40) + '...' : currentConvo.title;
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
            return { ...state, currentConversationId: action.payload, isProcessing: false, input: '', plan: [] };

        case 'NEW_CONVERSATION': {
            const newId = uuidv4();
            const newConversations = {
                ...conversations,
                [newId]: { id: newId, title: 'New Conversation', messages: [], lastModified: Date.now() },
            };
            return {
                ...state,
                conversations: newConversations,
                currentConversationId: newId,
                input: '',
                isProcessing: false,
                plan: [],
            };
        }

        // NEW ACTIONS FOR THE RIGHT PANEL
        case 'ADD_PLAN_STEP':
            return { ...state, plan: [...state.plan, action.payload] };
        
        case 'CLEAR_PLAN':
            return { ...state, plan: [] };

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
  const handleNewConversation = useCallback(() => {
    dispatch({ type: 'NEW_CONVERSATION' });
  }, []);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(JOE_CHAT_HISTORY);
      if (savedHistory) {
        const { conversations, currentConversationId } = JSON.parse(savedHistory);
        if (conversations && Object.keys(conversations).length > 0) {
          dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
          dispatch({ type: 'SELECT_CONVERSATION', payload: currentConversationId || Object.keys(conversations)[0] });
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

  useEffect(() => {
    if (state.currentConversationId && Object.keys(state.conversations).length > 0) {
      const dataToSave = {
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      };
      localStorage.setItem(JOE_CHAT_HISTORY, JSON.stringify(dataToSave));
    }
  }, [state.conversations, state.currentConversationId]);

  useEffect(() => {
    const connect = () => {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;
      // Use VITE_WS_URL if defined, otherwise build from VITE_API_BASE_URL
      let wsUrl;
      if (import.meta.env.VITE_WS_URL) {
        // Use predefined WebSocket URL and append token
        // التأكد من استخدام المسار الصحيح /ws/joe-agent حتى لو كان VITE_WS_URL مُعرفًا
        const baseWsUrl = import.meta.env.VITE_WS_URL.replace(/\/ws.*$/, ''); // إزالة أي مسار موجود
        wsUrl = `${baseWsUrl}/ws/joe-agent?token=${sessionToken}`;
      } else {
        // Fallback: build from API base URL
        // استخدام api.xelitesolutions.com بشكل افتراضي
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.xelitesolutions.com';
        const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
        // تم تعديل المسار ليتطابق مع مسار خادم Joe Agent
        wsUrl = `${wsBase}/ws/joe-agent?token=${sessionToken}`;
      }
      // Diagnostic log to verify WebSocket URL
      console.log('[Joe Agent] Connecting to WebSocket:', wsUrl.replace(/token=.*/, 'token=***'));
      ws.current = new WebSocket(wsUrl);
      ws.current.onopen = () => dispatch({ type: 'ADD_WS_LOG', payload: '[WS] Connection established' });
      ws.current.onclose = () => setTimeout(connect, 3000);
      ws.current.onerror = (err) => dispatch({ type: 'ADD_WS_LOG', payload: `[WS] Error: ${err.message}` });
      
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
    };
    connect();
    return () => ws.current?.close();
  }, []);

  const handleSend = useCallback(() => {
    if (state.input.trim() && state.currentConversationId) {
      dispatch({ type: 'START_PROCESSING', payload: state.input }); // This now also clears the plan
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'execute', command: state.input }));
      } else {
        dispatch({ type: 'APPEND_MESSAGE', payload: { type: 'joe', content: 'WebSocket not connected. Please wait.' } });
      }
    }
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
    conversations: Object.values(state.conversations).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0)),
    currentConversation: state.currentConversationId,
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
    // NEWLY EXPORTED STATE
    plan: state.plan,
  };
};
