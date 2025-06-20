import React, { useEffect, useRef, useState } from 'react';
import ChatList from './ChatList';
import InputText from './InputText';
import UsersLogin from './UsersLogin';
import CreateGroup from './CreateGroup';
import GroupMembersModal from './GroupMembers';
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
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const socketRef = useRef();

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('user');
  const avatar = localStorage.getItem('avatar');
  const token = localStorage.getItem('token');

  // === SOCKET.IO CONNECTION ===
  useEffect(() => {
    if (!token) return;

    const socket = socketIOClient('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('joinPrivate', userId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('receiveMessage', (msg) => {
      setChats((prev) => [...prev, msg]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
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
        const groupId = selectedChat.replace('group-', '');
        socketRef.current.emit('joinGroup', groupId);
      }
    }

    if (selectedChat) fetchChats();
  }, [selectedChat, userId, token]);

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

    if (user && token) fetchUsers();
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

    if (user && token) fetchGroups();
  }, [user, token, userId]);

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

    if (socketRef.current?.connected) {
      socketRef.current.emit('sendMessage', newChat);
    }
  };

  const handleLogout = () => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
    localStorage.clear();
    setUser('');
    setChats([]);
    setUsers([]);
    setGroups([]);
  };

  const switchToGroups = () => setActiveTab('groups');
  const switchToPrivate = () => {
    setShowCreateGroup(false);
    setActiveTab('private');
  };

  const handleOpenMembersModal = (group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const handleAddMembers = async (newMembers) => {
    try {
      await axios.put(
        `http://localhost:3001/groups/${selectedGroup._id}/add-members`,
        { members: newMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const res = await axios.get('http://localhost:3001/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await axios.put(
        `http://localhost:3001/groups/${selectedGroup._id}/remove-member`,
        { memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const res = await axios.get('http://localhost:3001/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
    } catch (error) {
      console.error('Error removing member:', error);
    }
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
                      <div className="group-header">
                        👥 {group.name}
                        <span className="member-count">{group.members?.length || 0} members</span>
                      </div>
                      <div className="group-members-preview">
                        {group.members?.slice(0, 5).map(member => (
                          <img 
                            key={member._id} 
                            src={member.avatar} 
                            alt={member.username} 
                            className="group-member-avatar" 
                            title={member.username}
                          />
                        ))}
                        {group.members?.length > 5 && (
                          <span className="more-members">+{group.members.length - 5} more</span>
                        )}
                      </div>
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
            <div className="chat_header">
              {selectedChat.startsWith('group-') && (
                <div className="group-chat-header">
                  <h3>{groups.find(g => `group-${g._id}` === selectedChat)?.name}</h3>
                  <button 
                    className="group-menu-btn"
                    onClick={() => handleOpenMembersModal(
                      groups.find(g => `group-${g._id}` === selectedChat)
                    )}
                  >
                    ⋮
                  </button>
                </div>
              )}
            </div>
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

          {/* Group Members Modal */}
          {showMembersModal && selectedGroup && (
            <GroupMembersModal
              group={selectedGroup}
              currentUser={{ _id: userId, username }}
              onClose={() => setShowMembersModal(false)}
              onAddMembers={handleAddMembers}
              onRemoveMember={handleRemoveMember}
            />
          )}
        </>
      ) : (
        <UsersLogin setUser={setUser} />
      )}
    </div>
  );
};

export default ChatContainer;