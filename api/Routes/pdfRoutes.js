// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { getPdfText } = require("../controllers/filesController");
const { uploadPdf } = require("../controllers/filesController");
const { listPdfs } = require("../controllers/filesController");
const { getPdfFormData } = require("../controllers/filesController");

router.post("/get-pdf", getPdfText);
router.post('/upload-pdf', upload.single('file'), uploadPdf);
router.get('/list-pdfs', listPdfs);
router.get('/pdf-form-data', getPdfFormData);
module.exports = router;
