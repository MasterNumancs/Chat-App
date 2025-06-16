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

const ChatList = ({ chats = [], currentUserId }) => {
  const endOfMessages = useRef();

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  return (
    <div className="chat_list_container">
      <div className="chat_list">
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

          return chat.fromUserId === currentUserId ? (
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
