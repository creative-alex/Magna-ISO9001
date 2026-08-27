const express = require('express');
const router = express.Router();
const { verifyTokenAndGetUserInfo, getAllUsers, getColaboradores, createUser, getFavorites, updateFavorite, updateFirstLogin } = require('../controllers/usersController');
const { requireAuth, requireAdmin, requireCanViewColaboradores } = require('../middleware/auth');


router.post("/verifyTokenAndGetUserInfo", verifyTokenAndGetUserInfo);
router.get("/getAllUsers", requireAuth, requireAdmin, getAllUsers);
router.get("/getColaboradores", requireAuth, requireCanViewColaboradores, getColaboradores);
router.post("/createUser", requireAuth, requireAdmin, createUser);
router.get("/favorites/:username", requireAuth, getFavorites);
router.post("/favorites", requireAuth, updateFavorite);
// NOTA: sem requireAuth de propósito  -  este endpoint é chamado pelo fluxo de
// primeiro acesso (temp password), altura em que o utilizador ainda não tem
// sessão Firebase válida (foi feito signOut logo após detetar isFirstLogin).
// Continua a validar só por email (mesma lacuna que já existia); ver plano/registo.
router.post("/update-first-login", updateFirstLogin);


module.exports = router;