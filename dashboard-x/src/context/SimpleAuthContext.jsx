import React, { createContext, useContext } from 'react';
import { useSimpleAuth } from '../hooks/useSimpleAuth';

// Create the simple authentication context
const SimpleAuthContext = createContext(null);

// Simple Authentication Provider Component
export const SimpleAuthProvider = ({ children }) => {
  const auth = useSimpleAuth();
  
  return (
    <SimpleAuthContext.Provider value={auth}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

// Custom hook to use simple authentication context
export const useSimpleAuthContext = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error('useSimpleAuthContext must be used within a SimpleAuthProvider');
  }
  return context;
};

export default SimpleAuthContext;