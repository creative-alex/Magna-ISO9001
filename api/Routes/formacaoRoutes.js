const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const {
  getFormacao,
  createAcao,
  updateAcao,
  deleteAcao,
  uploadCertificadoAcao,
  deleteCertificadoAcao,
} = require('../controllers/formacaoController');
const { requireAuth } = require('../middleware/auth');

router.get('/:id/:ano', requireAuth, getFormacao);
router.post('/:id/:ano/acoes', requireAuth, createAcao);
router.put('/:id/:ano/acoes/:acaoId', requireAuth, updateAcao);
router.delete('/:id/:ano/acoes/:acaoId', requireAuth, deleteAcao);
router.post('/:id/:ano/acoes/:acaoId/certificado', requireAuth, upload.single('file'), uploadCertificadoAcao);
router.delete('/:id/:ano/acoes/:acaoId/certificado', requireAuth, deleteCertificadoAcao);

module.exports = router;
