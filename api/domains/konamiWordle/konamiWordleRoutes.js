const express = require("express");
const router = express.Router();
const { getWordleWords, saveWordleWords } = require("./konamiWordleController");
const { requireAuth } = require("../../shared/middleware/auth");

router.get("/words", requireAuth, getWordleWords);
router.post("/words", requireAuth, saveWordleWords);

module.exports = router;
