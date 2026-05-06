import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMessages, fetchAdmin } from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { playNotificationSound } from '../utils/sound';

const ChatWindow = ({ student }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [adminOnline, setAdminOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Get admin info
        const admin = await fetchAdmin();
        if (!mounted) return;
        setAdminId(admin._id);

        // Fetch history
        const history = await fetchMessages(student.userId);
        if (!mounted) return;
        setMessages(history);

        // Connect socket
        const sock = connectSocket(student.userId);
        setSocket(sock);

        sock.on('newMessage', (msg) => {
          setMessages((prev) => [...prev, msg]);
          playNotificationSound();
          setIsTyping(false);
        });

        sock.on('typingIndicator', ({ senderId, isTyping: typing }) => {
          if (String(senderId) === String(admin._id)) {
            setIsTyping(typing);
          }
        });

        sock.on('messageSent', (msg) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => String(m._id) === String(msg._id))) return prev;
            return [...prev, msg];
          });
        });
      } catch (err) {
        console.error('Init error:', err);
      }
    };

    init();
    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [student.userId]);

  const sendMessage = () => {
    if (!inputText.trim() || !adminId || !socket) return;

    socket.emit('sendMessage', {
      senderId: student.userId,
      receiverId: adminId,
      message: inputText.trim(),
    });

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      {
        _id: `temp-${Date.now()}`,
        senderId: student.userId,
        receiverId: adminId,
        message: inputText.trim(),
        timestamp: new Date().toISOString(),
        read: false,
      },
    ]);

    setInputText('');
    inputRef.current?.focus();

    // Stop typing indicator
    socket.emit('typing', {
      senderId: student.userId,
      receiverId: adminId,
      isTyping: false,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || !adminId) return;

    socket.emit('typing', {
      senderId: student.userId,
      receiverId: adminId,
      isTyping: true,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', {
        senderId: student.userId,
        receiverId: adminId,
        isTyping: false,
      });
    }, 1500);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isAdminMsg = (msg) => String(msg.senderId) !== String(student.userId);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarWrap}>
            <span style={styles.avatarText}>A</span>
            <span style={styles.onlineDot(adminOnline)} />
          </div>
          <div>
            <div style={styles.headerName}>Admin Support</div>
            <div style={styles.headerStatus}>
              {adminOnline ? '🟢 Online' : '⚫ Offline'}
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.studentLabel}>Hi, {student.name} 👋</span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <p style={styles.emptyText}>No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = !isAdminMsg(msg);
          return (
            <div
              key={msg._id || i}
              style={{ ...styles.msgRow, justifyContent: mine ? 'flex-end' : 'flex-start' }}
            >
              {!mine && (
                <div style={styles.smallAvatar}>A</div>
              )}
              <div style={styles.bubble(mine)}>
                <p style={styles.bubbleText}>{msg.message}</p>
                <span style={styles.bubbleTime}>{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
            <div style={styles.smallAvatar}>A</div>
            <div style={styles.typingBubble}>
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.dot} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputBar}>
        <input
          ref={inputRef}
          style={styles.input}
          type="text"
          placeholder="Type your message…"
          value={inputText}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          maxLength={1000}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: inputText.trim() ? 1 : 0.5,
          }}
          onClick={sendMessage}
          disabled={!inputText.trim()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f0f2f5',
    fontFamily: "'Inter', sans-serif",
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    background: 'linear-gradient(135deg, #6C63FF, #764ba2)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarWrap: {
    position: 'relative',
    width: '42px',
    height: '42px',
  },
  avatarText: {
    width: '42px',
    height: '42px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    lineHeight: '42px',
    textAlign: 'center',
  },
  onlineDot: (online) => ({
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: online ? '#22c55e' : '#9ca3af',
    border: '2px solid #6C63FF',
  }),
  headerName: { color: '#fff', fontWeight: '600', fontSize: '16px' },
  headerStatus: { color: 'rgba(255,255,255,0.75)', fontSize: '12px' },
  headerRight: {},
  studentLabel: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    margin: 'auto',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '15px' },
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  smallAvatar: {
    width: '28px',
    height: '28px',
    background: '#6C63FF',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: (mine) => ({
    maxWidth: '70%',
    background: mine ? 'linear-gradient(135deg, #6C63FF, #764ba2)' : '#fff',
    color: mine ? '#fff' : '#1a1a2e',
    borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  }),
  bubbleText: { margin: 0, fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word' },
  bubbleTime: {
    fontSize: '10px',
    opacity: 0.7,
    display: 'block',
    marginTop: '4px',
    textAlign: 'right',
  },
  typingBubble: {
    background: '#fff',
    borderRadius: '18px 18px 18px 4px',
    padding: '12px 16px',
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  dot: {
    width: '7px',
    height: '7px',
    background: '#9ca3af',
    borderRadius: '50%',
    animation: 'bounce 1.2s infinite',
    display: 'inline-block',
  },
  inputBar: {
    background: '#fff',
    padding: '12px 16px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    borderTop: '1px solid #e5e7eb',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '24px',
    border: '2px solid #e5e7eb',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 0.2s',
    color: '#1a1a2e',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #6C63FF, #764ba2)',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
};

export default ChatWindow;
