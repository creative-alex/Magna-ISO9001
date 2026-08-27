// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer();
const filesController = require("../controllers/filesController");
const simpleController = require("../controllers/simpleController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.post("/get-pdf", requireAuth, filesController.getPdf);
router.get('/list-files-tree', requireAuth, filesController.listFilesTree);
router.post('/upload-pdf', requireAuth, upload.single('file'), filesController.uploadPdf);
router.post('/upload-document', requireAuth, upload.single('file'), filesController.uploadDocument);
router.get('/list-pdfs', requireAuth, filesController.listPdfs);
router.post('/pdf-form-data', requireAuth, filesController.getPdfFormData);
router.post('/download', requireAuth, filesController.downloadPdf);
router.get('/download/*filePath', requireAuth, filesController.downloadFile);
router.get('/preview/*filePath', requireAuth, filesController.previewFile);
router.post('/update-dono-processo', requireAuth, requireAdmin, filesController.updateDonoProcesso);
router.get('/process-owners', requireAuth, filesController.getProcessOwners);
router.post('/save-process-history', requireAuth, requireAdmin, filesController.saveProcessHistory);
router.post('/get-process-data', requireAuth, filesController.getProcessData);
router.post('/delete', requireAuth, requireAdmin, filesController.deletePdf);
router.delete('/delete/*filePath', requireAuth, requireAdmin, filesController.deleteFile);
router.get('/list-documents-in-folder', requireAuth, filesController.listDocumentsInFolder);

// ENDPOINTS SIMPLES E DIRETOS - SÓ O QUE É NECESSÁRIO
router.post('/create-record', requireAuth, requireAdmin, simpleController.createProcessRecord);
router.post('/save-pdf', requireAuth, upload.single('file'), simpleController.savePdfOnly);

module.exports = router;
