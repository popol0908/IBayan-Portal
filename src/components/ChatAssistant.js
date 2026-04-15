import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, saveMessageToFirestore } from '../services/chatService';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './ChatAssistant.css';

const ChatAssistant = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from Firestore on mount
  const loadChatHistory = useCallback(async () => {
    if (!currentUser?.uid || historyLoaded) return;

    try {
      const chatQuery = query(
        collection(db, 'chatMessages'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(chatQuery);

      if (!snapshot.empty) {
        const historicalMessages = [];
        snapshot.docs.reverse().forEach((doc) => {
          const data = doc.data();
          // Add user message
          historicalMessages.push({
            id: `hist-user-${doc.id}`,
            role: 'user',
            content: data.userMessage,
            timestamp: data.timestamp?.toDate?.() || new Date(data.createdAt),
          });
          // Add assistant response
          historicalMessages.push({
            id: `hist-ai-${doc.id}`,
            role: 'assistant',
            content: data.assistantResponse,
            timestamp: data.timestamp?.toDate?.() || new Date(data.createdAt),
          });
        });

        setMessages(historicalMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setHistoryLoaded(true);
    }
  }, [currentUser, historyLoaded]);

  // Initialize with welcome message or load history
  useEffect(() => {
    if (currentUser && messages.length === 0 && !historyLoaded) {
      loadChatHistory().then(() => {
        // After history loads, if still no messages, show welcome
        setMessages((prev) => {
          if (prev.length === 0) {
            const welcomeMessage = isAdmin
              ? "Hello! I'm your AI assistant for the iBayan admin panel. I can help you manage announcements, alerts, events, verify residents, and more. What would you like to know?"
              : "Hello! I'm your AI assistant for the iBayan Portal. I can help you navigate the system, check announcements, events, and answer your questions. How can I assist you today?";

            return [
              {
                id: Date.now(),
                role: 'assistant',
                content: welcomeMessage,
                timestamp: new Date(),
              },
            ];
          }
          return prev;
        });
      });
    }
  }, [currentUser, isAdmin, historyLoaded, loadChatHistory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    const maxHeight = 96; // ~4 lines
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || isSending || !currentUser) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Add user message to chat
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Get conversation history
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
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
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Save to Firestore
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
        // Show user-friendly error message
        const errorMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error('Chat error:', result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content:
          "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (e) => {
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
        id="chat-toggle-btn"
      >
        {isOpen ? (
          <span className="chat-icon">✕</span>
        ) : (
          <span className="chat-icon">💬</span>
        )}
      </button>

      {/* Chat Widget */}
      {isOpen && (
        <div className="chat-widget" id="chat-widget">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-avatar-wrapper">
                <div className="chat-avatar">🤖</div>
                <span className="online-dot"></span>
              </div>
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
              id="chat-close-btn"
            >
              ✕
            </button>
          </div>

          <div className="chat-messages" id="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="message-row">
                    <div className="message-avatar">🤖</div>
                    <div className="message-bubble-wrapper">
                      <div className="message-content">
                        {message.content.split('\n').map((line, idx) => (
                          <React.Fragment key={idx}>
                            {line}
                            {idx < message.content.split('\n').length - 1 && (
                              <br />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="message-time">
                        {message.timestamp instanceof Date
                          ? message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </div>
                    </div>
                  </div>
                )}
                {message.role === 'user' && (
                  <>
                    <div className="message-content">
                      {message.content.split('\n').map((line, idx) => (
                        <React.Fragment key={idx}>
                          {line}
                          {idx < message.content.split('\n').length - 1 && (
                            <br />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="message-time">
                      {message.timestamp instanceof Date
                        ? message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </div>
                  </>
                )}
              </div>
            ))}
            {isSending && (
              <div className="chat-message assistant">
                <div className="message-row">
                  <div className="message-avatar">🤖</div>
                  <div className="message-bubble-wrapper">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
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
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                rows="1"
                disabled={isSending}
                id="chat-input"
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!inputMessage.trim() || isSending}
                aria-label="Send message"
                id="chat-send-btn"
              >
                {isSending ? (
                  <span className="send-icon">⏳</span>
                ) : (
                  <span className="send-icon">➤</span>
                )}
              </button>
            </div>
            <div className="chat-input-hint">
              Press Enter to send, Shift+Enter for new line
            </div>
            <div className="chat-footer">
              <small className="chat-footer-text">
                AI responses are generated by Google Gemini. Please verify
                important information.
              </small>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
