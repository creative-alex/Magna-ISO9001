const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { getMedicinaTrabalho, saveMedicinaTrabalho, uploadFicha, deleteFicha } = require('./medicinaTrabalhoController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/:id', requireAuth, getMedicinaTrabalho);
router.put('/:id', requireAuth, saveMedicinaTrabalho);
router.post('/:id/ficha', requireAuth, upload.single('file'), uploadFicha);
router.delete('/:id/ficha', requireAuth, deleteFicha);

module.exports = router;
