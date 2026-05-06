import React, { useState } from 'react';
import { createStudent } from '../utils/api';

const HomePage = ({ onStartChat }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await createStudent(name.trim());
      onStartChat(data);
    } catch (err) {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconWrapper}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              fill="#6C63FF"
              opacity="0.15"
              stroke="#6C63FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 style={styles.title}>Student Support Chat</h1>
        <p style={styles.subtitle}>
          Connect with our admin team instantly. Enter your name to begin.
        </p>

        <form onSubmit={handleStart} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={50}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              'Start Chat →'
            )}
          </button>
        </form>

        <p style={styles.note}>🔒 Your chat is private and secure</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '48px 40px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    background: 'rgba(108, 99, 255, 0.08)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 10px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '0 0 32px',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '14px 18px',
    fontSize: '15px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'Inter', sans-serif",
    color: '#1a1a2e',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    margin: '0',
    textAlign: 'left',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #6C63FF, #764ba2)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  note: {
    marginTop: '20px',
    fontSize: '13px',
    color: '#9ca3af',
  },
};

export default HomePage;
