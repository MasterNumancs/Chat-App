import React, { useEffect, useRef, useState } from 'react';
import ChatList from './ChatList';
import InputText from './InputText';
import UsersLogin from './UsersLogin';
import CreateGroup from './CreateGroup';
import GroupMembersModal from './GroupMembers';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  ProtocolAddress
} from 'libsignal-protocol-typescript';

class SignalProtocolStore {
  constructor() {
    this.store = {};
  }

  async put(key, value) {
    this.store[key] = value;
  }

  async get(key) {
    return this.store[key];
  }

  async remove(key) {
    delete this.store[key];
  }

  async getIdentityKeyPair() {
    return this.store['identityKey'];
  }

  async getLocalRegistrationId() {
    return this.store['registrationId'];
  }

  async isTrustedIdentity(identifier, identityKey, direction) {
    return true;
  }

  async loadPreKey(keyId) {
    const preKey = await this.get('preKey');
    return {
      pubKey: preKey.keyPair.pubKey,
      privKey: preKey.keyPair.privKey
    };
  }

  async loadSignedPreKey(keyId) {
    const signedPreKey = await this.get('signedPreKey');
    return {
      pubKey: signedPreKey.keyPair.pubKey,
      privKey: signedPreKey.keyPair.privKey,
      signature: signedPreKey.signature
    };
  }

  async loadSession(identifier) {
    return this.store[`session_${identifier}`];
  }

  async storeSession(identifier, record) {
    this.store[`session_${identifier}`] = record;
  }

  async getPreKey() {
    return this.store['preKey'];
  }

  async getSignedPreKey() {
    return this.store['signedPreKey'];
  }
}

class Encryption {
  constructor(userId) {
    this.userId = userId;
    this.store = new SignalProtocolStore();
  }

  async initialize() {
    try {
      const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
      const registrationId = await KeyHelper.generateRegistrationId();
      const preKey = await KeyHelper.generatePreKey(1);
      const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);

      await this.store.put('identityKey', identityKeyPair);
      await this.store.put('registrationId', registrationId);
      await this.store.put('preKey', preKey);
      await this.store.put('signedPreKey', signedPreKey);

      return {
        identityKey: identityKeyPair,
        registrationId,
        preKey,
        signedPreKey
      };
    } catch (error) {
      console.error('Error initializing encryption:', error);
      throw error;
    }
  }

  async getPreKeyBundle() {
    const identityKey = await this.store.getIdentityKeyPair();
    const registrationId = await this.store.getLocalRegistrationId();
    const preKey = await this.store.getPreKey(1);
    const signedPreKey = await this.store.getSignedPreKey(1);

    return {
      identityKey: identityKey.pubKey,
      registrationId,
      preKey: {
        keyId: 1,
        publicKey: preKey.pubKey
      },
      signedPreKey: {
        keyId: 1,
        publicKey: signedPreKey.pubKey,
        signature: signedPreKey.signature || Buffer.alloc(0)
      }
    };
  }

  async startSession(recipientId, preKeyBundle) {
    try {
      const address = new ProtocolAddress(recipientId, 1);
      const builder = new SessionBuilder(this.store, address);
      
      await builder.processPreKey({
        identityKey: preKeyBundle.identityKey,
        registrationId: preKeyBundle.registrationId,
        preKey: preKeyBundle.preKey,
        signedPreKey: preKeyBundle.signedPreKey
      });
      
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  async encryptMessage(recipientId, message) {
    try {
      const address = new ProtocolAddress(recipientId, 1);
      const sessionCipher = new SessionCipher(this.store, address);
      
      const ciphertext = await sessionCipher.encrypt(message);
      
      return {
        type: ciphertext.type,
        body: ciphertext.body,
        registrationId: await this.store.getLocalRegistrationId()
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  async decryptMessage(recipientId, encryptedMessage) {
    try {
      const address = new ProtocolAddress(recipientId, 1);
      const sessionCipher = new SessionCipher(this.store, address);
      
      let plaintext;
      if (encryptedMessage.type === 3) {
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(
          encryptedMessage.body,
          'binary'
        );
      } else {
        plaintext = await sessionCipher.decryptWhisperMessage(
          encryptedMessage.body,
          'binary'
        );
      }
      
      return plaintext;
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }
}

const VAPID_PUBLIC_KEY = 'BGva91ksRZr9rSA5JXHttvddlmTdKPjsgqGv-br_IDR0QF0v5DfcYpiL6--MbJOYx4YukM2Hu1tdj-UaOQTw3PU';

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
  const [encryption, setEncryption] = useState(null);
  const socketRef = useRef();

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('user');
  const avatar = localStorage.getItem('avatar');
  const token = localStorage.getItem('token');

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  };

  // Initialize encryption when user logs in
  useEffect(() => {
    if (!user || !userId) return;
    
    const initEncryption = async () => {
      try {
        const enc = new Encryption(userId);
        const keys = await enc.initialize();
        
        const keyData = {
          userId,
          identityKey: {
            pubKey: keys.identityKey.pubKey,
            privKey: keys.identityKey.privKey
          },
          registrationId: keys.registrationId,
          preKey: {
            keyId: keys.preKey.keyId,
            keyPair: {
              pubKey: keys.preKey.keyPair.pubKey,
              privKey: keys.preKey.keyPair.privKey
            }
          },
          signedPreKey: {
            keyId: keys.signedPreKey.keyId,
            keyPair: {
              pubKey: keys.signedPreKey.keyPair.pubKey,
              privKey: keys.signedPreKey.keyPair.privKey
            },
            signature: keys.signedPreKey.signature
          }
        };

        await axios.post('http://localhost:3001/api/signal-keys', keyData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setEncryption(enc);
      } catch (error) {
        console.error('Error initializing encryption:', error);
      }
    };
    
    initEncryption();
  }, [user, token, userId]);

  // Register Service Worker and Push
  useEffect(() => {
    if (!user || !token) return;

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        await axios.post('http://localhost:3001/api/save-subscription', {
          userId,
          subscription
        });
        console.log('Push subscription saved');
      } catch (err) {
        console.error('Push registration failed:', err);
      }
    };

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerPush();
    } else {
      console.warn('Push notifications not supported');
    }
  }, [user, token, userId]);

  // Socket.IO Connection with encryption handling
  useEffect(() => {
    if (!token || !encryption) return;

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('joinPrivate', userId);

      if (selectedChat === 'group') {
        socket.emit('joinPublic');
      } else if (selectedChat?.startsWith('group-')) {
        const groupId = selectedChat.replace('group-', '');
        socket.emit('joinGroup', groupId);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('receiveMessage', async (msg) => {
      try {
        const isGroupChat = selectedChat?.startsWith('group-');
        const isPublicChat = selectedChat === 'group';
        const isPrivateChat = !isGroupChat && !isPublicChat;

        const chatMatches =
          (isPrivateChat &&
            ((msg.fromUserId === selectedChat && msg.toUserId === userId) ||
             (msg.fromUserId === userId && msg.toUserId === selectedChat))) ||
          (isGroupChat && msg.groupId === selectedChat.replace('group-', '')) ||
          (isPublicChat && !msg.toUserId && !msg.groupId);

        if (!chatMatches) return;

        if (isPrivateChat && msg.encryptedMessage) {
          try {
            const encryptedMessage = {
              type: msg.encryptedMessage.type,
              body: Buffer.from(msg.encryptedMessage.body, 'base64'),
              registrationId: msg.encryptedMessage.registrationId
            };
            
            const decrypted = await encryption.decryptMessage(
              msg.fromUserId,
              encryptedMessage
            );
            msg.message = decrypted;
          } catch (error) {
            console.error('Error decrypting message:', error);
            msg.message = '[Encrypted message - decryption failed]';
          }
        }

        setChats((prev) => [...prev, msg]);
      } catch (error) {
        console.error('Error processing received message:', error);
      }
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, userId, selectedChat, encryption]);

  // Fetch chats when selected chat changes
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

        if (encryption && !selectedChat.startsWith('group-') && selectedChat !== 'group') {
          for (const chat of res.data) {
            if (chat.encryptedMessage) {
              try {
                const encryptedMessage = {
                  type: chat.encryptedMessage.type,
                  body: Buffer.from(chat.encryptedMessage.body, 'base64'),
                  registrationId: chat.encryptedMessage.registrationId
                };
                
                chat.message = await encryption.decryptMessage(
                  chat.fromUserId,
                  encryptedMessage
                );
              } catch (error) {
                console.error('Error decrypting message:', error);
                chat.message = '[Encrypted message - decryption failed]';
              }
            }
          }
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
  }, [selectedChat, userId, token, encryption]);

  // Fetch users
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

  // Fetch groups
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

  const addMessage = async ({ message, image }) => {
    if (!message && !image) return;

    try {
      if (!selectedChat.startsWith('group-') && selectedChat !== 'group') {
        if (!encryption) {
          console.error('Encryption not initialized');
          return;
        }

        try {
          const res = await axios.get(`http://localhost:3001/api/signal-keys/${selectedChat}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const sessionExists = await encryption.store.loadSession(`${selectedChat}.1`);
          if (!sessionExists) {
            console.log('Creating new session with recipient');
            await encryption.startSession(selectedChat, res.data);
          }
          
          const encryptedMessage = await encryption.encryptMessage(
            selectedChat, 
            message || (image ? '[IMAGE]' : '')
          );
          
          const newChat = {
            encryptedMessage: {
              type: encryptedMessage.type,
              body: encryptedMessage.body.toString('base64'),
              registrationId: encryptedMessage.registrationId
            },
            image: image || null,
            username,
            avatar,
            fromUserId: userId,
            timestamp: new Date().toISOString(),
            toUserId: selectedChat
          };

          console.log('Sending encrypted message:', newChat);

          if (socketRef.current?.connected) {
            socketRef.current.emit('sendMessage', newChat);
          } else {
            console.error('Socket not connected');
          }
        } catch (error) {
          console.error('Error in private message sending:', error);
        }
      } else {
        const newChat = {
          message: message || '',
          image: image || null,
          username,
          avatar,
          fromUserId: userId,
          timestamp: new Date().toISOString(),
          groupId: selectedChat.replace('group-', '')
        };

        if (socketRef.current?.connected) {
          socketRef.current.emit('sendMessage', newChat);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
    setEncryption(null);
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
      if (!selectedGroup) return;
      
      await axios.put(
        `http://localhost:3001/groups/${selectedGroup._id}/add-members`,
        { members: newMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const res = await axios.get('http://localhost:3001/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
      
      if (selectedChat === `group-${selectedGroup._id}`) {
        const groupChats = await axios.get(
          `http://localhost:3001/chats?groupId=${selectedGroup._id}`
        );
        setChats(groupChats.data);
      }
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      if (!selectedGroup) return;
      
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