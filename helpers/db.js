const mysql = require('mysql2/promise');
const {Sequelize, DataTypes} = require('sequelize');
const process = require('process');
const path = require('path');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/dbconfig.js')[env];
initialize();

module.exports = db = {};

async function initialize() {
    // create db if it doesn't already exist
    let host = config.host;
    let port = config.port;
    let user = config.username;
    let password = config.password;
    const connection = await mysql.createConnection({host, port, user, password});
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);

    // connect to db
    const sequelize = new Sequelize(config.database, config.username, config.password, {host, dialect: 'mysql'});

    db.sequelize = sequelize;

    // init models and add them to the exported db object
    db.users = require('../models/userModel')(sequelize, DataTypes);
    db.admins = require('../models/adminModel')(sequelize, DataTypes);
    db.admin_activity_logs = require('../models/adminActivityLogModel')(sequelize, DataTypes);
    db.admin_login_logs = require('../models/adminLoginLogModel')(sequelize, DataTypes);
    db.game_category = require('../models/gameCategoryModel')(sequelize, DataTypes);
    db.game_type = require('../models/gameTypeModel')(sequelize, DataTypes);
    db.roles = require('../models/roleModel')(sequelize, DataTypes);
    db.user_wallet = require('../models/userwalletModel')(sequelize, DataTypes);
    db.games = require('../models/gameModel')(sequelize, DataTypes);
    db.game_history = require('../models/gameHistoryModel')(sequelize, DataTypes);
    db.user_kyc = require('../models/userKycModel')(sequelize, DataTypes);
    db.transactions = require('../models/transactionModel')(sequelize, DataTypes);
    db.user_account = require('../models/userBankAccountModel')(sequelize, DataTypes);
    db.redemptions = require('../models/redemptionModel')(sequelize, DataTypes);
    db.tds = require('../models/tdsModel')(sequelize, DataTypes);
    db.user_log = require('../models/userLogModel')(sequelize, DataTypes);
    db.notifications = require('../models/notificationModel')(sequelize, DataTypes);
    db.game_table = require('../models/gameTableModel')(sequelize, DataTypes);
    db.table_round = require('../models/tableRoundModel')(sequelize, DataTypes);
    db.block_user = require('../models/blockUser')(sequelize, DataTypes);
    db.user_address = require('../models/userAddress')(sequelize, DataTypes);
    db.user_login_log = require('../models/userLoginLogs')(sequelize, DataTypes);
    db.payment = require('../models/paymentModel')(sequelize, DataTypes);
    db.role_modules = require('../models/roleModuleModel')(sequelize, DataTypes);
    db.role_permissions = require('../models/assignRolePermissionModel')(sequelize, DataTypes);
    db.locked_balance_history = require('../models/lockedBalanceHistory')(sequelize, DataTypes);
    db.poker_table_dump = require('../models/pokerTablesDump')(sequelize, DataTypes);
    db.poker_session_stats = require('../models/pokerSessionStats')(sequelize, DataTypes);
    db.poker_user_stats = require('../models/pokerUserStats')(sequelize, DataTypes);
    db.poker_session_win = require('../models/pokerWinInSessionModal')(sequelize, DataTypes);
    db.tds_setting = require('../models/tdsSettingModel')(sequelize, DataTypes);
    db.redemption_setting = require('../models/redemptionSetting')(sequelize, DataTypes);
    db.price_structures = require('../models/priceStructureModel')(sequelize, DataTypes);
    db.blind_structures = require('../models/blindStructureModel')(sequelize, DataTypes);
    db.club = require('../models/club')(sequelize, DataTypes);
    db.clubRegisteredUser = require('../models/clubRegisteredUser')(sequelize, DataTypes);
    db.announcement = require('../models/announcementModel')(sequelize, DataTypes);
    db.club_trade_history = require('../models/clubTradeHistoryModel')(sequelize, DataTypes);
    db.leaderboard = require('../models/leaderboardModel')(sequelize, DataTypes);

    db.tournaments = require('../models/tournamentModel')(sequelize, DataTypes);
    db.club_agent = require('../models/clubAgentModel')(sequelize, DataTypes);
    db.vip_priviledge = require('../models/vipPriviledgeModel')(sequelize, DataTypes);
    db.modules = require('../models/module')(sequelize, DataTypes);
    db.user_roles = require('../models/userRoleModel')(sequelize, DataTypes);
    db.club_member_roles = require('../models/clubMemberRoles')(sequelize, DataTypes);
    db.club_modules=require('../models/clubModules')(sequelize, DataTypes);
    db.club_member_role_modules=require("../models/clubMemberRoleModule")(sequelize, DataTypes);
    db.user_game_status=require("../models/userGameStatus")(sequelize, DataTypes);


    db.union = require('../models/unionModel')(sequelize, DataTypes);
    db.shop = require('../models/shopModel')(sequelize, DataTypes);
    db.mission = require('../models/missionModel')(sequelize, DataTypes);
    db.club_level = require('../models/clubLevel')(sequelize, DataTypes);
    db.referral_bonus_settings = require('../models/referralBonusSettingModel')(sequelize, DataTypes);
    db.avatar = require('../models/avatar')(sequelize,DataTypes);
    db.ludo_chat_template = require('../models/ludo_chat_template')(sequelize, DataTypes);
    db.ludo_emojis = require('../models/ludo_emojis')(sequelize,DataTypes);
    db.ludo_game_history = require('../models/ludo_game_history')(sequelize,DataTypes);
    db.ludo_game_type = require ('../models/ludo_game_type')(sequelize,DataTypes);
    db.ludo_game_varient = require('../models/ludo_game_varient')(sequelize,DataTypes);
    db.ludo_game = require('../models/ludo_game')(sequelize,DataTypes);
    db.ludo_leaderboard = require('../models/ludo_leaderboard')(sequelize,DataTypes);
    db.ludo_prize_structure = require('../models/ludo_prize_structure')(sequelize,DataTypes);
    db.ludo_shop_goods = require('../models/ludo_shop_goods')(sequelize,DataTypes);
    db.ludo_shop_users = require('../models/ludo_shop_users')(sequelize,DataTypes);
    db.ludo_shop = require('../models/ludo_shop')(sequelize,DataTypes);
    db.banners = require('../models/bannerModel')(sequelize, DataTypes);
    // pool ->
     // init models and add them to the exported db object
   db.pool_games = require('../models/pool_game')(sequelize, DataTypes);
   db.pool_emojis = require('../models/pool_emojisModel')(sequelize, DataTypes);
   db.pool_game_history = require('../models/pool_game_history')(sequelize, DataTypes);
   db.pool_game_tables = require('../models/pool_game_table')(sequelize, DataTypes);
   db.pool_table_transaction = require('../models/pool_tableTransactionModel')(sequelize, DataTypes);
   db.pool_tournaments = require('../models/pool_tournamentModel')(sequelize, DataTypes);
   db.pool_tournament_tables = require('../models/pool_tournamentTableModel')(sequelize, DataTypes);
   db.pool_notifications = require('../models/notificationModel')(sequelize, DataTypes);
   db.pool_block_user = require('../models/blockUser')(sequelize, DataTypes);
   db.referral_bonus_settings = require('../models/referralBonusSettingModel')(sequelize, DataTypes);
   db.pockerSuspiciousActions = require('../models/pokerSuspiciousActions')(sequelize, DataTypes);
    // --<
    db.buy_in_records = require('../models/buyInRequest')(sequelize, DataTypes)
    db.user_log.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "user_log_user",
    });

    db.user_address.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "user_address_user_id_fkey",
    });


    db.user_kyc.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "user_kyc_user_id",
    });

    // db.user_wallet.belongsTo(db.users, {
    //     foreignKey: "user_id",
    //     as: "user_wallet_user_id",
    // });
    db.users.hasOne(db.user_wallet, {
      foreignKey: 'user_id',
      as: 'user_wallet_user_id'
  });

    db.transactions.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "user_transaction_user_id",
    });

    db.user_account.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "user_account_user_id",
    });

    db.redemptions.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "redemptions_user_id",
    });

    db.redemptions.belongsTo(db.user_account, {
        foreignKey: "account_id",
        as: "redemptions_account_id",
    });

    db.tds.belongsTo(db.users, {
        foreignKey: "user_id",
        as: "tds_user_id",
    });

    db.game_table.hasMany(db.table_round, {
        foreignKey: "game_table_id",
        as: "table_round_table_id_fkey",
    });

    db.game_table.belongsTo(db.games, {
        foreignKey: "game_id",
        as: "game_table_game_id",
    });
    db.club.hasMany(db.clubRegisteredUser, {
        foreignKey: "clubId",
        as: "club_table_club_id"
    })
    db.clubRegisteredUser.belongsTo(db.club, {
        foreignKey: "clubId",
        as: "registered_club_id"
    })
    db.users.belongsTo(db.avatar,{
        foreignKey: 'avatarId',
        // onDelete: 'SET NULL',
        // onUpdate: 'CASCADE',
   })
    db.avatar.hasMany(db.users, {
        foreignKey: 'avatarId',
    })
    db.ludo_game_history.belongsTo(db.ludo_game,{
        foreignKey: "gameId",
      });
      db.ludo_game.hasMany(db.ludo_game_history , {
        foreignKey: "gameId"
      })
      db.ludo_game_history.belongsTo(db.users,{
        foreignKey: "userId",
      });
      db.users.hasMany(db.ludo_game_history, {
        foreignKey: "userId",
      });
      db.ludo_game.belongsTo(db.ludo_game_type,{
        foreignKey: "type_id",
      });
      db.ludo_game_type.hasMany(db.ludo_game, {
        foreignKey: "type_id",
      });
      db.ludo_game.belongsTo(db.ludo_game_varient,{
        foreignKey: "varient_id",
      });
      db.ludo_game_varient.hasMany(db.ludo_game, {
        foreignKey: "varient_id",
      });
      db.buy_in_records.belongsTo(db.users, {
        foreignKey: "user_id"
    })

    db.users.hasMany(db.buy_in_records, {
        foreignKey: "user_id"
    })
    db.users.hasMany(db.pockerSuspiciousActions, {
        foreignKey: "userId"
    })
    db.pockerSuspiciousActions.belongsTo(db.users, {
        foreignKey: "userId"
    })
    // sync all models with database
      //  await sequelize.sync({alter: true});
}
