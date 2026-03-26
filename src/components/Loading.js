import React from 'react';
import './Loading.css';

const Loading = ({ message = 'Loading...', fullScreen = true }) => {
  if (fullScreen) {
    return (
      <div className="loading-overlay">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-message">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-inline">
      <div className="loading-spinner-small">
        <div className="spinner-ring-small"></div>
        <div className="spinner-ring-small"></div>
        <div className="spinner-ring-small"></div>
        <div className="spinner-ring-small"></div>
      </div>
      {message && <p className="loading-message-small">{message}</p>}
    </div>
  );
};

export default Loading;

