import React, { useState } from 'react';

const InputText = ({ addMessage }) => {
   // Initialize as empty string
  const [message, setMessage] = useState("");

  const sendMessage = () => {
      addMessage({ message });
      setMessage("");
  };

  return (
    <div className='inputtext_container'>
      <textarea
        name="message"
        id="message"
        rows="1"
        placeholder="Type your message..."
         // Controlled input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      ></textarea>
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default InputText;