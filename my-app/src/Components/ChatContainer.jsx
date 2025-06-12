import React, { useEffect, useRef, useState } from 'react';
import ChatList from './ChatList';
import InputText from './InputText';
import UsersLogin from './UsersLogin';
import socketIOClient from 'socket.io-client';

const ChatContainer = () => { 
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [chats, setChats] = useState([]);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = socketIOClient('http://localhost:3001');

    // Load chat history

    socketRef.current.on('chat', (messageList) => {

      // Replace all at once

      setChats(messageList); 
    });

    // Listen for new messages
    socketRef.current.on('message', (msg) => {
      setChats((prevChats) => [...prevChats, msg]);
    });

    return () => {
      socketRef.current.off('chat');
      socketRef.current.off('message');
      socketRef.current.disconnect();
    };
  }, []);

  const sendToSocket = (chat) => {
    socketRef.current.emit('newMessage', chat);
  };
   // Prevent empty or whitespace-only messages
 const addMessage = (chat) => {
  const trimmedMessage = chat.message.trim();
  if (!trimmedMessage) return; // Prevent empty or whitespace-only messages
// Store trimmed message
  const newChat = {
    ...chat,
    message: trimmedMessage, 
    username: localStorage.getItem('user'),
    avatar: localStorage.getItem('avatar'),
  };

  sendToSocket(newChat);
};

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser('');
  };

  return (
    <div>
      {user ? (
        <>
          <div className='chats_header'>
            <h4>Username: {user}</h4>
            <p className='chats_logout' onClick={handleLogout}>
              <strong>Logout</strong>
            </p>
          </div>
          <ChatList chats={chats} />
          <InputText addMessage={addMessage} />
        </>
      ) : (
        <UsersLogin setUser={setUser} />
      )}
    </div>
  );
};

export default ChatContainer;
