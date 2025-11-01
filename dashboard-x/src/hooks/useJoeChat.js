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
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setBuildResult(null);
    setProgress(0);
    setCurrentStep('Idle');
  }, []);

  const handleVoiceInput = useCallback(() => {
    setIsListening(v => !v);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { type: 'user', content: text, timestamp: now }]);
    setInput('');

    // سلوك تجريبي بسيط
    if (/build|deploy/i.test(text)) {
      setIsProcessing(true);
      setCurrentStep('Building…');
      setProgress(10);
      const id = setInterval(() => {
        setProgress(p => {
          const next = Math.min(p + 20, 100);
          if (next >= 100) {
            clearInterval(id);
            setIsProcessing(false);
            setCurrentStep('Completed');
            setBuildResult({
              githubUrl: 'https://github.com/yasoo2/Infinity-x-platform',
              liveUrl: '',
            });
            setMessages(prev => [
              ...prev,
              { type: 'assistant', content: '✅ Build finished successfully.', timestamp: new Date().toLocaleTimeString() },
            ]);
          }
          return next;
        });
      }, 400);
    } else if (/token/i.test(text)) {
      setShowTokenModal(true);
    } else {
      setMessages(prev => [
        ...prev,
        { type: 'assistant', content: 'Got it. How should I proceed?', timestamp: new Date().toLocaleTimeString() },
      ]);
    }
  }, [input]);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('Stopped');
  }, []);

  const saveToken = useCallback(() => {
    if (tokenType === 'github' && tokens.githubUsername && tokenValue) {
      setShowTokenModal(false);
      setMessages(prev => [
        ...prev,
        { type: 'assistant', content: `💾 Saved GitHub token for ${tokens.githubUsername}.`, timestamp: new Date().toLocaleTimeString() },
      ]);
      setTokenValue('');
    }
  }, [tokenType, tokens.githubUsername, tokenValue]);

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
