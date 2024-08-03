const {successResponse, errorResponse} = require("../helpers");
//const {game_type, game_varient, game, game_history, leaderboard, user, tournaments, sequelize, registered_user,shop} = require("../../models");
const {Op, Sequelize} = require("sequelize");
const moment = require('moment');
const db = require("../../../helpers/db");
const { sequelize } = require("../../../models");
module.exports.all_games = async (req, res) => {
    try {
        const data = await game.findAll({});
        successResponse(req, res, data);
    } catch (error) {
        errorResponse(req, res, error.message);
    }
};
module.exports.active_types = async (req, res) => {
    try {
        const data = await db.ludo_game_type.findAll({
            where: {
                status: 1,
            },
        });
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
// winnign amount
module.exports.active_varients = async (req, res) => {
    try {
        // const playerType = req.query.player_type;
        // console.log("player_type",playerType);
        let data = await db.ludo_game_varient.findAll({
            where: {
                status: 1,
            },
            order: [
                [sequelize.cast(sequelize.col('value'), 'SIGNED'), 'ASC']
            ],
            raw:true
        });
        console.log(data);
        let gameData = await db.ludo_game.findAll();
        // Calculate winning amount and deduct commission percentage for each game variant
        let Data = data.map(varient => {
            let correspondingGame = gameData.find(game => game.varient_id === varient.id);
            if (correspondingGame) {
                let commissionPercentage = parseFloat(correspondingGame.comission);
                let winningAmount = parseFloat(varient.value) * 2 * (1 - commissionPercentage / 100);
                return {
                    id: varient.id,
                    name: varient.name,
                    value: varient.value,
                    status: varient.status,
                    playerType:varient.player_type,
                    createdAt: varient.createdAt,
                    updatedAt: varient.updatedAt,
                    winningAmount: winningAmount,
                };
            } else {
                return varient;
            }
        });
        // Send the enriched data in the response
        return successResponse(req, res, Data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.games = async (req, res) => {
    try {
        const {type, varient,player_type} = req.query;
        const data = await db.ludo_game.findAll({
            where: {
                type_id: type,
                varient_id: varient,
                player_type:player_type,
                isPrivate:0,
            },
            include: [
                {
                    model: db.ludo_game_varient,
                    as: db.ludo_game_varient.varient_id,
                    model: db.ludo_game_type,
                    as: db.ludo_game_type.type_id,
                },
            ],
        });
        if (data.length === 0) {
            return res.status(404).json({ message: 'Game data not found' });
        }
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.game_history = async (req, res) => {
    try {
        console.log(req.user.userId);
        const where = {...req.query, userId: req.user.userId};
        let data = await db.ludo_game_history.findAll({
            where,
            order: [
                ['id', 'DESC'],
            ],
            include: [{
                model: db.ludo_game,
                as: db.ludo_game.id,
                include: [{
                    model: db.ludo_game_varient,
                    as: db.ludo_game_varient.varient_id,
                    model: db.ludo_game_type,
                    as: db.ludo_game_type.type_id
                }]
            }]
        });
        console.log(data);
        if(data.length > 0){
            data.map((element) => {
                element.dataValues.betAmount = element.dataValues.fee
            })
        }
        data = await Promise.all(data)
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.leaderboard_daily = async (req, res) => {
    try {
        const where = {
            createdAt: {
                [Op.and]: {
                    [Op.gte]: moment().startOf('day').format(),
                    [Op.lte]: moment()
                        .endOf('day')
                        .format()
                }
            }

        };
        const data = await db.ludo_game_history.findAll({
            where,
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('tableId')), 'gamePlayed'],
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), 'Amount']
            ],
            include: [
                {
                    model: db.users,
                    attributes: ['username']
                }
            ],
            group: ['userId'],
            order: [
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), "DESC"],
            ],
            limit: 10
        })
        await db.ludo_leaderboard.destroy({
            where: { type: 'Daily' },
        })
        let arr = [];
        for (let i = 0; i < data.length; i++)
            arr.push({ rank: i + 1, type: 'Daily', name: data[i].dataValues.user.dataValues.username, amount: data[i].dataValues.Amount, gamePlayed: data[i].dataValues.gamePlayed })
        await db.ludo_leaderboard.bulkCreate(arr);
        const getData = await db.ludo_leaderboard.findAll({
            where: {type: "Daily"},
            order: [
                ['rank', 'ASC'],
            ],
            limit: 10
        })
        return successResponse(req, res, getData);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports.leaderboard_weekly = async (req, res) => {
    try {
        const where = {
            createdAt: {
                [Op.and]: {
                    [Op.gte]: moment().startOf('week').format(),
                    [Op.lte]: moment()
                        .endOf('week')
                        .format()
                }
            }

        };
        const data = await db.ludo_game_history.findAll({
            where,
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('tableId')), 'gamePlayed'],
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), 'Amount']
            ],
            include: [
                {
                    model: user,
                    attributes: ['username']
                }
            ],
            group: ['userId'],
            order: [
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), "DESC"],
            ],
            limit: 10
        })
        await db.ludo_leaderboard.destroy({
            where: { type: 'Weekly' },
        })
        let arr = [];
        for (let i = 0; i < data.length; i++)
            arr.push({ rank: i + 1, type: 'Weekly', name: data[i].dataValues.user.dataValues.username, amount: data[i].dataValues.Amount, gamePlayed: data[i].dataValues.gamePlayed })
        await db.ludo_leaderboard.bulkCreate(arr);
        const getData = await leaderboard.findAll({
            where: {type: "Weekly"},
            order: [
                ['rank', 'ASC'],
            ],
            limit: 10
        })
        return successResponse(req, res, getData);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports.leaderboard_monthly = async (req, res) => {
    try {
        const where = {
            createdAt: {
                [Op.and]: {
                    [Op.gte]: moment().startOf('month').format(),
                    [Op.lte]: moment()
                        .endOf('month')
                        .format()
                }
            }

        };
        const data = await db.ludo_game_history.findAll({
            where,
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('tableId')), 'gamePlayed'],
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), 'Amount']
            ],
            include: [
                {
                    model: user,
                    attributes: ['username']
                }
            ],
            group: ['userId'],
            order: [
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), "DESC"],
            ],
            limit: 10
        })
        await db.ludo_leaderboard.destroy({
            where: { type: 'Monthly' },
        })
        let arr = [];
        for (let i = 0; i < data.length; i++)
            arr.push({ rank: i + 1, type: 'Monthly', name: data[i].dataValues.user.dataValues.username, amount: data[i].dataValues.Amount, gamePlayed: data[i].dataValues.gamePlayed })
        await db.ludo_leaderboard.bulkCreate(arr);
        const getData = await leaderboard.findAll({
            where: {type: "Monthly"},
            order: [
                ['rank', 'ASC'],
            ],
            limit: 10
        })
        return successResponse(req, res, getData);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports.upcomming_Tournament = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await sequelize.query(`Select * from tournaments
   where tournaments.id NOT IN ( Select registered_user.tourneyId
    from tournaments join registered_user on tournaments.id = registered_user.tourneyId 
    where userId = ${userId} ) && tournaments.status = 0 
    order by scheduledDate desc`, {type: sequelize.QueryTypes.SELECT})
        res.send({
            code: 200,
            currentTime: moment().format(),
            data,
            success: true,
        });
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.finished_tournament = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await sequelize.query(`Select tournaments.id, gameTypeId, playerSize, winningAmount, entryFee, tournaments.status, winnerId, scheduledDate, title,playerType
  from tournaments join registered_user on tournaments.id = registered_user.tourneyId 
  where userId = ${userId} && tournaments.status = 2 order by scheduledDate desc`, {type: sequelize.QueryTypes.SELECT});
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}
module.exports.registered_tournament = async (req, res) => {
    try {
        let userId = req.params.userId;
        const data = await sequelize.query(`Select tournaments.id,registered_user.id as registrationId, gameTypeId, playerSize, winningAmount, entryFee, tournaments.status, winnerId, scheduledDate,title,playerType
    from tournaments join registered_user on tournaments.id = registered_user.tourneyId 
    where userId = ${userId} && tournaments.status!=2  order by scheduledDate desc`, {type: sequelize.QueryTypes.SELECT});
        res.send({
            code: 200,
            currentTime: moment().format(),
            data,
            success: true,
        });
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}
module.exports.update_userStatus = async (req, res) => {
    try {
        let {registrationId, status, tableId} = req.body;
        await registered_user.update({status, tableId}, {where: {id: registrationId}})
        successResponse(req, res, {message: 'updated'})
    } catch (error) {
        errorResponse(req, res, error.message)
    }
}


module.exports.leaderboard = async (req, res) => {
    try {
        let {type} = req.query;

        let typeD = 'day';
        if(type=='daily'){
            typeD = 'day'
        }else if(type=='weekly'){
            typeD = 'week'
        }else{
            typeD = 'month'
        }
        const where = {
            createdAt: {
                [Op.and]: {
                    [Op.gte]: moment().startOf(typeD).format(),
                    [Op.lte]: moment()
                        .endOf(typeD)
                        .format()
                }
            }

        };
        const data = await db.ludo_game_history.findAll({
            where,
            raw:true,
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('tableId')), 'gamePlayed'],
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), 'Amount'],
                'userId'
            ],
            group: ['userId'],
            order: [
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), "DESC"],
            ],
            limit: 10
        })
        await db.ludo_leaderboard.destroy({
            where: { type: type.charAt(0).toUpperCase() + type.slice(1) },
        })
        console.log(data);
        let arr = [];
        for (let i = 0; i < data.length; i++){
            let userD = await user.findOne({where:{id:data[i].userId}, raw:true})
            if(userD){
                arr.push({ rank: i + 1, type: type.charAt(0).toUpperCase() + type.slice(1), name: (userD) ? userD.username : '', amount: data[i].Amount, gamePlayed: data[i].gamePlayed })
            }

        }

        await db.ludo_leaderboard.bulkCreate(arr);

        const getData = await db.ludo_leaderboard.findAll({
            where: {type: type.charAt(0).toUpperCase() + type.slice(1)},
            order: [
                ['rank', 'ASC'],
            ],
            limit: 10
        })
        return successResponse(req, res, getData);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.getTournamentHistory = async (req, res) => {
    try {
        let userId = req.query.userId;
        const data = await sequelize.query(`Select tournaments.id,tournaments.title,gameTypeId, playerSize, winningAmount, entryFee,  winnerId, scheduledDate,title
    from tournaments join registered_user on tournaments.id = registered_user.tourneyId 
    where userId = ${userId} && tournaments.status=2  order by scheduledDate desc`, {type: sequelize.QueryTypes.SELECT});
        if(data.length > 0){

            for(let i=0;i<data.length;i++){
                let gameName = '';
                let gametype = await game_type.findOne({where:{id:data[i].gameTypeId}, raw:true});
                if(gametype){
                    gameName = gametype.name;
                }
                data[i].game_type = gameName;

                let winnerName = '';
                let userd = await user.findOne({where:{id:data[i].winnerId}, raw:true});
                if(userd){
                    winnerName = userd.name;
                }
                data[i].winner_name = winnerName;
            }
        }
        res.send({
            code: 200,
            data,
            success: true,
        });
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}
module.exports.createPrivateLudoGame = async (req, res) => {
    let responseData = {};
    try {

        let { varient_id,type_id,cap,isPrivate} = req.body;
     let game_json_data=req.body.game_json_data;
     console.log("game_json_data",game_json_data);
let code = Date.now() +"";
console.log("req.user.user_id-->",req.user.id);
        let data = {
            // id: game_type_id,
            name: game_json_data.Name,
            player_type:game_json_data.player_type,
            game_json_data: JSON.stringify(game_json_data),
            private_table_id:code,
            varient_id:varient_id,
            type_id:type_id,
            comission:game_json_data.commission,
            cap:cap,
            isPrivate:isPrivate, //isPrivate=1 for private table
            total_game_time:game_json_data.total_game_time,
            added_by: req.user.id,
        }
        // let save = await adminService.createGame(data);
        const newGame = await game.create(data);
        responseData.msg = 'Game Added Done';
        responseData.data = newGame;
        responseData.data.private_table_code = code;
        return successResponse(req, res, responseData);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getGameVarient = async (req, res) => {
    let responseData = {};
    try {
        
        let data = await game_varient.findAll({
            where: {
                status: 1
            }
        });
        if (data.length === 0) {
            responseData.msg = 'Game Variant not found';
            return errorResponse(req, res, responseData, 404);
        }
         // Fetch all games
         let gameData = await game.findAll();

            // Calculate winning amount for each game variant
            let enrichedData = data.map(varient => {
                // Find corresponding game for the variant
                let correspondingGame = gameData.find(game => game.varient_id === varient.id);
                if (correspondingGame) {
                    let commissionPercentage = parseFloat(correspondingGame.comission);
                    let winningAmount = parseFloat(varient.value) * 2 * (1 - commissionPercentage / 100);
                    return {
                        id: varient.id,
                        name: varient.name,
                        value: varient.value,
                        status: varient.status,
                        playerType: varient.player_type,
                        createdAt: varient.createdAt,
                        updatedAt: varient.updatedAt,
                        winningAmount: winningAmount,
                    };
                } else {
                    return varient;
                }
            });

     
        res.send({
            code: 200,
            enrichedData,
            success: true,
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports.getAllPrivateGames=async(req,res)=>{
    let responseData = {};
    try {
        
        let data = await game.findAll({
            where: {
                isPrivate: 1
            }
        });
        if (data.length === 0) {
            responseData.msg = 'Game varients not found';
            return errorResponse(req, res, responseData, 404);
        }
        res.send({
            code: 200,
            data,
            success: true,
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}


