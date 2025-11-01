import { useState, useCallback } from 'react';

// Mock hook to resolve the build error.
// The actual implementation should be restored later.
export const useJoeChat = () => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenType, setTokenType] = useState(null);
  const [tokenValue, setTokenValue] = useState('');
  const [tokens, setTokens] = useState({ githubUsername: '' });

  const handleConversationSelect = useCallback(() => {}, []);
  const handleNewConversation = useCallback(() => {}, []);
  const handleSend = useCallback(() => {}, []);
  const stopProcessing = useCallback(() => {}, []);
  const handleVoiceInput = useCallback(() => {}, []);
  const saveToken = useCallback(() => {}, []);
  const closeTokenModal = useCallback(() => setShowTokenModal(false), []);

  return {
    userId: 'mock-user-id',
    conversations: [],
    currentConversation: null,
    messages: [],
    isProcessing: false,
    progress: 0,
    currentStep: 'Mocking build process...',
    buildResult: null,
    canStop: false,
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
    closeTokenModal
  };
};
