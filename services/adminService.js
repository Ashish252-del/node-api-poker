const db = require("../helpers/db");
const { sequelize } = require("../models");
const {Op, Sequelize} = require("sequelize");
const {query} = require("express");
//User Related Query
const geAdminDetailsById = (query) => {
    return db.admins.findOne({where: query, raw: true});
}
const getAllAdmins = (query) => {
    return db.admins.findAll({where: query, raw: true});
}

const getAdminUserActivityLogs = (query) => {
    return db.admin_activity_logs.findAll({where: query});
}

const updateAdminByQuery = (data, query) => {
    return db.admins.update(
        data,
        {where: query}
    );
}

const getUserDetailsById = (query) => {
    return db.users.findOne({where: query, raw: true});
}


const createRole = (query) => {
    return db.roles.create(query);
}

const getUserList = (query) => {
    if (query == 1) {
        return db.users.findAll()
    } else {
        return db.users.findAll(query)
    }

}

const CountAll = (query) => {
    return db.users.findAndCountAll(query)
}

const createGame = (query) => {
    return db.games.create(query);
}

const getGameByQuery = (query) => {
    return db.games.findOne({where: query});
}

const getAllGameList = (query, limit, offset) => {
    return db.games.findAll({
      where: query,
      order: [["game_id", "DESC"]],
      limit: limit,
      offset: offset,
    });
  };
  const getGameCount = (query) => {
    return db.games.count({ where: query });
  };
  

const updateGameById = (data, query) => {
    return db.games.update(
        data,
        {where: query}
    );
}

const getWithdrawl = (query) => {
    return db.redemptions.findAll({
        where: query,
        attributes: [[Sequelize.fn('sum', Sequelize.col('redeem_amount')), 'redeem_amount']]
    })
}

const getDeposit = (query) => {
    return db.transactions.findAll({
        where: query,
        attributes: [[Sequelize.fn('sum', Sequelize.col('amount')), 'amount']]
    })
}

const getPolicyData = () => {
    return db.policy.findOne();
}

const getRunningTableData = (query) => {
    //return db.game_table.findAll({where:query, group: "table_name",order:[['game_table_id','DESC']]});

    return db.game_table.findAll({
        where: query,
        order: [['game_table_id', 'DESC']],
        include: [{
            model: db.games,
            as: 'game_table_game_id',
            where: {game_status: '1'}
        }]
    });
}

const getTotalTableData = (query) => {
    if (query) {
        return db.game_table.findAll({where: query, group: "table_name", order: [['game_table_id', 'DESC']]});
    }
    return db.game_table.findAll({group: "table_name", order: [['game_table_id', 'DESC']]});
}

const addUserStatus = (data) => {
    return db.user_game_status.create(data);
}

const getUserStatus = (query) => {
    return db.user_game_status.findOne({where: query,raw:true});
}

const updateUserStatus = (data, query) => {
    return db.user_game_status.update(
        data,
        {where: query}
    );
}

const gameHistory = (query) => {
    if (query) {
        return db.game_history.findAll({
            where: query, order: [
                ['game_history_id', 'DESC']
            ]
        });
    }
    return db.game_history.findAll({
        order: [
            ['game_history_id', 'DESC']
        ]
    });
}

const gameHistoryWithCount = (query) => {
    return db.game_history.findAndCountAll(query);
}

const sendNotification = (data) => {
    return db.notifications.create(data);
}

const getCoins = (query) => {
    return db.coins.findOne({where: query});
}

const getAllCoinsData = () => {
    return db.coins.findAll();
}

const addCoins = (data) => {
    return db.coins.create(data);
}

const updateCoins = (data, query) => {
    return db.coins.update(
        data,
        {where: query}
    );
}

const createAdminUser = (data) => {
    return db.admins.create(data);
}

const getAgentList = (query) => {
    if (query) {
        return db.admins.findAll({where: query});
    }
    return db.admins.findAll();
}

const addRole = (data) => {
    return db.roles.create(data);
}

const updateRole = (data, query) => {
    return db.roles.update(
        data,
        {where: query}
    );
}

const deleteRole = ( id) => {
    db.user_roles.destroy({where:{roleId:id}});
    db.role_modules.destroy({where:{roleId:id}});
    return db.roles.destroy(
        {where: {role_id:id}}
    );
}

const getRoleByQuery = (query) => {
    return db.roles.findOne({where: query});
}
const getRoleById = (query) => {
    return db.roles.findOne({where: query});
};

const getAllRoles = (query) => {
    if (query) {
        return db.roles.findAll({where: query});
    }
    return db.roles.findAll();
}

const addGameCategory = (data) => {
    return db.game_category.create(data);
}

const updateGameCategory = (data, query) => {
    return db.game_category.update(
        data,
        {where: query}
    );
}

const getGameCategoryByQuery = (query) => {
    return db.game_category.findOne({where: query});
}

const getAllGameCategory = (query) => {
    if (query) {
        return db.game_category.findAll({where: query});
    }
    return db.game_category.findAll();
}

const addGameType = (data) => {
    return db.game_type.create(data);
}

const updateGameType = (data, query) => {
    return db.game_type.update(
        data,
        {where: query}
    );
}

const getGameTypeByQuery = (query) => {
    return db.game_type.findOne({where: query});
}

const getPoolGameTypeByQuery = (query) => {
    return db.pool_games.findOne({where: query});
}

const getAllGameType = (query) => {
    if (query) {
        return db.game_type.findAll({
            where: query, order: [
                ['game_type_id', 'DESC']
            ]
        });
    }
    return db.game_type.findAll({
        order: [
            ['game_type_id', 'DESC']
        ]
    });
}
const createLoginLog = (data) => {
    return db.admin_login_logs.create(data);
}

const getWithdrawal = (query) => {
    return db.redemptions.findAll({where: query});
}

const getTodayDeposit = (query) => {
    return db.transactions.findAll({where: query});
}

const getCashTransaction = (query) => {
    return db.transactions.findAll({
        where: query, order: [
            ['transaction_id', 'DESC']
        ]
    });
}

const getModules = () => {
    return db.role_modules.findAll();
}

const getPermissionQuery = (query) => {
    return db.role_modules.findAll({where: query});
}

const addRolePermission = (data) => {
    return db.role_permissions.create(data);
}

const updateRolePermission = (data, query) => {
    return db.role_permissions.update(
        data,
        {where: query}
    );
}

const getGameHistoryCountByUserId = (query) => {
    return db.game_history.count({col: 'user_id', where: query});
}

const createPriceStructure = (query) => {
    return db.price_structures.create(query);
}

const getPriceStructureByQuery = (query) => {
    return db.price_structures.findOne({where: query});
}

const getAllPriceStructureList = (query) => {
    return db.price_structures.findAll({where: query, order: [['price_id', 'DESC']]});
}

const updatePriceStructureById = (data, query) => {
    return db.price_structures.update(
        data,
        {where: query}
    );
}


const createBlindStructure = (query) => {
    return db.blind_structures.create(query);
}

const getBlindStructureByQuery = (query) => {
    return db.blind_structures.findOne({where: query});
}

const getAllBlindStructureList = (query) => {
    return db.blind_structures.findAll({where: query, order: [['blind_id', 'DESC']]});
}

const updateBlindStructureById = (data, query) => {
    return db.blind_structures.update(
        data,
        {where: query}
    );
}

const getClubList = (query) => {
    return db.club.findAll(query);
}

const getClubDetailById = (query) => {
    return db.club.findOne(query);
}
// const getClubDetailById = (clubId) => {
//     return db.club.findOne({ where: { clubId: clubId } });
// };


const updateClubById = (data, query) => {
    return db.club.update(data, {where: query});
}

const getJoinedclub = (query) => {
    console.log("query", query);
    return db.clubRegisteredUser.findAll(query);
}

const createVipPriviledge = (data) => {
    return db.vip_priviledge.create(data);
}

const getVipPriviledgeById = (query) => {
    return db.vip_priviledge.findOne(query);
}

const getAllVipPriviledge = (query) => {
    return db.vip_priviledge.findAll(query);
}

const updateVipPriviledge = (data, query) => {
    return db.vip_priviledge.update(data, query);
}

const addClubLevel = (data) => {
    return db.club_level.create(data);
}

const getClubLevelById = (query) => {
    return db.club_level.findOne(query);
}

const getAllClubLevel = (query) => {
    return db.club_level.findAll(query);
}

const updateClubLevel = (data, query) => {
    return db.club_level.update(data, query);
}

const addShop = (data) => {
    return db.shop.create(data);
}

const getShopById = (query) => {
    return db.shop.findOne(query);
}

const getAllShop = (query) => {
    return db.shop.findAll(query);
}

const updateShop = (data, query) => {
    return db.shop.update(data, query);
}

const addMission = (data) => {
    return db.mission.create(data);
}

const getMissionById = (query) => {
    return db.mission.findOne(query);
}

const getAllMission = (query) => {
    return db.mission.findAll(query);
}

const updateMission = (data, query) => {
    return db.mission.update(data, query);
}

const getModuleByName = (moduleName) => {
    return db.modules.findOne({where: {moduleName: moduleName}});
}
const getModuleById = (module_id) => {
    return db.modules.findOne({where: {moduleId: module_id}});
}


const createModule = (moduleData) => {
    return db.modules.create(moduleData);
}
const createclubModule = (moduleData) => {
    return db.club_modules.create(moduleData);
}
const createclubMemberRoleModule = (moduleData) => {
    return db.club_member_role_modules.create(moduleData);
}

const deleteModule = (moduleId) => {
    return db.modules.destroy({where: {moduleId: moduleId}});
}

const getRoleModuleByModuleIdAndRoleId = (query) => {
    return db.role_modules.findOne({where: query});
}

const createRoleModule = (query) => {
    return db.role_modules.create(query);
}

const deleteRoleModule = (Id) => {
    return db.role_modules.destroy({where: {id: Id}});
}

const updateModule = (data, query) => {
    return db.modules.update(data, query);
}
const createUserRole = (query) => {
    return db.user_roles.create(query);
}
const getUserRoleByUserIdAndRoleId = (query) => {
    return db.user_roles.findOne({where: query});
}
const deleteUserRole = (Id) => {
    return db.user_roles.destroy({where: {id: Id}});
}

// createUserRole,getUserRoleByUserIdAndRoleId,deleteRoleModule
const deletePrice = (query) => {
    return db.price_structures.destroy({where: query});
}
const deleteBlindStructures = (query) => {
    return db.blind_structures.destroy({where: query});
}
const getAllModules = (query) => {
    return db.modules.findAll({where: query, raw: true});
}

const getUserRoles = (query) => {
    return db.user_roles.findAll({where: query, raw: true});
}
const getRoleModules = (query) => {
    return db.role_modules.findAll({where: query, raw: true});
}
const createClubMemberRole = (query) => {
    return db.club_member_roles.create(query)
}
const createAvatar = (data) => {
    return db.avatar.create(data)
}
const findAvatar = (data) => {
    return db.avatar.findOne({where: data})
}
const getAllAvatar = (data) => {
    return db.avatar.findAll({where: data})
}
const deleteAvatarById = (query) => {
    return db.avatar.destroy({where: query})
}

// 8ball poll services->
//User Related Query

addPolicy = (data) => {
    return db.policy.create(data);
}

updatePolicy = (data, query) => {
    return db.policy.update(
        data,
        {where: query}
    );
}
getFilterTableData = (query, type) => {
    if (type == 1) {
        return db.game_table.findAll({where: query});
    } else {
        return db.user_join_table.findAll({where: query});
    }
}

addUserLevel = (data) => {
    return db.user_level.create(data);
}

getLevelByQuery = (query) => {
    return db.user_level.findOne({where: query});
}

getAllLevelByQuery = () => {
    return db.user_level.findAll();
}

updateUserLevel = (data, query) => {
    return db.user_level.update(
        data,
        {where: query}
    );
}
addEmojisData = (data) => {
    return db.emojis.create(data);
}

getEmojisByName = (query) => {
    return db.emojis.findOne({where: query});
}

getEmojisData = () => {
    return db.emojis.findAll({});
}

deleteEmojis = (query) => {
    return db.emojis.destroy({where: query});
}


getWithdrawlRequestById = (query) => {
    return db.redemptions.findOne({where: query});
}

updateRedemption = (data, query) => {
    return db.redemptions.update(
        data,
        {where: query}
    );
}


getReferralBonus = (query) => {
    return db.referral_bonus_settings.findOne();
}

createBonusSetting = (data) => {
    return db.referral_bonus_settings.create(data)
}


updateBonusSetting = (data, query) => {
    return db.referral_bonus_settings.update(
        data,
        {where: query}
    );
}
const createNotification = (data) => {
    return db.notifications.create(data)
}

const createBanner = (data) => {
    return db.banners.create(data);
}


const updateBanner = (data,query) => {
    return db.banners.update(
        data,
        { where: query }
    );
}
const getLeaderBoard = (query) => {
    return db.leaderboard.findAll({
        where: query, order: [
            ['rank', 'ASC'],
        ]
    });
}

const createTournament = (query) => {
    return db.tournaments.create(query);
}

const getTournamentByQuery = (query) => {
    return db.tournaments.findOne({where : query});
}

const getAllTournamentList = (query) => {
    if(query){
        return db.tournaments.findAll({where : query,order:[['tournament_id','DESC']]});
    }
    return db.tournaments.findAll();
}

const updateTournamentById = (data, query) => {
    return db.tournaments.update(
        data,
        { where: query }
    );
}

const getBannerByQuery = (query) => {
    return db.banners.findOne({where:query});
}

const getAllBanners = (query) => {
    if(query){
        return db.banners.findAll({where:query});
    }
    return db.banners.findAll();
}

const getLudoGameHistory=()=>{
    return db.ludo_game_history.findAll({raw:true});
}
const getLudoGameHistoryByQuery=(query)=>{
    return db.ludo_game_history.findAll({where:query,raw:true});
}
const getLudoGameHistoryById=(query)=>{
    return db.ludo_game_history.findOne({where:query,raw:true});
}
const getLudoGameByQuery=(query)=>{
    return db.ludo_game.findOne({where:query,raw:true});
}
const getLudoGameTypeByQuery=(query)=>{
    return db.ludo_game_type.findOne({where:query,raw:true});
}
const getPoolGameHistory=()=>{
    return db.pool_game_history.findAll({raw:true})
}
// const getAllpockerSuspiciousActions=({limit, offset} )=>{ 
//     return   sequelize.query(`SELECT username ,id ,gameId , tableId,action , roundId , pokerSuspiciousActions.createdAt,pokerSuspiciousActions.updatedAt,game_json_data FROM pokerSuspiciousActions JOIN users ON users.user_id = pokerSuspiciousActions.userId JOIN games ON games.game_id = pokerSuspiciousActions.gameId  order by id desc LIMIT :limit OFFSET :offset `
//           , {replacements: { limit, offset },raw: true, type: sequelize.QueryTypes.SELECT})
// }
const getAllpockerSuspiciousActions = ({ limit, offset, search_key, from_date, end_date }) => { 
    let searchCondition = ""; 
    let replacements = { limit, offset };
  
    if (search_key) {
      searchCondition += `AND (
        username LIKE :search_key 
        OR CAST(gameId AS CHAR) LIKE :search_key 
        OR action LIKE :search_key
      ) `;
      replacements.search_key = `%${search_key}%`;
    }
  
    if (from_date) {
      searchCondition += `AND pokerSuspiciousActions.createdAt >= :from_date `;
      replacements.from_date = from_date;
    }
  
    if (end_date) {
      searchCondition += `AND pokerSuspiciousActions.createdAt <= :end_date `;
      replacements.end_date = end_date;
    }
  
    return sequelize.query(
      `SELECT username, id, gameId, tableId, action, roundId, 
              pokerSuspiciousActions.createdAt, pokerSuspiciousActions.updatedAt, game_json_data 
       FROM pokerSuspiciousActions 
       JOIN users ON users.user_id = pokerSuspiciousActions.userId 
       JOIN games ON games.game_id = pokerSuspiciousActions.gameId  
       WHERE 1=1 ${searchCondition} 
       ORDER BY id DESC 
       LIMIT :limit OFFSET :offset`,
      { replacements, raw: true, type: sequelize.QueryTypes.SELECT }
    );
  };
  const getSuspiciousActionsCount = (search_key, from_date, end_date) => {
    let searchCondition = ""; 
    let replacements = {};
  
    if (search_key) {
        searchCondition += `AND (
          username LIKE :search_key 
          OR CAST(gameId AS CHAR) LIKE :search_key 
          OR action LIKE :search_key
        ) `;
        replacements.search_key = `%${search_key}%`;
      }
  
    if (from_date) {
      searchCondition += `AND pokerSuspiciousActions.createdAt >= :from_date `;
      replacements.from_date = from_date;
    }
  
    if (end_date) {
      searchCondition += `AND pokerSuspiciousActions.createdAt <= :end_date `;
      replacements.end_date = end_date;
    }
  
    return sequelize.query(
      `SELECT COUNT(*) AS count 
       FROM pokerSuspiciousActions 
       JOIN users ON users.user_id = pokerSuspiciousActions.userId 
       JOIN games ON games.game_id = pokerSuspiciousActions.gameId  
       WHERE 1=1 ${searchCondition}`,
      { replacements, raw: true, type: sequelize.QueryTypes.SELECT }
    );
  };

  const getAllPoolTables = (query) => {
    return db.pool_game_tables.findAll({where:query,raw:true});
}

  

module.exports = {
    getSuspiciousActionsCount,
    getAllpockerSuspiciousActions,
    createPriceStructure,
    getPriceStructureByQuery,
    getAllPriceStructureList,
    updatePriceStructureById,
    createBlindStructure,
    getBlindStructureByQuery,
    getAllBlindStructureList,
    updateBlindStructureById,
    getUserDetailsById,
    geAdminDetailsById,
    updateAdminByQuery,
    createRole,
    getUserList,
    createGame,
    getGameByQuery,
    updateGameById,
    getWithdrawl,
    getDeposit,
    getPolicyData,
    getRunningTableData,
    getTotalTableData,
    addUserStatus,
    updateUserStatus,
    getUserStatus,
    gameHistory,
    sendNotification,
    getCoins,
    getAllCoinsData,
    addCoins,
    updateCoins,
    createAdminUser,
    getAgentList,
    addRole,
    getAllRoles,
    updateRole,
    getRoleByQuery,
    addGameCategory,
    updateGameCategory,
    getGameCategoryByQuery,
    getAllGameCategory,
    addGameType,
    updateGameType,
    getGameTypeByQuery,
    getAllGameType,
    createLoginLog,
    getWithdrawal,
    getTodayDeposit,
    getAdminUserActivityLogs,
    getCashTransaction,
    getModules,
    addRolePermission,
    updateRolePermission,
    getPermissionQuery,
    getGameHistoryCountByUserId,
    CountAll,
    gameHistoryWithCount,

    getClubList,
    getClubDetailById,
    updateClubById,
    getJoinedclub,
    createVipPriviledge,
    getVipPriviledgeById,
    updateVipPriviledge,
    getAllVipPriviledge,

    addClubLevel,
    updateClubLevel,
    getClubLevelById,
    getAllClubLevel,

    addShop,
    getShopById,
    getAllShop,
    updateShop,

    addMission,
    getMissionById,
    getAllMission,
    updateMission,
    getModuleByName,
    createModule,
    deleteModule,
    getRoleModuleByModuleIdAndRoleId,
    createRoleModule,
    deleteRoleModule,
    getUserRoleByUserIdAndRoleId,
    createUserRole,
    deleteUserRole,
    getRoleById,
    deletePrice,
    deleteBlindStructures,
    getAllModules,
    getModuleById,
    updateModule,
    getUserRoles,
    getRoleModules,
    createClubMemberRole,
    createclubModule,
    createclubMemberRoleModule,
    createAvatar,
    findAvatar,
    getAllAvatar,
    deleteAvatarById,

    // poll exports-> 
    geAdminDetailsById,
    updateAdminByQuery,
    createRole,
    getUserList,
    createGame,
    getGameByQuery,
    getAllGameList,
    getGameCount,
    updateGameById,
    getWithdrawl,
    getDeposit,
    getPolicyData,
    addPolicy,
    updatePolicy,
    getRunningTableData,
    getTotalTableData,
    getFilterTableData,
    addUserLevel,
    getLevelByQuery,
    getAllLevelByQuery,
    updateUserLevel,
    addUserStatus,
    getModules,
    getPermissionQuery,
    getRoleByQuery,
    addEmojisData,
    getEmojisData,
    getEmojisByName,
    deleteEmojis,
    getGameHistoryCountByUserId,
    getWithdrawal,
    getTodayDeposit,
    getCashTransaction,
    getWithdrawlRequestById,
    updateRedemption,
    getUserStatus,
    updateUserStatus,
    sendNotification,
    getReferralBonus,
    createBonusSetting,
    updateBonusSetting,
    createNotification,
    createBanner,
    updateBanner,
    getBannerByQuery,
    getAllBanners,
    getLeaderBoard,
    createTournament,
    getTournamentByQuery,
    getAllTournamentList,
    updateTournamentById,
    getLudoGameHistory,
    getPoolGameHistory,
    getAllAdmins,
    deleteRole,
    getPoolGameTypeByQuery,
    getAllPoolTables,
    getLudoGameTypeByQuery,
    getLudoGameHistoryByQuery,
    getLudoGameHistoryById,
    getLudoGameByQuery
}
