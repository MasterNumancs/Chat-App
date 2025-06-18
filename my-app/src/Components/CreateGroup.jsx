import React, { useState } from 'react';
import axios from 'axios';

// CreateGroup component to create a new group chat
const CreateGroup = ({ users, setShowCreateGroup, setGroups, currentUserId }) => {
  const [groupName, setGroupName] = useState('');           // State to hold the new group name
  const [selectedUsers, setSelectedUsers] = useState([]);   // State to store selected member IDs
  const [dropdownOpen, setDropdownOpen] = useState(false);  // State to control dropdown visibility

  // Toggle dropdown open/close
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Handle selection/deselection of users from dropdown
  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId); // Deselect user
      } else {
        return [...prev, userId]; // Select user
      }
    });
  };

  // Handle form submission to create a new group
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form reload
    if (!groupName.trim() || selectedUsers.length === 0) return; // Don't submit if invalid

    try {
      // Make POST request to backend with group name and members (including current user)
      const response = await axios.post(
        'http://localhost:3001/groups',
        {
          name: groupName,
          members: [...selectedUsers, currentUserId], // Add current user to the group
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      // Update groups list in parent component
      setGroups(prev => [...prev, response.data]);

      // Reset form fields and close create group popup
      setGroupName('');
      setSelectedUsers([]);
      setShowCreateGroup(false);
    } catch (error) {
      console.error('Error creating group:', error); // Handle errors
    }
  };

  // Utility function to get usernames from selected user IDs
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
        {/* Group name input field */}
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

        {/* Dropdown to select group members */}
        <div className="form-group">
          <label>Add Members</label>
          <div className="dropdown-container">
            <div 
              className="dropdown-toggle"
              onClick={toggleDropdown}
            >
              {/* Show selected count or default text */}
              {selectedUsers.length > 0 
                ? `${selectedUsers.length} selected` 
                : 'Select members'}
              <span className="dropdown-arrow">▼</span>
            </div>
            
            {/* Dropdown list of users */}
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
          
          {/* Display selected usernames */}
          {selectedUsers.length > 0 && (
            <div className="selected-members">
              <strong>Selected:</strong> {getSelectedUsernames().join(', ')}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button type="submit" className="create-button">
          Create Group
        </button>
      </form>
    </div>
  );
};

export default CreateGroup;
