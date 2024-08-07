const routes = require("express").Router();
const authenticate = require("../../middleware/auth")

const rummyController = require("../../controllers/rummyController");

module.exports = () => {
   routes.get("/games",authenticate, rummyController.rummyGames);
   routes.get("/player/type",authenticate, rummyController.playerTypes);
   routes.get("/entryFee/Name/info/:playerType",authenticate, rummyController.entree_fee_Game_name);
   routes.get("/get/gameId/:Name",authenticate, rummyController.get_gameId);
   return routes;
};
