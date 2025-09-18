// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer();
const filesController = require("../controllers/filesController");
const simpleController = require("../controllers/simpleController");

router.post("/get-pdf", filesController.getPdf);
router.get('/list-files-tree', filesController.listFilesTree);
router.post('/upload-pdf', upload.single('file'), filesController.uploadPdf);
router.post('/upload-document', upload.single('file'), filesController.uploadDocument);
router.get('/list-pdfs', filesController.listPdfs);
router.post('/pdf-form-data', filesController.getPdfFormData);
router.post('/download', filesController.downloadPdf);
router.post('/update-dono-processo', filesController.updateDonoProcesso);
router.get('/process-owners', filesController.getProcessOwners);
router.post('/delete', filesController.deletePdf);
router.get('/list-documents-in-folder', filesController.listDocumentsInFolder);

// ENDPOINTS SIMPLES E DIRETOS - SÓ O QUE É NECESSÁRIO
router.post('/create-record', simpleController.createProcessRecord);
router.post('/save-pdf', upload.single('file'), simpleController.savePdfOnly);

module.exports = router;
