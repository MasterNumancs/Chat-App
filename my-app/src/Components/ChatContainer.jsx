import React, { useEffect, useRef, useState } from 'react';
import ChatList from './ChatList';
import InputText from './InputText';
import UsersLogin from './UsersLogin';
import socketIOClient from 'socket.io-client';

const ChatContainer = () => {
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [toUserId, setToUserId] = useState('');
  const socketRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to socket
    socketRef.current = socketIOClient('http://localhost:3001', {
      auth: { token }
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    socketRef.current.on('chat', (messageList) => {
      setChats(messageList);
    });

    socketRef.current.on('message', (msg) => {
      setChats(prev => [...prev, msg]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('http://localhost:3001/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      const currentUserId = localStorage.getItem('userId');
      setUsers(data.filter(u => u._id !== currentUserId));
    };

    if (user) fetchUsers();
  }, [user]);

  const sendToSocket = (chat) => {
    socketRef.current.emit('newMessage', chat);
  };

  const addMessage = (chat) => {
    const trimmed = chat.message.trim();
    if (!trimmed || !toUserId) return;

    const newChat = {
      ...chat,
      message: trimmed,
      username: localStorage.getItem('user'),
      avatar: localStorage.getItem('avatar'),
      fromUserId: localStorage.getItem('userId'),
      toUserId
    };

    sendToSocket(newChat);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser('');
  };

  return (
    <div>
      {user ? (
        <>
          <div className='chats_header'>
            <h4>Username: {user}</h4>
            <p className='chats_logout' onClick={handleLogout}><strong>Logout</strong></p>
          </div>

          {/* Recipient selector */}
          <div>
            <label>Select recipient: </label>
            <select onChange={e => setToUserId(e.target.value)} value={toUserId}>
              <option value="">--Select User--</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.username}</option>
              ))}
            </select>
          </div>

          <ChatList chats={chats} />
          <InputText addMessage={addMessage} toUserId={toUserId} />
        </>
      ) : (
        <UsersLogin setUser={setUser} />
      )}
    </div>
  );
};

export default ChatContainer;
