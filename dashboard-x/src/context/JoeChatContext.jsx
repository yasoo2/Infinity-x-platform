import React, { createContext, useContext } from 'react';
import { useJoeChat } from '../hooks/useJoeChat';

const JoeChatContext = createContext(null);

export const JoeChatProvider = ({ children }) => {
  const chat = useJoeChat();
  return (
    <JoeChatContext.Provider value={chat}>{children}</JoeChatContext.Provider>
  );
};

export const useJoeChatContext = () => {
  const ctx = useContext(JoeChatContext);
  if (!ctx) throw new Error('useJoeChatContext must be used within JoeChatProvider');
  return ctx;
};

