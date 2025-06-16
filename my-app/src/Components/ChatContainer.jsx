import React, { useEffect, useRef, useState } from 'react';
import ChatList from './ChatList';
import InputText from './InputText';
import UsersLogin from './UsersLogin';
import CreateGroup from './CreateGroup';
import socketIOClient from 'socket.io-client';
import axios from 'axios';

const ChatContainer = () => {
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState('group');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = socketIOClient('http://localhost:3001', {
      auth: { token },
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    socketRef.current.on('chat', (messageList) => setChats(messageList));
    socketRef.current.on('message', (msg) => {
      setChats((prev) => [...prev, msg]);
    });

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:3001/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const currentUserId = localStorage.getItem('userId');
        setUsers(res.data.filter(u => u._id !== currentUserId));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get('http://localhost:3001/groups', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setGroups(res.data);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
    if (user) fetchGroups();
  }, [user]);

  const sendToSocket = (chat) => {
    socketRef.current.emit('newMessage', chat);
  };

  const addMessage = (chat) => {
    const trimmed = chat.message.trim();
    if (!trimmed) return;

    const newChat = {
      ...chat,
      message: trimmed,
      username: localStorage.getItem('user'),
      avatar: localStorage.getItem('avatar'),
      fromUserId: localStorage.getItem('userId'),
      timestamp: new Date().toISOString(),
    };

    if (selectedChat === 'group') {
      newChat.groupName = 'Public Group';
    } else if (selectedChat.startsWith('group-')) {
      newChat.groupId = selectedChat.replace('group-', '');
    } else {
      newChat.toUserId = selectedChat;
    }

    sendToSocket(newChat);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser('');
  };

  return (
    <div className="chat_wrapper">
      {user ? (
        <>
          <div className="sidebar">
            <div className="sidebar_header">
              <h4>{user}</h4>
              <button onClick={handleLogout}>Logout</button>
            </div>

            <div className="contact_list">
              <div className={`contact_item ${selectedChat === 'group' ? 'active' : ''}`} onClick={() => setSelectedChat('group')}>
                🌐 Public Group
              </div>
              {groups.map(group => (
                <div 
                  key={group._id} 
                  className={`contact_item ${selectedChat === `group-${group._id}` ? 'active' : ''}`} 
                  onClick={() => setSelectedChat(`group-${group._id}`)}
                >
                  👥 {group.name}
                </div>
              ))}
              {users.map(u => (
                <div 
                  key={u._id} 
                  className={`contact_item ${selectedChat === u._id ? 'active' : ''}`} 
                  onClick={() => setSelectedChat(u._id)}
                >
                  👤 {u.username}
                </div>
              ))}
            </div>

            <button 
              className="create-group-toggle" 
              onClick={() => setShowCreateGroup(!showCreateGroup)}
            >
              {showCreateGroup ? 'Cancel' : '+ New Group'}
            </button>

            {showCreateGroup && (
              <div className="sidebar_create_group">
                <CreateGroup 
                  users={users} 
                  setShowCreateGroup={setShowCreateGroup} 
                  setGroups={setGroups}
                />
              </div>
            )}
          </div>

          <div className="chat_area">
            <ChatList chats={chats} currentUserId={localStorage.getItem('userId')} />
            <InputText addMessage={addMessage} toUserId={selectedChat} />
          </div>
        </>
      ) : (
        <UsersLogin setUser={setUser} />
      )}
    </div>
  );
};

export default ChatContainer;
