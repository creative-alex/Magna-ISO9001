// routes/pdfRoutes.js
const express = require("express");
const router = express.Router();
const { getPdfFromFirebase } = require("../controllers/filesController");

router.post("/get-pdf", getPdfFromFirebase);

module.exports = router;
