const express = require('express');
const router = express.Router();
const { verifyTokenAndGetUserInfo } = require('../controllers/usersController'); 


router.post("/verifyTokenAndGetUserInfo", verifyTokenAndGetUserInfo);


module.exports = router;

