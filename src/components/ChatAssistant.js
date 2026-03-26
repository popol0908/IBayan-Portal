import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, saveMessageToFirestore } from '../services/chatService';
import './ChatAssistant.css';

const ChatAssistant = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (currentUser && messages.length === 0) {
      const welcomeMessage = isAdmin
        ? "Hello! I'm your AI assistant. I can help you manage announcements, alerts, surveys, and feedback. What would you like to know?"
        : "Hello! I'm your AI assistant. I can help you navigate the system, explain features, and answer barangay-related questions. How can I assist you today?";
      
      setMessages([
        {
          id: Date.now(),
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        }
      ]);
    }
  }, [currentUser, isAdmin]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isSending || !currentUser) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Add user message to chat
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Get conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send to AI
      const result = await sendChatMessage(
        userMessage,
        isAdmin,
        userProfile,
        conversationHistory
      );

      if (result.success) {
        // Add assistant response
        const assistantMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Save to Firestore (optional)
        if (currentUser?.uid) {
          await saveMessageToFirestore(
            currentUser.uid,
            isAdmin ? 'admin' : 'resident',
            userMessage,
            result.message,
            isAdmin
          );
        }
      } else {
        // Show error message
        const errorMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${result.error}. Please try again or contact support if the issue persists.`,
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Don't show chat for unauthenticated users
  if (!currentUser) {
    return null;
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className={`chat-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        aria-label="Toggle AI Assistant"
        title="AI Assistant"
      >
        {isOpen ? (
          <span className="chat-icon">✕</span>
        ) : (
          <span className="chat-icon">💬</span>
        )}
      </button>

      {/* Chat Widget */}
      {isOpen && (
        <div className="chat-widget">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-avatar">🤖</div>
              <div className="chat-header-text">
                <h3 className="chat-title">AI Assistant</h3>
                <p className="chat-subtitle">
                  {isAdmin ? 'Admin Support' : 'Resident Support'}
                </p>
              </div>
            </div>
            <button
              className="chat-close-btn"
              onClick={toggleChat}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`}
              >
                <div className="message-content">
                  {message.content.split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      {idx < message.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="chat-message assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <div className="chat-input-wrapper">
              <textarea
                ref={inputRef}
                className="chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                rows="1"
                disabled={isSending}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!inputMessage.trim() || isSending}
                aria-label="Send message"
              >
                {isSending ? (
                  <span className="send-icon">⏳</span>
                ) : (
                  <span className="send-icon">➤</span>
                )}
              </button>
            </div>
            <div className="chat-footer">
              <small className="chat-footer-text">
                AI responses are generated by Google Gemini. Please verify important information.
              </small>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;

