const routes = require("express").Router();
const authenticate = require("../../middleware/auth")
const {postClub, validate} = require("../auth/validator");
const clubController = require("../../controllers/clubController");
const adminController = require("../../controllers/adminController");
const { Router } = require("express");
const { authentication } = require("../../utils/payment");
module.exports = () => {
    routes.post("/create", authenticate,postClub(), validate, clubController.createClub );
    routes.post("/update", authenticate,postClub(), validate, clubController.updateClub);
    routes.get("/get-detail/:clubId", authenticate,clubController.getClubByClubId );
    routes.get("/get-user-joined/:userId", authenticate,clubController.getJoindClubByUserId );
    routes.get("/get-user-notification/:userId", authenticate,clubController.getNotificationByUserId );
    routes.post("/send-request", authenticate,clubController.sendClubJoinReq );
    routes.post("/change-join-users-status", authenticate,clubController.changeStatusOfJoinedUsers);
    routes.get("/get-member-list", authenticate,clubController.getMemberList);
    routes.get("/get-member-detail", authenticate,clubController.memberDetails);
    routes.get("/search", authenticate,clubController.searchClub);
    routes.get("/read-notification", authenticate,clubController.readNotification);
    routes.get("/game-type", authenticate,clubController.getGameType);

    routes.post("/add-chips", authenticate,clubController.addClubChips);
    routes.post("/claim-chips", authenticate,clubController.claimClubChips);
    routes.get("/get-trade-history", authenticate, clubController.getClubTradeHistory )
    routes.get("/get-table-fields", authenticate, clubController.getClubFields )
    routes.get("/get-club-trade-details", authenticate, clubController.getClubTradeDetails )
    routes.get("/search-member", authenticate, clubController.searchMember )
    routes.get("/filter-member", authenticate, clubController.filterMember )
    routes.post("/create-table", authenticate, clubController.createClubTable )
    routes.get("/get-template-list", authenticate, clubController.templateList )
    routes.get("/get-template-details/:id", authenticate, clubController.templateDetail )
    routes.post("/update-template", authenticate, clubController.updateTemplate )
    routes.get("/games", clubController.getClubgames);

    routes.get("/delete-template/:id", authenticate, clubController.deleteTemplate )

  routes.get("/club-game-result/:table_id", authenticate, clubController.getClubGameResultByTableId);

    /*Agent Routes*/
    routes.post("/create-agent", authenticate, clubController.createAgent)
    routes.get("/agent-list", authenticate, clubController.agentList)
    routes.get("/agent-detail", authenticate, clubController.agentDetail)
    routes.get("/delete-agent", authenticate, clubController.deleteAgent)
    routes.get("/member-list-by-agent", authenticate, clubController.memberListByAgent)
    routes.get("/delete-member", authenticate, clubController.deleteMember)

    routes.get("/get-club-level-list",authenticate,clubController.getAllClubLevel)

    routes.get("/delete-club", authenticate,clubController.deleteClub);
    routes.get("/hand-history/:table_id", authenticate, clubController.getHandHistoryByTableId);

    routes.get("/club-data/:club_id",authenticate,clubController.clubData)
    // removal of player from the club -> 
    routes.get("/remove-player",authenticate,clubController.removalOfPlayer)
    // handHistory in admin
    routes.get("/hand-history-admin",authenticate,clubController.handHistoryAdmin)

    return routes;
}

