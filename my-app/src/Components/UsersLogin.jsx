import React, { useState } from 'react';
import { FaReact } from 'react-icons/fa6';
import '../Style.css';

const UsersLogin = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mode, setMode] = useState('login');

  const handleSubmit = async () => {
    if (!username || !password) return alert('Please enter username and password');

    if (mode === 'register' && password !== confirm) {
      return alert('Passwords do not match');
    }

    const res = await fetch(`http://localhost:3001/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (mode === 'login') {
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', data.username);
        localStorage.setItem('avatar', data.avatar);
        localStorage.setItem('userId', data.userId); 
        setUser(data.username);
      } else {
        alert(data.error || 'Login failed');
      }
    } else if (mode === 'register') {
      if (data.success || data.message === 'User registered successfully') {
        alert('Registration successful. Please log in.');
        // Switch to login form
        setMode('login'); 
        setUsername('');
        setPassword('');
        setConfirm('');
      } else {
        alert(data.error || 'Registration failed');
      }
    }
  };

  return (
    <div className="login_Container">
      <div className="login_title">
        <FaReact className="login_icon" />
        <h1>Chat App</h1>
      </div>

      <div className="login_form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        )}
        <button onClick={handleSubmit}>
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
        <p onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Register' : 'Login'}
        </p>
      </div>
    </div>
  );
};

export default UsersLogin;
