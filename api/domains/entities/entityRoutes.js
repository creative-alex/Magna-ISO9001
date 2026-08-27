const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../shared/middleware/auth');
const { showEntity } = require('./entityController');
const { createEntity } = require('./entityController');
const { updateEntity } = require('./entityController');
const { entityDetails } = require('./entityController');
const { deleteEntity } = require('./entityController');

router.post('/showEntities', requireAuth, showEntity);
router.post('/entityDetails', requireAuth, entityDetails);

router.post('/createEntity', requireAuth, requireAdmin, createEntity);
router.post('/updateEntity', requireAuth, requireAdmin, updateEntity);
router.post('/deleteEntity', requireAuth, requireAdmin, deleteEntity);

module.exports = router;
