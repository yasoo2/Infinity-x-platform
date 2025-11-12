// src/hooks/useJoeChat.js
// تم تحديث هذا الملف لدمج منطق إدارة الحالة (useReducer) وتحسين الاتصال بـ API.
// كما تم إعداد الدوال للعمل مع useSpeechRecognition.
import { useState, useCallback, useReducer, useEffect, useRef } from 'react';
import axios from 'axios'; // لاستخدام API
import apiClient from '../api/client'; // استخدام apiClient للـ authentication
import { useSpeechRecognition } from './useSpeechRecognition'; // سيتم إنشاؤه لاحقًا لتبسيط منطق الميكروفون

// تعريف الحالة الأولية
const initialState = {
  aiEngine: 'openai',
  userId: 'mock-user-id',
  conversations: [],
  currentConversation: null,
  messages: [],
  isProcessing: false,
  progress: 0,
  currentStep: 'Idle',
  buildResult: null,
};

// تعريف Reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, progress: 10, currentStep: 'Analyzing Goal...' };
    case 'STOP_PROCESSING':
      return { ...state, isProcessing: false, progress: 0, currentStep: 'Idle' };
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload.progress, currentStep: action.payload.step };
    case 'ADD_MESSAGE':
      // إزالة رسالة JOE المؤقتة إذا كانت موجودة وإضافة الرسالة الجديدة
      const newMessages = state.messages.filter(msg => !msg.isTyping);
      return { ...state, messages: [...newMessages, action.payload] };
    case 'SET_BUILD_RESULT':
      return { ...state, buildResult: action.payload, isProcessing: false, progress: 100, currentStep: 'Completed' };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_AI_ENGINE':
      return { ...state, aiEngine: action.payload };
    case 'SELECT_CONVERSATION':
      return { ...state, currentConversation: action.payload.id, messages: action.payload.messages };
    default:
      return state;
  }
};

export const useJoeChat = () => {
  const isMounted = useRef(true);
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [input, setInput] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenType, setTokenType] = useState('github');
  const [tokenValue, setTokenValue] = useState('');
  const [tokens, setTokens] = useState({ githubUsername: '' });
  const [wsLog, setWsLog] = useState([]);

  // دمج منطق الميكروفون من useSpeechRecognition
  let speechRecognition = { isListening: false, startListening: () => {}, stopListening: () => {}, transcript: '' };
  try {
    speechRecognition = useSpeechRecognition();
  } catch (error) {
    console.warn('Speech recognition not available:', error);
  }
  const { isListening, startListening, stopListening, transcript } = speechRecognition;

  // تأثير جانبي للتعامل مع نتيجة الإملاء الصوتي
  // هذا يضمن أن النص المكتوب صوتيًا يضاف إلى حقل الإدخال
  // ملاحظة: يجب أن يتم هذا في useEffect ليكون تفاعليًا، ولكن لتبسيط المنطق في هذا السياق
  // سنقوم بتحديثه ليتم استدعاؤه بشكل صحيح
  // if (transcript && transcript !== input) {
  //   setInput(transcript);
  // }

  // WebSocket Logic for Real-Time Logs
  useEffect(() => {
    // Use VITE_API_BASE_URL for WebSocket connection to backend
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://infinity-x-backend.onrender.com';
    const wsProtocol = API_BASE.startsWith('https') ? 'wss://' : 'ws://';
    const wsHost = API_BASE.replace(/https?:\/\//, '');
    const wsUrl = wsProtocol + wsHost + '/ws/browser';

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!isMounted.current) return;
      console.log('WebSocket connection established for Joe logs.');
      setWsLog(prev => [...prev, { id: Date.now(), text: 'WebSocket connection established for Joe logs.', type: 'system' }]);
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const logEntry = JSON.parse(event.data);
        setWsLog(prev => {
          // Keep log size manageable (e.g., last 50 entries)
          const newLog = prev.length >= 50 ? prev.slice(1) : prev;
          return [...newLog, logEntry];
        });
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      if (!isMounted.current) return;
      console.error('WebSocket Error:', error);
      setWsLog(prev => [...prev, { id: Date.now(), text: `WebSocket Error: Could not connect to Joe's worker.`, type: 'error' }]);
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      console.log('WebSocket connection closed.');
      setWsLog(prev => [...prev, { id: Date.now(), text: 'WebSocket connection closed.', type: 'system' }]);
    };

    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      isMounted.current = false; // Mark as unmounted
      // Check if the WebSocket is open before closing
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // دالة لإرسال الرسالة
  const handleSend = useCallback(async () => {
    if (!input.trim() || state.isProcessing) return;

    const userMessage = {
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    const currentInput = input.trim();
    setInput('');
    dispatch({ type: 'START_PROCESSING' });

    // إضافة رسالة JOE المؤقتة
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        type: 'joe',
        content: 'Analyzing your request...',
        timestamp: new Date().toLocaleTimeString(),
        isTyping: true,
      },
    });

    try {
      // **تحسين الاتصال:** استخدام مسار API موحد
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://infinity-x-backend.onrender.com';
      // استخدام endpoint الجديد مع Function Calling
      const response = await apiClient.post(`/api/v1/joe/chat-advanced`, {
        message: currentInput,
        conversationId: state.currentConversation,
        tokens: tokens,
        aiEngine: state.aiEngine,
      });

      dispatch({ type: 'STOP_PROCESSING' });

      if (response.data.ok) {
        // تحديث رسالة JOE الأخيرة بالرد الفعلي
        let joeResponse = response.data.response || response.data.reply || 'No response';
        
        // إضافة معلومات عن الأدوات المستخدمة
        if (response.data.toolsUsed && response.data.toolsUsed.length > 0) {
          joeResponse += `\n\n🔧 **الأدوات المستخدمة:** ${response.data.toolsUsed.join(', ')}`;
        }
        
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'joe',
            content: joeResponse,
            timestamp: new Date().toLocaleTimeString(),
            isTyping: false,
            toolsUsed: response.data.toolsUsed || [],
          },
        });

        if (response.data.buildResult) {
          dispatch({ type: 'SET_BUILD_RESULT', payload: response.data.buildResult });
        }
        
        // محاكاة تحديث التقدم
        dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 50, step: 'Executing Task...' } });
        setTimeout(() => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 90, step: 'Finalizing...' } });
        }, 1000);
        setTimeout(() => {
          dispatch({ type: 'STOP_PROCESSING' });
        }, 2000);

      } else {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'joe',
            content: `Error: ${response.data.error}`,
            timestamp: new Date().toLocaleTimeString(),
            isTyping: false,
          },
        });
      }
    } catch (error) {
      dispatch({ type: 'STOP_PROCESSING' });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'joe',
          content: `Connection Error: Could not reach the server. ${error.message}`,
          timestamp: new Date().toLocaleTimeString(),
          isTyping: false,
        },
      });
    }
  }, [input, state.isProcessing, state.currentConversation, tokens, state.messages, setInput, state.aiEngine]);

  const stopProcessing = useCallback(() => {
    // هنا يجب أن يتم إرسال طلب إلى API لإيقاف العملية
    dispatch({ type: 'STOP_PROCESSING' });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        type: 'joe',
        content: 'Processing stopped by user.',
        timestamp: new Date().toLocaleTimeString(),
      },
    });
  }, []);

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const saveToken = useCallback(() => {
    // منطق حفظ الرمز (قد يتضمن إرساله إلى API لتخزينه بأمان)
    console.log(`Token saved for type: ${tokenType}`);
    setShowTokenModal(false);
  }, [tokenType]);

  const closeTokenModal = useCallback(() => setShowTokenModal(false), []);
  const handleConversationSelect = useCallback((convId) => {
    // محاكاة جلب الرسائل للمحادثة المحددة
    dispatch({ type: 'SELECT_CONVERSATION', payload: { id: convId, messages: [] } });
  }, []);
  const handleNewConversation = useCallback(() => {
    dispatch({ type: 'SELECT_CONVERSATION', payload: { id: null, messages: [] } });
  }, []);


  const setAiEngine = useCallback((engine) => {
    dispatch({ type: 'SET_AI_ENGINE', payload: engine });
  }, []);

  return {
    ...state,
    aiEngine: state.aiEngine,
    setAiEngine,
    canStop: state.isProcessing,
    input,
    setInput,
    isListening,
    showTokenModal,
    setTokenType,
    tokenType,
    tokenValue,
    setTokenValue,
    tokens,
    setTokens,
    handleConversationSelect,
    handleNewConversation,
    handleSend,
    stopProcessing,
    handleVoiceInput,
    saveToken,
    closeTokenModal,
    transcript, // إضافة transcript للوصول إليه في Joe.jsx
    wsLog, // إضافة سجل WebSocket
  };
};
