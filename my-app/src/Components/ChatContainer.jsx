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
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState('group');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('groups');
  const socketRef = useRef();

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('user');
  const avatar = localStorage.getItem('avatar');
  const token = localStorage.getItem('token');

  // === SOCKET.IO CONNECTION ===
  useEffect(() => {
    if (!token) return;

    socketRef.current = socketIOClient('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current.emit('joinPrivate', userId);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current.on('receiveMessage', (msg) => {
      setChats((prev) => [...prev, msg]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, userId]);

  // FETCH CHATS ON CHAT CHANGE 
  useEffect(() => {
    const fetchChats = async () => {
      try {
        let res;
        if (selectedChat === 'group') {
          res = await axios.get('http://localhost:3001/chats');
        } else if (selectedChat.startsWith('group-')) {
          const groupId = selectedChat.replace('group-', '');
          res = await axios.get(`http://localhost:3001/chats?groupId=${groupId}`);
        } else {
          res = await axios.get(`http://localhost:3001/chats?userId=${userId}`);
          const filtered = res.data.filter(
            chat =>
              (chat.fromUserId === userId && chat.toUserId === selectedChat) ||
              (chat.fromUserId === selectedChat && chat.toUserId === userId)
          );
          res.data = filtered;
        }
        setChats(res.data);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    if (socketRef.current?.connected) {
      if (selectedChat === 'group') {
        socketRef.current.emit('joinPublic');
      } else if (selectedChat.startsWith('group-')) {
        socketRef.current.emit('joinGroup', selectedChat.replace('group-', ''));
      }
    }

    if (selectedChat) fetchChats();
  }, [selectedChat, userId]);

  // FETCH USERS
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:3001/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllUsers(res.data);
        setUsers(res.data.filter(u => u._id !== userId));
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    if (user) fetchUsers();
  }, [user, token, userId]);

  // FETCH GROUPS 
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get('http://localhost:3001/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroups(res.data);
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };

    if (user) fetchGroups();
  }, [user, token]);

  const addMessage = ({ message, image }) => {
    if (!message && !image) return;

    const newChat = {
      message: message || '',
      image: image || null,
      username,
      avatar,
      fromUserId: userId,
      timestamp: new Date().toISOString(),
    };

    if (selectedChat === 'group') {
      newChat.groupName = 'Public Group';
    } else if (selectedChat.startsWith('group-')) {
      newChat.groupId = selectedChat.replace('group-', '');
    } else {
      newChat.toUserId = selectedChat;
    }

    socketRef.current?.emit('sendMessage', newChat);
  };

  const handleLogout = () => {
    socketRef.current?.disconnect();
    localStorage.clear();
    setUser('');
    setChats([]);
    setUsers([]);
    setGroups([]);
  };

  const switchToGroups = () => setActiveTab('groups');
  const switchToPrivate = () => {
    if (showCreateGroup) setShowCreateGroup(false);
    setActiveTab('private');
  };

  return (
    <div className="chat_wrapper">
      {user ? (
        <>
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="sidebar_header">
              <img src={avatar} alt={user} className="current-user-avatar" />
              <h4>{user}</h4>
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>

            <div className="chat-type-tabs">
              <button
                className={activeTab === 'groups' ? 'active' : ''}
                onClick={switchToGroups}
              >
                Group Chats
              </button>
              <button
                className={activeTab === 'private' ? 'active' : ''}
                onClick={switchToPrivate}
              >
                Private Chats
              </button>
            </div>

            <div className="contact_list">
              {activeTab === 'groups' ? (
                <>
                  <div
                    className={`contact_item ${selectedChat === 'group' ? 'active' : ''}`}
                    onClick={() => setSelectedChat('group')}
                  >
                    Public Group
                  </div>
                  {groups.map((group) => (
                    <div
                      key={group._id}
                      className={`contact_item ${selectedChat === `group-${group._id}` ? 'active' : ''}`}
                      onClick={() => setSelectedChat(`group-${group._id}`)}
                    >
                      👥 {group.name}
                      <span className="member-count">{group.members?.length || 0} members</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="contact_header">Direct Messages</div>
                  {users.map((u) => (
                    <div
                      key={u._id}
                      className={`contact_item ${selectedChat === u._id ? 'active' : ''}`}
                      onClick={() => setSelectedChat(u._id)}
                    >
                      <img src={u.avatar} alt={u.username} className="sidebar-avatar" />
                      <span className="contact_name">{u.username}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {activeTab === 'groups' && (
              <button
                className="create-group-toggle"
                onClick={() => setShowCreateGroup(!showCreateGroup)}
              >
                {showCreateGroup ? 'Cancel' : '+ New Group'}
              </button>
            )}

            {activeTab === 'groups' && showCreateGroup && (
              <div className="sidebar_create_group">
                <CreateGroup
                  users={allUsers}
                  setShowCreateGroup={setShowCreateGroup}
                  setGroups={setGroups}
                  currentUserId={userId}
                />
              </div>
            )}
          </div>

          {/* MAIN CHAT AREA */}
          <div className="chat_area">
            <div className="chat_list_scroll">
              <ChatList
                chats={chats}
                currentUserId={userId}
                users={users}
                selectedChat={selectedChat}
              />
            </div>
            {selectedChat !== 'group' && (
              <div className="input_fixed">
                <InputText
                  addMessage={addMessage}
                  selectedChat={selectedChat}
                />
              </div>
            )}

          </div>
        </>
      ) : (
        <UsersLogin setUser={setUser} />
      )}
    </div>
  );
};

export default ChatContainer;