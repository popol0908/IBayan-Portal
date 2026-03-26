import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const startLoading = useCallback((message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    // Clear message after a short delay to allow fade-out animation
    setTimeout(() => setLoadingMessage('Loading...'), 300);
  }, []);

  const withLoading = useCallback(async (asyncFn, message = 'Loading...') => {
    try {
      startLoading(message);
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        startLoading,
        stopLoading,
        withLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

