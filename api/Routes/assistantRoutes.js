const express = require("express");
const router = express.Router();
const { handleAssistantQuery, logQuestion } = require("../controllers/assistantController");

router.post("/", handleAssistantQuery);
router.post("/log", logQuestion);

module.exports = router;
