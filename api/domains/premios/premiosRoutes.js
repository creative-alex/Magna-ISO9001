const express = require('express');
const router = express.Router();
const { getPremios, createPremio, updatePremio, deletePremio } = require('./premiosController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/:id', requireAuth, getPremios);
router.post('/:id', requireAuth, createPremio);
router.put('/:id/:premioId', requireAuth, updatePremio);
router.delete('/:id/:premioId', requireAuth, deletePremio);

module.exports = router;
