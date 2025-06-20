import React, { useEffect, useState } from 'react';
import axios from 'axios';

const GroupMembersModal = ({ group, currentUser, onClose, refreshGroups, onRemoveMember }) => {
  const isAdmin = group.createdBy._id === currentUser._id;

  const [showAddField, setShowAddField] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notInGroup = res.data.filter(
        user => !group.members.some(m => m._id === user._id)
      );
      setAllUsers(notInGroup);
    };

    if (showAddField) fetchAllUsers();
  }, [showAddField, group.members]);

  const toggleSelected = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    const token = localStorage.getItem('token');
    await axios.put(`http://localhost:3001/groups/${group._id}/add-members`, {
      members: selectedUsers,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setShowAddField(false);       // ✅ hide add-user field
    setSelectedUsers([]);         // ✅ clear selection
    refreshGroups();              // ✅ re-fetch updated group list
    onClose();                    // ✅ close modal
  };

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
                {group.createdBy._id === member._id && (
                  <span className="admin-badge">Admin</span>
                )}
              </div>
              {isAdmin && member._id !== group.createdBy._id && (
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
            {!showAddField ? (
              <button onClick={() => setShowAddField(true)} className="add-members-btn">
                ➕ Add Member
              </button>
            ) : (
              <div className="add-user-field">
                <h4>Select users to add:</h4>
                <ul>
                  {allUsers.length === 0 ? (
                    <li>No users available to add</li>
                  ) : (
                    allUsers.map(user => (
                      <li key={user._id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => toggleSelected(user._id)}
                          />
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="member-avatar"
                          />
                          {user.username}
                        </label>
                      </li>
                    ))
                  )}
                </ul>
                <button onClick={handleAddMembers} className="add-selected-btn">
                   Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersModal;
