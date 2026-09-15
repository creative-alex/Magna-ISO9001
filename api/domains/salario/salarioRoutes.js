const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { getSalario, saveSalario, uploadRecibo, deleteRecibo, exportFechoMensal } = require('./salarioController');
const { requireAuth } = require('../../shared/middleware/auth');

// Tem de vir antes de "/:id/:mes" (mesmo formato de path, "export" seria lido como um id).
router.get('/export/:mes', requireAuth, exportFechoMensal);
router.get('/:id/:mes', requireAuth, getSalario);
router.put('/:id/:mes', requireAuth, saveSalario);
router.post('/:id/:mes/recibo', requireAuth, upload.single('file'), uploadRecibo);
router.delete('/:id/:mes/recibo', requireAuth, deleteRecibo);

module.exports = router;
