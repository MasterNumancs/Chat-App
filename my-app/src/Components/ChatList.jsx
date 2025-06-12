import React from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';

// Sender chat component
const SenderChat = ({ message, username, avatar }) => {
  return (
    <div className="chat-list chat_sender">
      <img src={avatar} alt="Sender" />
      <p>
        <strong>{username}</strong> <br />{message}
      </p>
    </div>
  );
};

// Receiver chat component
const ReceiverChat = ({ message, username, avatar }) => {
  return (
    <div className="chat-list chat_receiver">
      <img src={avatar} alt="Receiver" />
      <p>
        <strong>{username}</strong><br /> {message}
      </p>
    </div>
  );
};

// Main chat list
const ChatList = ({ chats = [] }) => {  
const endOfMessages=useRef()  
  const user = localStorage.getItem('user');
  useEffect(()=>{
    scrollToBottom()
  },[chats])
  const scrollToBottom = () => {
    endOfMessages.current?.scrollIntoView({behavior: "smooth"})
  }
  
  return (
    <div className='chat_list'>
      {chats.map((chat, index) => {
        if (chat.username === user) {
          return (
            <SenderChat
              key={index}
              message={chat.message}
              username={chat.username}
              avatar={chat.avatar}
            />
          );
        } else {
          return (
            <ReceiverChat 
              key={index}
              message={chat.message}
              username={chat.username}
              avatar={chat.avatar}
            />
          );
        }
      })}
      <div ref={endOfMessages}></div>
    </div>
  );
};

export default ChatList;