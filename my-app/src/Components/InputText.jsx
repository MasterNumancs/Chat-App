import React, { useState, useRef } from 'react';

const InputText = ({ addMessage, selectedChat }) => {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setError('');

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed (JPEG, PNG, etc.)');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('Image must be smaller than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result); 
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = () => {
    const trimmed = message.trim();

    if (!trimmed && !image) {
      setError('Please enter a message or select an image');
      return;
    }

    if (!selectedChat) {
      setError('Please select a recipient or group');
      return;
    }

    setError('');

    addMessage({
      message: trimmed,
      image: image,
    });

    setMessage('');
    removeImage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="inputtext_container">
      {error && <div className="error-message">{error}</div>}

      {image && (
        <div className="image-preview">
          <img src={image} alt="Preview" className="preview-image" />
          <button 
            onClick={removeImage}
            className="remove-image-button"
            aria-label="Remove image"
          >
            &times;
          </button>
        </div>
      )}

      <div className="input-actions">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="file-input"
          id="file-input"
        />
        <label htmlFor="file-input" className="image-upload-button">📷</label>

        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          className="message-input"
          rows="1"
        />

        <button 
          onClick={sendMessage}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default InputText;
