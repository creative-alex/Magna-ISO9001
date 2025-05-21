// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const { getPdfText } = require("../controllers/filesController");

router.post("/get-pdf", getPdfText);

module.exports = router;
