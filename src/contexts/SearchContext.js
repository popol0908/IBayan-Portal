import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SearchContext = createContext();

export const useSearch = () => useContext(SearchContext);

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  // Clear search when navigating to a different page
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname]);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
};
