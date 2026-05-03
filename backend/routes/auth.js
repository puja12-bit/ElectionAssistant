const express = require('express');
const router = express.Router();
const voterService = require('../services/voterService');

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
    const { epic, name, relativeName } = req.body;
    
    let voter = null;
    if (epic) {
        voter = voterService.searchVoter({ epicNumber: epic })[0];
    } else if (name) {
        voter = voterService.searchVoter({ name, relativeName })[0];
    }

    if (voter) {
        res.json({ success: true, voter });
    } else {
        res.status(404).json({ success: false, message: 'Voter not found' });
    }
});

module.exports = router;
