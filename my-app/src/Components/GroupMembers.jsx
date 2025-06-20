import React from 'react';

const GroupMembersModal = ({ group, currentUser, onClose, onAddMembers, onRemoveMember }) => {
  const isAdmin = group.createdBy._id === currentUser._id;

  return (
    <div className="group-members-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Group Members ({group.members.length})</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        
        <div className="members-list">
          {group.members.map(member => (
            <div key={member._id} className="member-item">
              <div className="member-info">
                <img src={member.avatar} alt={member.username} className="member-avatar" />
                <span>{member.username}</span>
                {group.createdBy._id === member._id && <span className="admin-badge">Admin</span>}
              </div>
              
              {isAdmin && member._id !== currentUser._id && member._id !== group.createdBy._id && (
                <button 
                  onClick={() => onRemoveMember(member._id)}
                  className="remove-btn"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="modal-footer">
            <button onClick={onAddMembers} className="add-members-btn">
              Add Members
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersModal;