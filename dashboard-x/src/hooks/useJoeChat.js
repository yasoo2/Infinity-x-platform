
import { useState, useCallback, useReducer, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

const initialState = {
  userId: 'joe-user-1',
  conversations: [],
  currentConversation: null,
  messages: [],
  isProcessing: false,
  progress: 0,
  currentStep: 'Idle',
};

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, progress: 0, currentStep: 'Connecting...', messages: [...state.messages, action.payload] };
    case 'STOP_PROCESSING':
      return { ...state, isProcessing: false };
    case 'ADD_MESSAGE':
       // Avoid duplicating the user message if it's already there
      if (state.messages.some(msg => msg.id === action.payload.id)) return state;
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_JOE_RESPONSE':
        const newMessages = [...state.messages];
        const joeMsgIndex = newMessages.findIndex(msg => msg.id === 'joe-response');
        if (joeMsgIndex !== -1) {
            newMessages[joeMsgIndex].content = action.payload;
        } else {
            newMessages.push({ id: 'joe-response', type: 'joe', content: action.payload, timestamp: new Date().toLocaleTimeString() });
        }
        return { ...state, messages: newMessages };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload.progress, currentStep: action.payload.step };
    case 'SELECT_CONVERSATION':
      return { ...state, currentConversation: action.payload.id, messages: action.payload.messages };
    default:
      return state;
  }
};

export const useJoeChat = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [input, setInput] = useState('');
  const [wsLog, setWsLog] = useState(''); // Changed to a single string for continuous log
  const ws = useRef(null);

  const { isListening, startListening, stopListening, transcript } = useSpeechRecognition();

  useEffect(() => {
    // Connect to WebSocket on component mount
    // The address should point to your actual backend WebSocket server
    const API_WS_URL = import.meta.env.VITE_API_WS_URL || 'wss://admin.xelitesolutions.com/ws/v1/joe';
    
    ws.current = new WebSocket(API_WS_URL);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setWsLog(prev => prev + '[SYSTEM] Connection Established.\n');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Append every message to the live log screen
      setWsLog(prev => prev + `[JOE] ${JSON.stringify(data)}\n`);

      switch (data.type) {
        case 'status':
          dispatch({ type: 'SET_PROGRESS', payload: { progress: data.progress, step: data.step } });
          break;
        case 'responseChunk':
          dispatch({ type: 'UPDATE_JOE_RESPONSE', payload: data.content });
          break;
        case 'finalResponse':
          dispatch({ type: 'UPDATE_JOE_RESPONSE', payload: data.content });
          dispatch({ type: 'STOP_PROCESSING' });
          break;
        case 'error':
            dispatch({ type: 'ADD_MESSAGE', payload: { type: 'joe', content: `Error: ${data.message}`, timestamp: new Date().toLocaleTimeString() } });
            dispatch({ type: 'STOP_PROCESSING' });
            break;
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setWsLog(prev => prev + '[SYSTEM] Connection Closed.\n');
      dispatch({ type: 'STOP_PROCESSING' });
    };

    ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setWsLog(prev => prev + `[ERROR] WebSocket connection failed: ${error.message}\n`);
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || state.isProcessing || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const userMessage = {
      id: Date.now(), // Unique ID for the message
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    // Dispatch user message and start processing state
    dispatch({ type: 'START_PROCESSING', payload: userMessage });
    
    // Send the instruction to the backend via WebSocket
    ws.current.send(JSON.stringify({ 
        action: 'instruct', 
        message: input.trim(),
        conversationId: state.currentConversation
    }));

    setInput('');
    setWsLog(''); // Clear log on new instruction
    setWsLog(prev => prev + `[USER] ${input.trim()}\n`);

  }, [input, state.isProcessing, state.currentConversation]);

  useEffect(() => {
    if (transcript) {
        setInput(transcript);
    }
  }, [transcript]);

  // Other handlers remain largely the same, but don't need to call API directly
  const stopProcessing = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'stop' }));
    }
    dispatch({ type: 'STOP_PROCESSING' });
  }, []);

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleConversationSelect = useCallback((convId) => {
    // This would fetch conversation history, for now, it just resets the view
    dispatch({ type: 'SELECT_CONVERSATION', payload: { id: convId, messages: [] } });
  }, []);

  const handleNewConversation = useCallback(() => {
    dispatch({ type: 'SELECT_CONVERSATION', payload: { id: null, messages: [] } });
  }, []);

  return {
    ...state,
    canStop: state.isProcessing,
    input,
    setInput,
    isListening,
    handleConversationSelect,
    handleNewConversation,
    handleSend,
    stopProcessing,
    handleVoiceInput,
    transcript,
    wsLog,
  };
};
