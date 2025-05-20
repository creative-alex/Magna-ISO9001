// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const { getPdfFromFirebase } = require("../controllers/pdfController");

router.post("/get-pdf", getPdfFromFirebase);

module.exports = router;
