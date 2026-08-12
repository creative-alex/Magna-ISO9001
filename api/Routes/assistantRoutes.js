const express = require("express");
const router = express.Router();
const { handleAssistantQuery, logQuestion } = require("../controllers/assistantController");
const { requireAuth } = require("../middleware/auth");

router.post("/", requireAuth, handleAssistantQuery);
router.post("/log", requireAuth, logQuestion);

module.exports = router;
