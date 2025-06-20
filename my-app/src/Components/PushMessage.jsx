// PushMessage.js
import React, { useEffect, useState } from 'react';
import '../Style.css';

const formatTime = (isoString) => {
  const date = new Date(isoString);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const PushMessage = ({ message, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 3000); // Auto-close after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="push-message">
      <div className="push-message-content">
        <div className="push-message-avatar-container">
          <img src={message.avatar} alt={message.username} className="push-message-avatar" />
          <div className="push-message-status"></div>
        </div>
        <div className="push-message-text">
          <div className="push-message-username">{message.username}</div>
          <div className="push-message-preview">
            {message.message?.length > 30 
              ? `${message.message.substring(0, 30)}...` 
              : message.message || '[Image]'}
          </div>
          {message.image && (
            <div className="push-message-image-preview">
              <img src={message.image} alt="Preview" />
            </div>
          )}
          <div className="push-message-time">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
      <button 
        className="push-message-close" 
        onClick={() => {
          setVisible(false);
          onClose();
        }}
      >
        <svg viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
      </button>
    </div>
  );
};

export default PushMessage;