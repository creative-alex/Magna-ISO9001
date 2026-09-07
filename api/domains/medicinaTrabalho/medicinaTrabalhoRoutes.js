const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const {
  getMedicinaTrabalho, registarExame, atualizarExame, deleteExame,
} = require('./medicinaTrabalhoController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/:id', requireAuth, getMedicinaTrabalho);
router.post('/:id/exames', requireAuth, upload.single('file'), registarExame);
router.put('/:id/exames/:exameId', requireAuth, upload.single('file'), atualizarExame);
router.delete('/:id/exames/:exameId', requireAuth, deleteExame);

module.exports = router;
