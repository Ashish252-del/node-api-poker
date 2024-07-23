const routes = require("express").Router();
const authenticate = require("../../middleware/auth")

const pokerController = require("../../controllers/pokerController");

module.exports = () => {
    routes.get("/games", pokerController.getGames);
    routes.get("/tables/:game_id", pokerController.getTablesByGameId);
    routes.get("/games/:game_id/blind-structure", pokerController.getBlindStructureByGameId);
    routes.get("/games/:game_id/prize-data", pokerController.getPrizeDataByGameId);
    routes.get("/games/:game_id/players", pokerController.getPlayersByGameId);
    routes.get("/hand-history/:table_id", authenticate, pokerController.getHandHistoryByTableId);
    routes.get("/buy-in/:table_id", authenticate, pokerController.getBuyInByTableId);
    routes.get("/leaderboard/:table_id", authenticate, pokerController.getLeaderboardByTableId);
    routes.get("/game-result/:table_id", authenticate, pokerController.getGameResultByTableId);
    routes.get("/poker-profile", authenticate, pokerController.getUserPokerProfile);
    routes.post("/register-tournament", authenticate, pokerController.registerTournament);
    routes.post("/deregister-tournament", authenticate, pokerController.deregisterTournament);
    routes.get("/private-table", pokerController.getPrivateTable);

    
    return routes;
};
