const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { getSalario, saveSalario, uploadRecibo, deleteRecibo, exportFechoMensal } = require('./salarioController');
const { importRecibos } = require('./reciboImportController');
const { requireAuth } = require('../../shared/middleware/auth');

// PDF mensal com um recibo por página - pode ser grande (dezenas/centenas de páginas), por
// isso tem um limite de tamanho próprio, bem maior do que o de um recibo individual.
const uploadLote = multer({ limits: { fileSize: 40 * 1024 * 1024 } });
function uploadLoteMiddleware(req, res, next) {
  uploadLote.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ficheiro demasiado grande (máximo 40MB)' });
    }
    return res.status(400).json({ error: 'Erro ao processar o ficheiro enviado' });
  });
}

// Tem de vir antes de "/:id/:mes" (mesmo formato de path, "export"/"import-recibos" seriam lidos como um id).
router.get('/export/:mes', requireAuth, exportFechoMensal);
router.post('/import-recibos/:mes', requireAuth, uploadLoteMiddleware, importRecibos);
router.get('/:id/:mes', requireAuth, getSalario);
router.put('/:id/:mes', requireAuth, saveSalario);
router.post('/:id/:mes/recibo', requireAuth, upload.single('file'), uploadRecibo);
router.delete('/:id/:mes/recibo', requireAuth, deleteRecibo);

module.exports = router;
