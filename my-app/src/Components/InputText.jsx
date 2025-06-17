import React, { useState } from 'react';

const InputText = ({ addMessage, selectedChat }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    if (!selectedChat) {
      setError('Please select a recipient or group.');
      return;
    }

    setError('');
    setMessage('');

    // Send message to parent
    addMessage({
      message: trimmed,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="inputtext_container">
      <textarea
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
      />
      <button onClick={sendMessage}>Send</button>
      {error && <p style={{ color: 'red', marginTop: '5px' }}>{error}</p>}
    </div>
  );
};

export default InputText;
