import React, { useState } from 'react';
import { FaReact } from 'react-icons/fa6';
import '../Style.css';

const UsersLogin = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    if (!username || !password) {
      return setError('Please enter username and password');
    }

    if (mode === 'register' && password !== confirm) {
      return setError('Passwords do not match');
    }

    try {
      const res = await fetch(`http://localhost:3001/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (mode === 'login') {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', data.username);
          localStorage.setItem('avatar', data.avatar);
          localStorage.setItem('userId', data.userId);
          setUser(data.username);
        } else {
          throw new Error(data.error || 'Login failed');
        }
      } else if (mode === 'register') {
        setError('Registration successful. Please log in.');
        setMode('login');
        setUsername('');
        setPassword('');
        setConfirm('');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError(error.message || 'Something went wrong.');
    }
  };

  return (
    <div className="login-center-container">
      <div className="auth-card">
        <div className="auth-header">
          <FaReact className="auth-icon" />
          <h1>Chat App</h1>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="auth-button">
            {mode === 'login' ? 'Login' : 'Register'}
          </button>

          <p 
            className="auth-toggle"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setUsername('');
              setPassword('');
              setConfirm('');
              setError('');
            }}
          >
            {mode === 'login' 
              ? 'Need an account? Register' 
              : 'Already have an account? Login'}
          </p>
        </form>
      </div>
    </div>
  );
};

export default UsersLogin;