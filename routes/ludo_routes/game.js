const express = require("express");
const { validate } = require("express-validation");
const gameController = require("../../controllers/ludo_controllers/game/game.controller");
const gameValidator = require("../../controllers/ludo_controllers/game/game.validator");

const router = express.Router();

//= ===============================
// API routes
//= ===============================
router.get("/testone", (req, res) => {
  res.send("ok");
});

router.get("/type", gameController.active_types);
router.get("/varient", gameController.active_varients);
router.get("/history", gameController.game_history);
router.get("", validate(gameValidator.getGame), gameController.games);
router.get("/leaderboard/daily",gameController.leaderboard_daily); // user is not associated to game history
// these are not used as we don't have tournament and private table in ludo 
// router.get("/leaderboard/weekly",gameController.leaderboard_weekly);
// router.get("/leaderboard/monthly",gameController.leaderboard_monthly);
// router.get('/upcomming/tournaments/:userId',gameController.upcomming_Tournament);
// router.get('/registered/tournaments/:userId',gameController.registered_tournament);
// router.get('/finished/tournaments/:userId',gameController.finished_tournament);
// router.put('/test/update/tournament/user',gameController.update_userStatus);
// router.get("/tournament-history", gameController.getTournamentHistory);
// router.post("/create-private-game", gameController.createPrivateLudoGame);
// router.get("/get-ludo-private-game-vaeients", gameController.getGameVarient);
// router.get("/get-ludo-private-games",gameController.getAllPrivateGames)

module.exports = router;

