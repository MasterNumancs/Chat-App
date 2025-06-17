import React, { useEffect, useRef } from 'react';
import '../Style.css';

const formatTime = (isoString) => {
  const date = new Date(isoString);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const SenderChat = ({ message, username, avatar, timestamp }) => (
  <div className="chat-list chat_sender">
    <img src={avatar} alt="Sender" className="chat-avatar" />
    <div className="chat-content">
      <p className="chat-username"><strong>{username}</strong></p>
      <p className="chat-message">{message}</p>
      <span className="chat_time">{formatTime(timestamp)}</span>
    </div>
  </div>
);

const ReceiverChat = ({ message, username, avatar, timestamp }) => (
  <div className="chat-list chat_receiver">
    <img src={avatar} alt="Receiver" className="chat-avatar" />
    <div className="chat-content">
      <p className="chat-username"><strong>{username}</strong></p>
      <p className="chat-message">{message}</p>
      <span className="chat_time">{formatTime(timestamp)}</span>
    </div>
  </div>
);

const GroupChat = ({ message, username, avatar, timestamp, groupName }) => (
  <div className="chat-list chat_group">
    <img src={avatar} alt="Group User" className="chat-avatar" />
    <div className="chat-content">
      <p className="chat-username">
        <strong>{username}</strong>
        <span className="group_badge">#{groupName || 'Group'}</span>
      </p>
      <p className="chat-message">{message}</p>
      <span className="chat_time">{formatTime(timestamp)}</span>
    </div>
  </div>
);

const UserOnlineItem = ({ user }) => (
  <div className="online-user-item">
    <img src={user.avatar} alt={user.username} className="user-avatar-small" />
    <span>{user.username}</span>
    <span className="online-dot"></span>
  </div>
);

const ChatList = ({ chats = [], currentUserId, users = [], selectedChat }) => {
  const endOfMessages = useRef();

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  return (
    <div className="chat_list_container">
      <div className="chat_list">
        {/* Online users section for Public Group */}
        {selectedChat === 'group' && users.length > 0 && (
          <div className="online-users-section">
            <h4>Online Users ({users.length})</h4>
            <div className="online-users-list">
              {users.map(user => (
                <UserOnlineItem key={user._id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {chats.map((chat) => {
          const key = chat._id || chat.timestamp;

          if (chat.groupName || chat.groupId) {
            return (
              <GroupChat
                key={`group-${key}`}
                message={chat.message}
                username={chat.username}
                avatar={chat.avatar}
                timestamp={chat.timestamp}
                groupName={chat.groupName}
              />
            );
          }

          return chat.fromUserId.toString() === currentUserId.toString() ? (
            <SenderChat
              key={`sender-${key}`}
              message={chat.message}
              username={chat.username}
              avatar={chat.avatar}
              timestamp={chat.timestamp}
            />
          ) : (
            <ReceiverChat
              key={`receiver-${key}`}
              message={chat.message}
              username={chat.username}
              avatar={chat.avatar}
              timestamp={chat.timestamp}
            />
          );
        })}
        <div ref={endOfMessages} className="scroll-anchor" />
      </div>
    </div>
  );
};

export default ChatList;