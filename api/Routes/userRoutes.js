const express = require('express');
const router = express.Router();
const { verifyTokenAndGetUserInfo, getAllUsers, createUser } = require('../controllers/usersController');


router.post("/verifyTokenAndGetUserInfo", verifyTokenAndGetUserInfo);
router.get("/getAllUsers", getAllUsers);
router.post("/createUser", createUser);


module.exports = router;