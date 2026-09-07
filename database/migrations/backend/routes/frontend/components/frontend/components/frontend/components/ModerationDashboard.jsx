// components/ModerationDashboard.jsx
import React, { useState, useEffect } from 'react';
import './ModerationDashboard.css';

const ModerationDashboard = () => {
    const [kudos, setKudos] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');

    useEffect(() => {
        fetchKudos();
    }, [filter]);

    const fetchKudos = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/kudos/moderation?status=${filter}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            const data = await response.json();
            setKudos(data);
        } catch (err) {
            console.error('Failed to fetch kudos:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = async (kudoId, currentVisibility) => {
        try {
            const response = await fetch(`/api/kudos/${kudoId}/visibility`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    is_visible: !currentVisibility,
                    reason: `Moderation action: ${!currentVisibility ? 'Unhidden' : 'Hidden'}`
                })
            });

            if (!response.ok) throw new Error('Failed to update visibility');

            fetchKudos();
        } catch (err) {
            console.error('Error toggling visibility:', err);
            alert('Failed to update kudos visibility');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/kudos/${confirmDelete}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    reason: deleteReason || 'Moderation deletion'
                })
            });

            if (!response.ok) throw new Error('Failed to delete kudos');

            setConfirmDelete(null);
            setDeleteReason('');
            fetchKudos();
        } catch (err) {
            console.error('Error deleting kudos:', err);
            alert('Failed to delete kudos');
        }
    };

    return (
        <div className="moderation-dashboard">
            <h1>Kudos Moderation</h1>

            <div className="filter-bar">
                <button 
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button 
                    className={filter === 'visible' ? 'active' : ''}
                    onClick={() => setFilter('visible')}
                >
                    Visible
                </button>
                <button 
                    className={filter === 'hidden' ? 'active' : ''}
                    onClick={() => setFilter('hidden')}
                >
                    Hidden
                </button>
            </div>

            {loading && <div className="loading">Loading...</div>}

            <table className="kudos-table">
                <thead>
                    <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Message</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {kudos.map(kudo => (
                        <tr key={kudo.id} className={!kudo.is_visible ? 'hidden-row' : ''}>
                            <td>{kudo.giver_name}</td>
                            <td>{kudo.recipient_name}</td>
                            <td className="message-cell">{kudo.message}</td>
                            <td>{new Date(kudo.created_at).toLocaleDateString()}</td>
                            <td>
                                <span className={`status-badge ${kudo.is_visible ? 'visible' : 'hidden'}`}>
                                    {kudo.is_visible ? '✓ Visible' : '✗ Hidden'}
                                </span>
                            </td>
                            <td className="actions">
                                <button
                                    className="toggle-btn"
                                    onClick={() => toggleVisibility(kudo.id, kudo.is_visible)}
                                >
                                    {kudo.is_visible ? 'Hide' : 'Show'}
                                </button>
                                <button
                                    className="delete-btn"
                                    onClick={() => setConfirmDelete(kudo.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {kudos.length === 0 && !loading && (
                <div className="empty-state">No kudos found for this filter</div>
            )}

            {confirmDelete && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete this kudos? This action cannot be undone.</p>
                        <textarea
                            placeholder="Reason for deletion (optional)"
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            rows={3}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="danger" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModerationDashboard;
