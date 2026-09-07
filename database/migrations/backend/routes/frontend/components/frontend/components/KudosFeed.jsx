// components/KudosFeed.jsx
import React, { useState, useEffect } from 'react';
import './KudosFeed.css';

const KudosFeed = () => {
    const [kudos, setKudos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const LIMIT = 20;

    useEffect(() => {
        fetchKudos();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchKudos(true);
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const fetchKudos = async (refresh = false) => {
        try {
            setLoading(true);
            const currentOffset = refresh ? 0 : offset;
            
            const response = await fetch(`/api/kudos/feed?limit=${LIMIT}&offset=${currentOffset}`);
            const data = await response.json();

            if (refresh) {
                setKudos(data);
                setOffset(LIMIT);
            } else {
                setKudos(prev => [...prev, ...data]);
                setOffset(prev => prev + LIMIT);
            }

            setHasMore(data.length === LIMIT);
        } catch (err) {
            console.error('Failed to fetch kudos:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="kudos-feed">
            <h2>Recent Kudos</h2>
            <p className="feed-description">
                See what your colleagues are recognizing each other for
            </p>

            <div className="kudos-cards">
                {kudos.map(kudo => (
                    <div key={kudo.id} className="kudos-card">
                        <div className="kudos-header">
                            <span className="giver">{kudo.giver_name}</span>
                            <span className="to">→</span>
                            <span className="recipient">{kudo.recipient_name}</span>
                        </div>
                        <div className="kudos-message">
                            "{kudo.message}"
                        </div>
                        <div className="kudos-meta">
                            <span className="timestamp">
                                {formatTimestamp(kudo.created_at)}
                            </span>
                            {kudo.giver_department && (
                                <span className="department">
                                    {kudo.giver_department}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {loading && kudos.length === 0 && (
                <div className="loading">Loading kudos...</div>
            )}

            {!loading && kudos.length === 0 && (
                <div className="empty-state">
                    <p>No kudos yet. Be the first to give some! 🎉</p>
                </div>
            )}

            {hasMore && kudos.length > 0 && (
                <button 
                    className="load-more-btn"
                    onClick={() => fetchKudos()}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
};

export default KudosFeed;
