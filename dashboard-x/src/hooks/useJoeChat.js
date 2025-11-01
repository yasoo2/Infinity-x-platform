// src/hooks/useJoeChat.js
import { useState, useCallback } from 'react';

export const useJoeChat = () => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenType, setTokenType] = useState('github'); // كان null — خليته "github" عشان العنوان يظهر
  const [tokenValue, setTokenValue] = useState('');
  const [tokens, setTokens] = useState({ githubUsername: '' });

  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Idle');
  const [buildResult, setBuildResult] = useState(null);

  const handleConversationSelect = useCallback(() => {}, []);
  const handleNewConversation = useCallback(() => {}, []);
  const handleSend = useCallback(() => {}, []);
  const stopProcessing = useCallback(() => {}, []);
  const handleVoiceInput = useCallback(() => {
    // Mock implementation for voice input to generate text
    if (isListening) {
      setIsListening(false);
      // Simulate speech-to-text result
      setInput(prev => prev + " [Voice Input: Please implement the actual speech-to-text logic here.]");
    } else {
      setIsListening(true);
      // In a real app, this would start the microphone listener
    }
  }, [isListening, setIsListening, setInput]);
  const saveToken = useCallback(() => {}, []);
  const closeTokenModal = useCallback(() => setShowTokenModal(false), []);

  return {
    userId: 'mock-user-id',
    conversations: [],          // اتركها فاضية الآن
    currentConversation: null,  // نفس الشيء
    messages,
    isProcessing,
    progress,
    currentStep,
    buildResult,
    canStop: isProcessing,
    input,
    setInput,
    isListening,
    setIsListening,
    showTokenModal,
    setShowTokenModal,
    tokenType,
    setTokenType,
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
  };
};
