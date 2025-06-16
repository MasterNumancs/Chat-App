import React, { useState } from 'react';
import axios from 'axios';

const CreateGroup = ({ users, setShowCreateGroup, setGroups, currentUserId }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length === 0) return;

    try {
      const response = await axios.post(
        'http://localhost:3001/groups',
        {
          name: groupName,
          members: [...selectedUsers, currentUserId], // Include current user as member
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setGroups(prev => [...prev, response.data]);
      setGroupName('');
      setSelectedUsers([]);
      setShowCreateGroup(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const getSelectedUsernames = () => {
    return selectedUsers.map(userId => {
      const user = users.find(u => u._id === userId);
      return user ? user.username : '';
    }).filter(name => name !== '');
  };

  return (
    <div className="create-group-box">
      <h3>Create New Group</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            required
          />
        </div>

        <div className="form-group">
          <label>Add Members</label>
          <div className="dropdown-container">
            <div 
              className="dropdown-toggle"
              onClick={toggleDropdown}
            >
              {selectedUsers.length > 0 
                ? `${selectedUsers.length} selected` 
                : 'Select members'}
              <span className="dropdown-arrow">▼</span>
            </div>
            
            {dropdownOpen && (
              <div className="dropdown-menu">
                {users.map(user => (
                  <div 
                    key={user._id} 
                    className={`dropdown-item ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                    onClick={() => handleUserSelect(user._id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      readOnly
                    />
                    {user.username}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="selected-members">
              <strong>Selected:</strong> {getSelectedUsernames().join(', ')}
            </div>
          )}
        </div>

        <button type="submit" className="create-button">
          Create Group
        </button>
      </form>
    </div>
  );
};

export default CreateGroup;