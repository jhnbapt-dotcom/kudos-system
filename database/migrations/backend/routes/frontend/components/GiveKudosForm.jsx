// components/GiveKudosForm.jsx
import React, { useState, useEffect } from 'react';
import './GiveKudosForm.css';

const GiveKudosForm = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const MAX_MESSAGE_LENGTH = 500;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users/active');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        if (!selectedUser) {
            setError('Please select a recipient');
            setIsSubmitting(false);
            return;
        }

        if (!message.trim()) {
            setError('Please write a message');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/kudos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recipient_id: selectedUser,
                    message: message.trim()
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit kudos');
            }

            setShowSuccess(true);
            setSelectedUser('');
            setMessage('');
            setSearchTerm('');

            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="give-kudos-form">
            <h2>Give Kudos</h2>
            <p className="form-description">
                Recognize a colleague for their great work!
            </p>

            {showSuccess && (
                <div className="success-message">
                    ✓ Kudos submitted successfully!
                </div>
            )}

            {error && (
                <div className="error-message">
                    ✗ {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="recipient">Select Recipient</label>
                    <input
                        type="text"
                        id="recipient-search"
                        placeholder="Search by name or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select
                        id="recipient"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="recipient-select"
                        required
                    >
                        <option value="">-- Choose a colleague --</option>
                        {filteredUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.full_name} {user.department ? `(${user.department})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="message">Your Message</label>
                    <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Share what you appreciate about them..."
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={4}
                        required
                    />
                    <div className="character-counter">
                        {message.length} / {MAX_MESSAGE_LENGTH} characters
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Send Kudos 🎉'}
                </button>
            </form>
        </div>
    );
};

export default GiveKudosForm;
