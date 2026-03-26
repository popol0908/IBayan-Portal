import React, { useEffect, useState } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import Loading from './Loading';

/**
 * PageLoader wrapper component that shows loading state while page data is being fetched
 * Usage: Wrap your page component with PageLoader and provide a loading condition
 */
const PageLoader = ({ children, isLoading, loadingMessage = 'Loading...', showSkeleton = false }) => {
  const { startLoading, stopLoading } = useLoading();
  const [localLoading, setLocalLoading] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setLocalLoading(true);
      startLoading(loadingMessage);
    } else {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setLocalLoading(false);
        stopLoading();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingMessage, startLoading, stopLoading]);

  if (localLoading && showSkeleton) {
    return (
      <div className="page-skeleton">
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
      </div>
    );
  }

  if (localLoading) {
    return <Loading message={loadingMessage} fullScreen={false} />;
  }

  return children;
};

export default PageLoader;

