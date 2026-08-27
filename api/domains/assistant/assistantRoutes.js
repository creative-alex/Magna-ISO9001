const express = require("express");
const router = express.Router();
const { handleAssistantQuery, logQuestion } = require("./assistantController");
const { requireAuth } = require("../../shared/middleware/auth");

router.post("/", requireAuth, handleAssistantQuery);
router.post("/log", requireAuth, logQuestion);

module.exports = router;
