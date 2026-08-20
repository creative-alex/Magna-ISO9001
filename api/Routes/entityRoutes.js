const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { showEntity } = require('../controllers/timeTracking/entityController');
const { createEntity } = require('../controllers/timeTracking/entityController');
const { updateEntity } = require('../controllers/timeTracking/entityController');
const { entityDetails } = require('../controllers/timeTracking/entityController');
const { deleteEntity } = require('../controllers/timeTracking/entityController');

router.post('/showEntities', requireAuth, showEntity);
router.post('/entityDetails', requireAuth, entityDetails);

router.post('/createEntity', requireAuth, requireAdmin, createEntity);
router.post('/updateEntity', requireAuth, requireAdmin, updateEntity);
router.post('/deleteEntity', requireAuth, requireAdmin, deleteEntity);

module.exports = router;
