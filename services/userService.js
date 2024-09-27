const db = require("../helpers/db");
const { sequelize } = require("../models");
//User Related Query
const createUser = (userObj) => {
   return db.users.create(userObj);
}

const getUserDetailsById = (query) => {
   return db.users.findOne({ where: query, raw: true });
}

const getUserLoginDetailsById = (query) => {
   return db.user_login_log.findAll({ where: query, order: [['user_login_log_id', 'DESC']] });
}

const getUserDetailsByQuery = (query) => {
   return db.users.findAll({ where: query });
}

const updateUserByQuery = (data, query) => {
   return db.users.update(
      data,
      { where: query }
   );
}

//User Kyc Related Query
const createUserKyc = (userObj) => {
   return db.user_kyc.create(userObj);
}

const getUserKycDetailsById = (query) => {
   return db.user_kyc.findOne({ where: query });
}

const getUserActivityDetailsById = (query) => {
   return db.user_log.findAll({ where: query, order: [['user_log_id', 'DESC']] });
}

const getUserKycDetailsByQuery = (query) => {
   return db.user_kyc.findAll({ where: query });
}

const updateUserKycByQuery = (data, query) => {
   return db.user_kyc.update(
      data,
      { where: query }
   );
}

//User Wallet Related Query
const createUserWallet = (userObj) => {
   return db.user_wallet.create(userObj);
}

const getUserWalletDetailsById = (query) => {
   return db.user_wallet.findOne({ where: query });
}

const getUserWalletDetailsByQuery = (query) => {
   return db.user_wallet.findOne({ where: query });
}

const updateUserWallet = (data, query) => {
   return db.user_wallet.update(
      data,
      { where: query }
   );
}

const createLockedBalanceHistory = (data) => {
   return db.locked_balance_history.create(data);
}

const getLockedBalanceHistory = (query) => {
   return db.locked_balance_history.findAll({ where: query, raw: true });
}

const getOneLockedBalanceHistory = (query) => {
   return db.locked_balance_history.findOne({ where: query, raw: true });
}

const getOneLockedBalanceHistoryByOrder = (query) => {
   return db.locked_balance_history.findOne(query);
}

const updateLockedBalanceHistory = (data, query) => {
   return db.locked_balance_history.update(
      data,
      { where: query }
   );
}

const createPokerSessionWin = (data) => {
   return db.poker_session_win.create(data);
}

const getPokerSessionWin = (query) => {
   return db.poker_session_win.findAll({ where: query, raw: true });
}

const getPokerSessionWinGroupOrder = (query) => {
   return db.poker_session_win.findAll(query);
}

const getOnePokerSessionWin = (query) => {
   return db.poker_session_win.findOne({ where: query, raw: true });
}

const updatePokerSessionWin = (data, query) => {
   return db.poker_session_win.update(
      data,
      { where: query }
   );
}

//User Bank Account Related Query
const createBankAccount = (userObj) => {
   return db.user_account.create(userObj);
}

const updateBankAccount = (userObj, query) => {
   return db.user_account.update(userObj, { where: query });
}

const getUserBankDetailsById = (query) => {
   return db.user_account.findOne({ where: query });
}

const getUserBankByQuery = (query) => {
   return db.user_account.findAll({ where: query });
}

const createTransaction = (userObj) => {
   return db.transactions.create(userObj);
}
const redemptionSave = (userObj) => {
   return db.redemptions.create(userObj);
}
const createTds = (userObj) => {
   return db.tds.create(userObj);
}

const addUserLog = (userObj) => {
   return db.user_log.create(userObj);
}

const getUserNotifications = (query) => {
   return db.notifications.findAll({ where: query });
}

const getPolicyData = () => {
   return db.policy.findOne();
}

const getGameHistory = (query) => {
   return db.game_history.findAll({ where: query, raw: true });
}

const getTransactionData = (query) => {
   return db.transactions.findAll({ where: query, order: [['transaction_id', 'DESC']] });
}

const getOneTransactionByQuery = (query) => {
   return db.transactions.findOne({ where: query, raw: true });
}

const updateTransaction = (data, query) => {
   return db.transactions.update(
      data,
      { where: query }
   );
}

const getBankList = (query) => {
   return db.user_account.findAll({ where: query });
}

const getRedeemList = (query) => {
   return db.redemptions.findAll({ where: query });
}

const getRedeemDataById = (query) => {
   return db.redemptions.findOne({ where: query });
}

const saveGameHistory = (data) => {
   return db.game_history.create(data);
}

const getGameHistoryByQuery = (query) => {
   return db.game_history.findAll({ where: query });
}

const getOneGameHistoryByQuery = (query) => {
   return db.game_history.findOne({ where: query });
}

const updateGameHistory = (data, query) => {
   return db.game_history.update(
      data,
      { where: query }
   );
}

const createCoinHistory = (data) => {
   return db.coin_deduct_history.create(data);
}

const createLoginLog = (data) => {
   return db.user_login_log.create(data)
}

const addAddress = (data) => {
   return db.user_address.create(data);
}

const updateAddress = (data, query) => {
   return db.user_address.update(
      data,
      { where: query }
   );
}

const getAddressById = (query) => {
   return db.user_address.findOne({ where: query });
}

const getAllAddressByUserId = (query) => {
   return db.user_address.findAll({ where: query });
}

const getGameCategoryByQuery = (query) => {
   return db.game_category.findOne({ where: query, raw: true });
}

const getGamesTypeByQuery = (query) => {
   return db.game_type.findAll({ where: query, raw: true });
}
const getUserDetails = async (user_id) => {
   let data = await sequelize.query(`Select username ,profile_image ,real_amount , practice_amount,bonus_amount ,coins,win_amount,locked_amount from users JOIN user_wallets on users.user_id = user_wallets.user_id  where users.user_id = ${user_id}`
      , { raw: true, type: sequelize.QueryTypes.SELECT })
   return data;
}

const getLeaderBoard = (query) => {
   return db.leaderboard.findAll(query);
}

const getBonusSetting = () => {
   return db.referral_bonus_settings.findOne();
}

const checkUserReferalData = (query) => {
   return db.user_referral.findOne({ where: query });
}

const createReferralData = (data) => {
   return db.user_referral.create(data);
}

const getTransactionById = (query) => {
   return db.transactions.findOne({ where: query });
}

const getDocumentsByRawQuery = async (sql) => {
   return await sequelize.query(sql, { raw: true, type: sequelize.QueryTypes.SELECT });
}
const getLastTransactionById = (query) => {
   return db.transactions.findOne({where:query, order: [['transaction_id', 'DESC']]});
}

module.exports = {
   createUser,
   getUserDetailsById,
   getUserDetailsByQuery,
   updateUserByQuery,

   createUserKyc,
   getUserKycDetailsById,
   getUserKycDetailsByQuery,
   updateUserKycByQuery,

   getLockedBalanceHistory,
   getOneLockedBalanceHistory,
   updateLockedBalanceHistory,
   createLockedBalanceHistory,

   createPokerSessionWin,
   getPokerSessionWin,
   getOnePokerSessionWin,
   updatePokerSessionWin,
   getPokerSessionWinGroupOrder,

   createBankAccount,
   getUserBankDetailsById,
   getUserBankByQuery,
   getUserWalletDetailsById,
   createUserWallet,
   updateUserWallet,

   createTransaction,
   redemptionSave,
   createTds,
   addUserLog,
   getUserNotifications,
   getPolicyData,
   getGameHistory,
   getTransactionData,
   getBankList,
   getRedeemList,

   saveGameHistory,
   getGameHistoryByQuery,
   getOneGameHistoryByQuery,
   updateGameHistory,

   createCoinHistory,
   createLoginLog,
   addAddress,
   updateAddress,
   getAllAddressByUserId,
   getAddressById,
   getUserActivityDetailsById,
   getUserLoginDetailsById,
   getUserWalletDetailsByQuery,
   updateTransaction,
   getOneTransactionByQuery,
   getGameCategoryByQuery,
   getGamesTypeByQuery,
   getUserDetails,
   getLeaderBoard,

   getBonusSetting,
   checkUserReferalData,
   createReferralData,
   updateBankAccount,
   getRedeemDataById,

   getTransactionById,
   getOneLockedBalanceHistoryByOrder,
   getDocumentsByRawQuery,
   getLastTransactionById
};
