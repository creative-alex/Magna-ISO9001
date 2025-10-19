const express = require('express');
const router = express.Router();
const { verifyTokenAndGetUserInfo, getAllUsers, createUser, updateFirstLogin } = require('../controllers/usersController');


router.post("/verifyTokenAndGetUserInfo", verifyTokenAndGetUserInfo);
router.get("/getAllUsers", getAllUsers);
router.post("/createUser", createUser);
router.post("/update-first-login", updateFirstLogin);


module.exports = router;