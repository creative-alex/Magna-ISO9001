const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { getSalario, saveSalario, uploadRecibo } = require('../controllers/salarioController');
const { requireAuth } = require('../middleware/auth');

router.get('/:id/:mes', requireAuth, getSalario);
router.put('/:id/:mes', requireAuth, saveSalario);
router.post('/:id/:mes/recibo', requireAuth, upload.single('file'), uploadRecibo);

module.exports = router;
