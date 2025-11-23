
import { useState, useCallback, useReducer, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

const initialState = {
  // ... (initial state remains the same)
};

// ... (reducer remains the same)

export const useJoeChat = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [input, setInput] = useState('');
  const [wsLog, setWsLog] = useState(''); 
  const ws = useRef(null);

  const { isListening, startListening, stopListening, transcript } = useSpeechRecognition();

  useEffect(() => {
    // THE CRITICAL FIX: Pointing to the new, correct WebSocket endpoint
    const API_WS_URL = import.meta.env.VITE_API_WS_URL || 'wss://admin.xelitesolutions.com/ws/joe-agent';
    
    ws.current = new WebSocket(API_WS_URL);

    ws.current.onopen = () => {
      console.log('WebSocket Connected to Joe Agent');
      setWsLog(prev => prev + '[SYSTEM] Connection to Core Intelligence Established.\n');
    };

    ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Log everything for the live screen
        setWsLog(prev => prev + `[JOE] ${JSON.stringify(data, null, 2)}\n`);

        // Update the chat and progress based on the message type from the agent
        switch (data.type) {
            case 'status':
                dispatch({ type: 'SET_PROGRESS', payload: { progress: data.progress || state.progress, step: data.message } });
                break;
            case 'thought': // To show Joe's thinking process
                 setWsLog(prev => prev + `[THOUGHT] ${data.thought}\n`);
                break;
            case 'tool_used':
                 dispatch({ type: 'ADD_MESSAGE', payload: { type: 'joe', content: `🔧 Using tool: ${data.tool} with input: ${JSON.stringify(data.input)}`, timestamp: new Date().toLocaleTimeString() } });
                 break;
            case 'final_response':
                dispatch({ type: 'UPDATE_JOE_RESPONSE', payload: data.content });
                dispatch({ type: 'STOP_PROCESSING' });
                break;
            case 'error':
                dispatch({ type: 'ADD_MESSAGE', payload: { type: 'joe', content: `Error: ${data.message}`, timestamp: new Date().toLocaleTimeString() } });
                dispatch({ type: 'STOP_PROCESSING' });
                break;
        }
    };

    // ... (rest of the WebSocket handlers: onclose, onerror)

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || state.isProcessing || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    dispatch({ type: 'START_PROCESSING', payload: userMessage });
    
    // Send instruction to the REAL agent backend
    ws.current.send(JSON.stringify({ 
        action: 'instruct', 
        message: input.trim(),
    }));

    setInput('');
    setWsLog(`[USER] ${input.trim()}\n`);

  }, [input, state.isProcessing]);

  // ... (the rest of the hook remains the same: stopProcessing, handleVoiceInput, etc.)
  
  return {
    ...state,
    canStop: state.isProcessing,
    input,
    setInput,
    isListening,
    handleConversationSelect: () => {},
    handleNewConversation: () => {},
    handleSend,
    stopProcessing: () => {},
    handleVoiceInput,
    transcript,
    wsLog,
  };
};

// Reducer needs to be defined for the hook to work
const chatReducer = (state, action) => {
    switch (action.type) {
      case 'START_PROCESSING':
        return { ...state, isProcessing: true, progress: 0, currentStep: 'Connecting...', messages: [...state.messages, action.payload] };
      case 'STOP_PROCESSING':
        return { ...state, isProcessing: false };
      case 'ADD_MESSAGE':
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
