const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { requireAuth, requireGestorQualidade, requireAdmin } = require("../../shared/middleware/auth");
const controller = require("./naoConformidadeController");

router.post("/", requireAuth, controller.createNaoConformidade);
router.get("/", requireAuth, controller.listNaoConformidades);
router.get("/:id", requireAuth, controller.getNaoConformidade);
router.patch("/:id/catalogacao", requireAuth, requireGestorQualidade, controller.updateCatalogacao);
router.patch("/:id/responsavel", requireAuth, requireGestorQualidade, controller.updateResponsavel);
router.post("/:id/tratamento", requireAuth, controller.submitTratamento);
router.patch("/:id/acoes/:acaoId/implementar", requireAuth, controller.marcarAcaoImplementada);
router.patch("/:id/acoes/:acaoId/eficacia", requireAuth, requireGestorQualidade, controller.verificarEficaciaAcao);
router.post("/:id/fechar", requireAuth, requireGestorQualidade, controller.fecharNaoConformidade);
router.post("/:id/anexos", requireAuth, upload.single("file"), controller.uploadAnexo);
router.get("/:id/anexos/:index/download", requireAuth, controller.downloadAnexo);
// Apagar é irreversível - reservado ao SuperAdmin (ver requireAdmin em auth.js), nunca à
// Gestora de Qualidade nem ao responsável pela NC.
router.delete("/:id", requireAuth, requireAdmin, controller.deleteNaoConformidade);

module.exports = router;
