const db = require("../helpers/db");

const getClubByUserId = (query) => {
    return db.clubRegisteredUser.findAll(query);
}

const getRequestSent = (query) => {
    return db.clubRegisteredUser.findOne(query);
}

const deleteMember = (query) => {
    return db.clubRegisteredUser.destroy(query);
}
const updateMember = (updateValues, query) => {
    return db.clubRegisteredUser.update(updateValues, query);
}

const getClubByClubId = (query) => {
    return db.club.findOne(query);
}
const createClub = (query) => {
    return db.club.create(query);
}

const updateClub = (data,query) => {
    return db.club.update(data,query);
}

const joinClub = (query) => {
    return db.clubRegisteredUser.create(query);
}
const getJoinedclub = (query) => {
    return db.clubRegisteredUser.findAll(query);
}

const getJoinClubByClubId = (query) => {
    return db.clubRegisteredUser.findOne(query);
}
const getLockedBalanceHistory = (query) => {
    return db.locked_balance_history.findAll({where: query, raw: true});
}


const updateJoinClub = (data,query) => {
    return db.clubRegisteredUser.update(data,query);
}

const getNotificationByUserId = (query) => {
    return db.notifications.findAll(query);
}

const saveNotification = (data) => {
    return db.notifications.create(data);
}

const countOfnewNotifications = (query) =>{
  return db.notifications.count(query);
}

const getMemberList = (query) => {
    return db.clubRegisteredUser.findAll(query);
}

const getMemberCount = (query) => {
    return db.clubRegisteredUser.count(query);
}

const getClubList = (query) => {
    return db.club.findAll(query);
}

const getAnnouncementList = (query) => {
    return db.announcement.findAll(query);
}

const updateNotification = (data,query) => {
    return db.notifications.update(data,query);
}

const getGameTypeList = (query) => {
    return db.game_type.findAll(query);
}

const createClubTradeHistory = (data) => {
    return db.club_trade_history.create(data);
}

const updateClubTradeHistory = (data,query) => {
    return db.club_trade_history.update(data,query);
}

const getUserClubTradeHistory = (query) => {
    return db.club_trade_history.findOne(query);
}

const getUserClubAllTradeHistory = (query) => {
    return db.club_trade_history.findAll(query);
}

const getClubGametypeId = (query) =>{
    return db.game_type.findOne(query);
}

const getGameByQuery = (query) => {
    return db.games.findOne({where : query});
}

const getAllGameList = (query) => {
    return db.games.findAll({where:query, order:[['game_id','DESC']]});
}

const updateGameById = (data, query) => {
    return db.games.update(
        data,
        { where: query }
    );
}

const getClubGamesByQuery = (query) => {
    return db.games.findAll({where: query, raw: true});
 }
const createClubAgent = (data) => {
    return club_agent.create(data)
}

const getAgentList = (query) => {
    return club_agent.findAll(query)
}
const getAllClubs = (query) => {
    return db.club.findAll(query);
}

const getUnionById = (query) => {
    return db.union.findOne(query);
}
const createUnion = (query) => {
    return db.union.create(query);
}

const updateUnion = (data,query) => {
    return db.union.update(data,query);
}

const deleteClubData = (query) => {
    return db.club.destroy(query);
}

const deleteClubRegisterData = (query) => {
    return db.clubRegisteredUser.destroy(query);
}

const deleteClubTradeData = (query) => {
    return db.club_trade_history.destroy(query);
}
module.exports = {
    getClubByClubId,
    getClubByUserId,
    createClub,
    updateClub,
    joinClub,
    getJoinedclub,
    saveNotification,
    getNotificationByUserId,
    countOfnewNotifications,
    updateJoinClub,
    getJoinClubByClubId,
    getMemberList,
    getClubList,
    getRequestSent,
    getMemberCount,
    getAnnouncementList,
    updateNotification,
    getGameTypeList,
    createClubTradeHistory,
    updateClubTradeHistory,
    getUserClubTradeHistory,
    getClubGametypeId,
    getUserClubAllTradeHistory,
    getGameByQuery,
    getAllGameList,
    updateGameById,
    getClubGamesByQuery,
    createClubAgent,
    getAgentList,
    deleteMember,
    getAllClubs,

    getUnionById,
    createUnion,
    updateUnion,

    deleteClubData,
    deleteClubRegisterData,
    deleteClubTradeData,
    getLockedBalanceHistory,
    updateMember
}