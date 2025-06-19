import React, { useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../Style.css';

const formatTime = (isoString) => {
  const date = new Date(isoString);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const SenderChat = ({ message, image, username, avatar, timestamp, onImageClick }) => (
  <div className="chat-list chat_sender">
    <div className="chat-content">
      <div className="chat-meta">
        <span className="chat_time">{formatTime(timestamp)}</span>
        <p className="chat-username"><strong>You</strong></p>
      </div>
      <div className="message-bubble sender">
        {message && <p className="chat-message">{message}</p>}
        {image && (
          <img src={image} alt="Sent" className="chat-image" onClick={() => onImageClick(image)} />
        )}
      </div>
    </div>
    <img src={avatar} alt="Sender" className="chat-avatar" />
  </div>
);

const ReceiverChat = ({ message, image, username, avatar, timestamp, onImageClick }) => (
  <div className="chat-list chat_receiver">
    <img src={avatar} alt="Receiver" className="chat-avatar" />
    <div className="chat-content">
      <p className="chat-username"><strong>{username}</strong></p>
      <div className="message-bubble receiver">
        {message && <p className="chat-message">{message}</p>}
        {image && (
          <img src={image} alt="Received" className="chat-image" onClick={() => onImageClick(image)} />
        )}
      </div>
      <span className="chat_time">{formatTime(timestamp)}</span>
    </div>
  </div>
);

const GroupChat = ({ message, image, username, avatar, timestamp, groupName, isSender, onImageClick }) => (
  <div className={`chat-list ${isSender ? 'chat_sender' : 'chat_receiver'}`}>
    {!isSender && <img src={avatar} alt="Group User" className="chat-avatar" />}
    <div className="chat-content">
      <p className="chat-username">
        <strong>{isSender ? 'You' : username}</strong>
        {!isSender && <span className="group_badge">#{groupName || 'Group'}</span>}
      </p>
      <div className={`message-bubble ${isSender ? 'sender' : 'receiver'}`}>
        {message && <p className="chat-message">{message}</p>}
        {image && (
          <img src={image} alt="Group Chat" className="chat-image" onClick={() => onImageClick(image)} />
        )}
      </div>
      <span className="chat_time">{formatTime(timestamp)}</span>
    </div>
    {isSender && <img src={avatar} alt="You" className="chat-avatar" />}
  </div>
);

const ChatList = ({ chats = [], currentUserId, users = [], selectedChat }) => {
  const endOfMessages = useRef();
  const prevChatsLength = useRef(chats.length);
  const [modalImage, setModalImage] = useState(null);
  const [toastShown, setToastShown] = useState({});

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth' });

    if (chats.length > prevChatsLength.current) {
      const newMessage = chats[chats.length - 1];
      const senderId = String(newMessage.fromUserId?._id || newMessage.fromUserId);
      const isCurrentUser = senderId === String(currentUserId);

      if (!isCurrentUser && !toastShown[senderId]) {
        const senderName = newMessage.username || 'Someone';
        const messagePreview = newMessage.message?.length > 30
          ? `${newMessage.message.substring(0, 30)}...`
          : newMessage.message || '[Image]';

        toast.info(`${senderName}: ${messagePreview}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        setToastShown((prev) => ({ ...prev, [senderId]: true }));
      }
    }

    prevChatsLength.current = chats.length;
  }, [chats, currentUserId, toastShown]);

  return (
    <div className="chat_list_container">
      <ToastContainer />

      {/* Image Modal */}
      {modalImage && (
        <div className="image-modal" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Full View" className="image-modal-content" />
          <span className="image-modal-close" onClick={() => setModalImage(null)}>&times;</span>
        </div>
      )}

      <div className="chat_list">
        {selectedChat === 'group' && users.length > 0 && (
          <div className="online-users-section">
            <h4>Online Users ({users.length})</h4>
            <div className="online-users-list">
              {users.map(user => (
                <div key={user._id} className="online-user-item">
                  <img src={user.avatar} alt={user.username} className="user-avatar-small" />
                  <span>{user.username}</span>
                  <span className="online-dot"></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {chats.map((chat) => {
          const key = chat._id || chat.timestamp;
          const isGroupChat = selectedChat === 'group' || selectedChat.startsWith('group-');
          const isSender = chat.isSender !== undefined
            ? chat.isSender
            : String(chat.fromUserId?._id || chat.fromUserId) === String(currentUserId);

          if (isGroupChat) {
            return (
              <GroupChat
                key={`group-${key}`}
                message={chat.message}
                image={chat.image}
                username={chat.username}
                avatar={chat.avatar}
                timestamp={chat.timestamp}
                groupName={chat.groupName}
                isSender={isSender}
                onImageClick={setModalImage}
              />
            );
          }

          return isSender ? (
            <SenderChat
              key={`sender-${key}`}
              message={chat.message}
              image={chat.image}
              username={chat.username}
              avatar={chat.avatar}
              timestamp={chat.timestamp}
              onImageClick={setModalImage}
            />
          ) : (
            <ReceiverChat
              key={`receiver-${key}`}
              message={chat.message}
              image={chat.image}
              username={chat.username}
              avatar={chat.avatar}
              timestamp={chat.timestamp}
              onImageClick={setModalImage}
            />
          );
        })}

        <div ref={endOfMessages} className="scroll-anchor" />
      </div>
    </div>
  );
};

export default ChatList;
