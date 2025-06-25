// GroupMembersModal.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const GroupMembersModal = ({ group, currentUser, onClose, onAddMembers, onRemoveMember, refreshGroups }) => {
  const isAdmin = group.createdBy._id === currentUser._id;

  const [showAddField, setShowAddField] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const notInGroup = res.data.filter(
          user => !group.members.some(m => m._id === user._id)
        );
        setAllUsers(notInGroup);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
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

    try {
      if (onAddMembers) {
        await onAddMembers(selectedUsers);
      } else {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:3001/groups/${group._id}/add-members`, {
          members: selectedUsers,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setShowAddField(false);
      setSelectedUsers([]);
      if (refreshGroups) refreshGroups();
      onClose();
    } catch (err) {
      console.error('Error adding members:', err);
    }
  };

  return (
    <div className="group-members-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{group.name} Members ({group.members.length})</h3>
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
              {isAdmin && member._id !== currentUser._id && (
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
                ➕ Add Members
              </button>
            ) : (
              <div className="add-user-field">
                <h4>Select users to add:</h4>
                {allUsers.length === 0 ? (
                  <p>No users available to add</p>
                ) : (
                  <>
                    <ul className="user-selection-list">
                      {allUsers.map(user => (
                        <li key={user._id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user._id)}
                              onChange={() => toggleSelected(user._id)}
                            />
                            <img src={user.avatar} alt={user.username} className="member-avatar" />
                            {user.username}
                          </label>
                        </li>
                      ))}
                    </ul>
                    <div className="selection-actions">
                      <button
                        onClick={handleAddMembers}
                        disabled={selectedUsers.length === 0}
                        className="add-selected-btn"
                      >
                        Add Selected
                      </button>
                      <button
                        onClick={() => {
                          setShowAddField(false);
                          setSelectedUsers([]);
                        }}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersModal;
