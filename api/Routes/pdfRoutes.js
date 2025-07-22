// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { getPdf } = require("../controllers/filesController");
const { uploadPdf } = require("../controllers/filesController");
const { listPdfs } = require("../controllers/filesController");
const { getPdfFormData } = require("../controllers/filesController");
const { listPdfsTree } = require("../controllers/filesController");
const { downloadPdf } = require("../controllers/filesController");
const { updateDonoProcesso } = require("../controllers/filesController");

router.post("/get-pdf", getPdf);
router.get('/list-pdfs-tree', listPdfsTree);
router.post('/upload-pdf', upload.single('file'), uploadPdf);
router.get('/list-pdfs', listPdfs);
router.post('/pdf-form-data', getPdfFormData);
router.post('/download', downloadPdf);
router.post('/update-dono-processo', updateDonoProcesso);
module.exports = router;
