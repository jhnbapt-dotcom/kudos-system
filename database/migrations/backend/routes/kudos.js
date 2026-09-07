// routes/kudos.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateKudosInput } = require('../middleware/validation');

const pool = new Pool();

// POST /api/kudos - Create a new kudos
router.post('/', authenticateToken, validateKudosInput, async (req, res) => {
    const { recipient_id, message } = req.body;
    const giver_id = req.user.id;

    if (giver_id === recipient_id) {
        return res.status(400).json({ error: 'Cannot give kudos to yourself' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO kudos (giver_id, recipient_id, message)
             VALUES ($1, $2, $3)
             RETURNING id, giver_id, recipient_id, message, created_at`,
            [giver_id, recipient_id, message]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating kudos:', error);
        res.status(500).json({ error: 'Failed to create kudos' });
    }
});

// GET /api/kudos/feed - Public kudos feed
router.get('/feed', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    try {
        const result = await pool.query(
            `SELECT 
                k.id,
                k.message,
                k.created_at,
                g.full_name AS giver_name,
                g.department AS giver_department,
                r.full_name AS recipient_name,
                r.department AS recipient_department
             FROM kudos k
             JOIN users g ON k.giver_id = g.id
             JOIN users r ON k.recipient_id = r.id
             WHERE k.is_visible = true
             ORDER BY k.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching kudos feed:', error);
        res.status(500).json({ error: 'Failed to fetch kudos feed' });
    }
});

// GET /api/kudos/moderation - Admin moderation endpoint
router.get('/moderation', authenticateToken, requireAdmin, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || 'all';

    let visibilityFilter = '';
    if (status === 'visible') {
        visibilityFilter = 'WHERE k.is_visible = true';
    } else if (status === 'hidden') {
        visibilityFilter = 'WHERE k.is_visible = false';
    }

    try {
        const result = await pool.query(
            `SELECT 
                k.*,
                g.full_name AS giver_name,
                r.full_name AS recipient_name
             FROM kudos k
             JOIN users g ON k.giver_id = g.id
             JOIN users r ON k.recipient_id = r.id
             ${visibilityFilter}
             ORDER BY k.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching kudos for moderation:', error);
        res.status(500).json({ error: 'Failed to fetch kudos' });
    }
});

// PATCH /api/kudos/:id/visibility - Toggle visibility (admin)
router.patch('/:id/visibility', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { is_visible, reason } = req.body;
    const moderator_id = req.user.id;

    if (typeof is_visible !== 'boolean') {
        return res.status(400).json({ error: 'is_visible must be a boolean' });
    }

    try {
        const updateResult = await pool.query(
            `UPDATE kudos 
             SET is_visible = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [is_visible, id]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kudos not found' });
        }

        const action = is_visible ? 'show' : 'hide';
        await pool.query(
            `INSERT INTO kudos_moderation_log (kudos_id, moderator_id, action, reason)
             VALUES ($1, $2, $3, $4)`,
            [id, moderator_id, action, reason || null]
        );

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error updating kudos visibility:', error);
        res.status(500).json({ error: 'Failed to update kudos' });
    }
});

// DELETE /api/kudos/:id - Delete kudos (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const moderator_id = req.user.id;
    const { reason } = req.body;

    try {
        await pool.query(
            `INSERT INTO kudos_moderation_log (kudos_id, moderator_id, action, reason)
             VALUES ($1, $2, 'delete', $3)`,
            [id, moderator_id, reason || null]
        );

        const result = await pool.query(
            `DELETE FROM kudos WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Kudos not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting kudos:', error);
        res.status(500).json({ error: 'Failed to delete kudos' });
    }
});

module.exports = router;
