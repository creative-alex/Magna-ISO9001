const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const {
  getFormacao,
  createAcao,
  criarAcaoConcluida,
  updateAcao,
  marcarConcluidaAcao,
  deleteAcao,
  uploadCertificadoAcao,
  deleteCertificadoAcao,
} = require('./formacaoController');
const { requireAuth } = require('../../shared/middleware/auth');

router.get('/:id/:ano', requireAuth, getFormacao);
router.post('/:id/:ano/acoes', requireAuth, createAcao);
router.post('/:id/:ano/acoes/concluida', requireAuth, criarAcaoConcluida);
router.put('/:id/:ano/acoes/:acaoId', requireAuth, updateAcao);
router.put('/:id/:ano/acoes/:acaoId/concluida', requireAuth, marcarConcluidaAcao);
router.delete('/:id/:ano/acoes/:acaoId', requireAuth, deleteAcao);
router.post('/:id/:ano/acoes/:acaoId/certificado', requireAuth, upload.single('file'), uploadCertificadoAcao);
router.delete('/:id/:ano/acoes/:acaoId/certificado', requireAuth, deleteCertificadoAcao);

module.exports = router;
