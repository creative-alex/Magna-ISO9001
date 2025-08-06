const express = require('express');
const router = express.Router();
const { verifyTokenAndGetUserInfo, getAllUsers } = require('../controllers/usersController');


router.post("/verifyTokenAndGetUserInfo", verifyTokenAndGetUserInfo);
router.get("/getAllUsers", getAllUsers);


module.exports = router;

