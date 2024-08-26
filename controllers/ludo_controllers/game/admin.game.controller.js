const {successResponse, errorResponse} = require("../helpers");
// const {
//     game_type,
//     game_varient,
//     game,
//     game_history,
//     user,
//     sequelize,
//     tournaments,
//     bonus_setting,
//     redemption,
//     transaction,
//     user_kyc,
//     bank_account,
//     user_wallet,
//     tds_setting,
//     shop,
//     shop_goods,
//     shop_users,
//     users,
//     notifications,
//     avatar,
//     setting,
//     prize_structure,
//     reward,
//     admin_bank_Details,
//     withdrawls_fee
// } = require("../../../models");
const {sendPushNotification} = require('../../../utils/sendnotification');
const db = require("../../../helpers/db");
const moment = require('moment');
const getPagination = (page,limit) => {
    page = page - 1;
    const offset = page ? page * limit : 0;
    return {limit, offset};
};
const { sequelize } = require("../../../models");
const {Op, fn, col, where} = require("sequelize");
// const {withdrawPayout,payoutStatus} = require('../../../utils/payment');
// const shop_users = require("../../models/shop_users");
module.exports.create_gameType = async (req, res) => {
    try {
        const {name, status, icon, description} = req.body;
        const newType = await db.ludo_game_type.create({name, status, icon, description});
        return successResponse(req, res, {
            message: "New type created succefully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.allTypes = async (req, res) => {
    try {
        const data = await db.ludo_game_type.findAll({});

        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

// module.exports.create_gameVarient = async (req, res) => {
//     try {
//         const {name, value, status,commission,cap,} = req.body;
//         const newVarient = await game_varient.create({name, value, status});
//         return successResponse(req, res, {message: "new varient added"});
//     } catch (error) {
//         return errorResponse(req, res, error.message);
//     }
// };

module.exports.allVarients = async (req, res) => {
    try {
        const data = await db.ludo_game_varient.findAll({});
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
    
};

module.exports.Update_typeStatus = async (req, res) => {
    try {
        const typeId = req.params.id;
        let data = await db.ludo_game_type.update(
            {status: req.body.status},
            {
                where: {
                    id: typeId,
                },
            }
        );
        return successResponse(req, res, {message: "status updated"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.Update_varientStatus = async (req, res) => {
    try {
        const varientId = req.params.id;
        let data = await db.ludo_game_varient.update(
            {status: req.body.status},
            {
                where: {
                    id: varientId,
                },
            }
        );
        await db.ludo_game.update(
            { status: req.body.status },
            {
                where: { varient_id: varientId },
            }
        );

        return successResponse(req, res, {message: "status updated"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.create_game = async (req, res) => {
    try {
        const {cap, comission, varient_id, type_id, status} = req.body;
        const existingGame = await db.ludo_game.findOne({
            where: {
                type_id: type_id,
                varient_id: varient_id,
                isPrivate: 0
            }
        });
        if (existingGame) {
            return errorResponse(req, res, "Game already created with the same game type and varient");
        }
        let a = await db.ludo_game_type.findOne({
            attributes: ["name"],
            where: {
                id: type_id,
            },
        });

        let b = await db.ludo_game_varient.findOne({
            attributes: ["value","player_type"],
            where: {
                id: varient_id,
            },
        });
       
        let player_type=b.player_type;
       
        const name = `Game type is ${a.dataValues.name} and varient is ${b.dataValues.value}`;
        
        const newGame = await db.ludo_game.create({
            name: name,
            cap,
            comission,
            varient_id,
            type_id,
            status,
            player_type
        });
        return successResponse(req, res, {
            message: "New game is created successfully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.create_gameVarient = async (req, res) => {
    try {
        const { name, value, status, commission, cap,prize_id } = req.body;
          const existingVariant = await db.ludo_game_varient.findOne({
            where: { value: value }
        });

        if (existingVariant) {
            return res.status(400).json({ error: "A game variant with the same value already exists" });
        }

        const newVariant = await db.ludo_game_varient.create({ name, value, status });


        // Add games for each type_id (1, 2, 3)
        const typeIds = (await db.ludo_game_type.findAll({
            where: { status: 1 }
        })).map(gameType => gameType.id);
        
        console.log(typeIds);
        for (const typeId of typeIds) {
            // Fetch the variant_id from the newly created variant
            const variantId = newVariant.id;

            // Create games for player types 2 and 4 for each type_id
            await db.ludo_game.create({
                name:name,
                type_id: typeId,
                varient_id: variantId,
                comission: commission,
                cap:cap,
                player_type: 2,
                game_prize_id:0

            });

            await db.ludo_game.create({
                name:name,
                type_id: typeId,
                varient_id: variantId,
                comission: commission,
                cap:cap,
                player_type: 4,
                game_prize_id:prize_id
            });
        }

       
        return successResponse(req, res, { message: "New variant and corresponding games added" });
    } catch (error) {
        console.error("Error creating game variant and games:", error);
        return errorResponse(req, res, error.message);
    }
};


module.exports.gameVarientById = async (req, res) => {
    try {
        const gameVariantId = req.query.id;

        // Fetch the game variant by ID
        const gameVariant = await db.ludo_game_varient.findOne({
            where: { id: gameVariantId },
            attributes: ['id', 'name', 'value', 'status']
        });

        if (!gameVariant) {
            return res.status(404).json({ code: 404, success: false, error: "Game variant not found" });
        }

        // Fetch one of the related games to get commission, cap, and game_prize_id
        const relatedGame = await db.ludo_game.findOne({
            where: { varient_id: gameVariantId,player_type:4 },
            attributes: ['comission', 'cap', 'game_prize_id','player_type']
        });
        // console.log( relatedGame.game_prize_id );

        // Initialize prize structure data
        let prizeStructureData = {
            prize_id: null,
            prize_structure_name: null,
            prize_structure_json_data: null
        };

        // Fetch prize structure data if game_prize_id is present
        if (relatedGame && relatedGame.game_prize_id) {
            const prizeStructure = await db.ludo_prize_structure.findOne({
                where: { prize_id: relatedGame.game_prize_id },
                attributes: ['prize_id', 'prize_structure_name', 'prize_structure_json_data']
            });
            // console.log("prizeStructure",prizeStructure);

            if (prizeStructure) {
                prizeStructureData = {
                    prize_id: prizeStructure.prize_id,
                    prize_structure_name: prizeStructure.prize_structure_name,
                    prize_structure_json_data: prizeStructure.prize_structure_json_data
                };
            }
        }

        // Structure the response data
        const responseData = {
            id: gameVariant.id,
            name: gameVariant.name,
            value: gameVariant.value,
            status: gameVariant.status,
            comission: relatedGame ? relatedGame.comission : null,
            cap: relatedGame ? relatedGame.cap : null,
            prize_id: relatedGame ? relatedGame.game_prize_id : null,
            prize_structure_name: prizeStructureData.prize_structure_name,
            prize_structure_json_data: prizeStructureData.prize_structure_json_data
        };

        return res.status(200).json({
            code: 200,
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error("Error fetching game variant by ID:", error);
        return res.status(500).json({
            code: 500,
            success: false,
            message: `Error fetching game variant by ID: ${error.message}`
        });
    }
};



module.exports.update_gameVarient = async (req, res) => {
    try {
        const { id, name, value, status, commission, cap,prize_id } = req.body;

        // Find the existing variant by ID
        const existingVariant = await db.ludo_game_varient.findOne({
            where: { id: id }
        });

        if (!existingVariant) {
            return res.status(404).json({ error: "Game variant not found" });
        }

        // Check if another variant with the same value exists
        const variantWithSameValue = await db.ludo_game_varient.findOne({
            where: { value: value, id: { [Op.ne]: id } }
        });

        if (variantWithSameValue) {
            return res.status(400).json({ error: "Another game variant with the same value already exists" });
        }

        // Update the variant details
        await existingVariant.update({ name, value, status, commission, cap });

        // Update the associated games
        const typeIds = [1, 2, 3];
        for (const typeId of typeIds) {
            // Update games for player types 2 and 4 for each type_id
            await db.ludo_game.update(
                { comission: commission, cap: cap, name: name,game_prize_id:0 },
                { where: { varient_id: id, type_id: typeId, player_type: 2 } }
            );
    
            await db.ludo_game.update(
                { comission: commission, cap: cap, name: name ,game_prize_id:prize_id},
                { where: { varient_id: id, type_id: typeId, player_type: 4 } }
            );
        }

        return successResponse(req, res, { message: "Game variant and corresponding games updated successfully" });
    } catch (error) {
        console.error("Error updating game variant and games:", error);
        return errorResponse(req, res, error.message);
    }
};

module.exports.delete_gameVarient = async (req, res) => {
    try {
        const { id } = req.body;

        const existingVariant = await db.ludo_game_varient.findOne({
            where: { id: id }
        });

        if (!existingVariant) {
            return res.status(404).json({ error: "Game variant not found" });
        }

        await db.ludo_game.destroy({
            where: { varient_id: id }
        });


        await db.ludo_game_varient.destroy({
            where: { id: id }
        });

        return successResponse(req, res, { message: "Game variant and corresponding games deleted successfully" });
    } catch (error) {
        console.error("Error deleting game variant and games:", error);
        return errorResponse(req, res, error.message);
    }
};


module.exports.all_games = async (req, res) => {
    try {
        const data = await db.ludo_game.findAll({
            where: {
                isPrivate: 0
            }
        });
        successResponse(req, res, data);
    } catch (error) {
        errorResponse(req, res, error.message);
    }
};

module.exports.gamesById = async (req, res) => {
    try {
        const data = await db.ludo_game.findOne({where: {id: req.query.id}});
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.active_types = async (req, res) => {
    try {
        const data = await db.ludo_game_type.findAll({
            attributes: ["id", "name"],
            where: {
                status: 1,
            },
        });
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.active_varients = async (req, res) => {
    try {
        const data = await db.ludo_game_varient.findAll({
            attributes: ["id", "value"],
            where: {
                status: 1,
            },
            order: [
                ['value', 'ASC'] 
            ]
        });
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.update_gamestatus = async (req, res) => {
    try {
        const gameId = req.params.id;
        let data = await db.ludo_game.update(
            {status: req.body.status},
            {
                where: {
                    id: gameId,
                },
            }
        );

        return successResponse(req, res, {message: "status updated"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.update_game = async (req, res) => {
    try {
        const gameId = req.params.id;
        let data = await db.ludo_game.update(
            {
                comission: req.body.commission,
                name: req.body.name
            }, {
                where: {
                    id: gameId
                }
            }
        )
        return successResponse(req, res, {message: "successfully updated"});

    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports.admin_game_history = async (req, res) => {
    try {
        const {page, search_key, from_date, end_date,user_id,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let query = `users.isAdmin=0`;
        // if (game_type) {
        //   console.log('d');
        //   query += `game_category = '${game_type}'`;
        // } 
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');         
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(ludo_game_history.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            //let gameType = await adminService.getGameTypeByQuery({name:search_key});
            //let gameType = await sequelize.query(`Select *  from game_types where name like '%${search_key}%'`, {type: sequelize.QueryTypes.SELECT});
            // if(gameType.length > 0){
            //   query += ` AND game_histories.game_type like '%${gameType[0].game_type_id}%'`;
            // }else{
            query += ` AND (users.username like '%${search_key}%' OR users.email like '%${search_key}%' OR users.name like '%${search_key}%' OR ludo_game_history.tableId like '%${search_key}%')`;
            //}

        }
        if(user_id){
            query += ` AND ludo_game_history.userId='${user_id}'`;
        }
        query += ` order by ludo_game_history.id DESC`;
        let response = await sequelize.query(`Select gameId as Game_Id , tableId as Table_Id, varient_id ,type_id , status, ludo_game_history.commission as comission , isWin as Is_Win ,winAmount as Winning_Amount, ludo_game_history.createdAt as Created_At , username as User_Name ,Score
     from ludo_game_history join ludo_games on ludo_game.id = ludo_game_history.gameId join users on ludo_game_history.userId = users.id where ${query} LIMIT ${offset}, ${limit} `, {type: sequelize.QueryTypes.SELECT});

        let responseTotalCount = await sequelize.query(`Select gameId as Game_Id , tableId as Table_Id, varient_id ,type_id , status, ludo_game_history.commission as comission , isWin as Is_Win ,winAmount as Winning_Amount, ludo_game_history.createdAt as Created_At , username as User_Name ,Score
        from ludo_game_history join ludo_games on ludo_game.id = ludo_game_history.gameId join users on ludo_game_history.userId = users.id where ${query}`, {type: sequelize.QueryTypes.SELECT});
        for(let i=0; i < response.length; i++){
            let allPlayers = await db.ludo_game_history.findAll({where:{tableId:response[i].Table_Id}, raw:true})
            let playerArray = [];
            for(let k=0; k< allPlayers.length; k++){
                let userD = await db.users.findOne({where:{id:allPlayers[k].userId},raw:true});
                if(userD){
                    let playerD = {
                        playerName: userD.username,
                        win_loss: (allPlayers[k].isWin==1) ? 'Win' : 'Loss'
                    }
                    playerArray.push(playerD);
                }
             

                
            }
            response[i].players = playerArray;
        }
        const result = {
            count: responseTotalCount.length,
            data: response
        }
        return successResponse(req, res, result);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.create_tournament = async (req, res) => {
    try {

        const {gameTypeId, playerSize, winningAmount, entryFee, scheduledDate, title, playerType} = req.body;
        const startTimestamp = new Date().getTime(); //your starting time
        const timeExtent = 5 * 60 * 1000

        const endTime = new Date(startTimestamp + timeExtent)
        let times = Math.floor(endTime / 1000);
        console.log(times);


        var now = new Date(scheduledDate).getTime()
        let time = Math.floor(now / 1000);
        console.log(time);
        if (time <= times) {
            return errorResponse(req, res, {message: 'Please choose tournament time after 5 mins of current time...'});
        }
        //return false;
        await tournaments.create({gameTypeId, playerSize, winningAmount, entryFee, scheduledDate, title, playerType})
        return successResponse(req, res, {
            message: "New tournament is created succefully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.tournaments = async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 10;
        const data = await tournaments.findAndCountAll(
            {
                attributes: ['id', 'title', ['gameTypeId', 'Game_Type_Id'], ['playerSize', 'Player_Size'], ['winningAmount', 'Winning_Amount'], ['EntryFee', 'Entry_Fee'], 'status', ['winnerId', 'Winner_Id'], ['scheduledDate', 'Scheduled_Date'], ['playerType', 'Player_Type'], ['createdAt', 'Created_AT'], ['updatedAt', 'Updated_At']],
                order: [
                    ['Id', 'DESC'],
                ],
                offset: (page - 1) * limit,
                limit,
            }
        );
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.tournamentsById = async (req, res) => {
    try {
        const data = await tournaments.findOne({where: {id: req.query.id}});
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.cancel_tournament = async (req, res) => {
    try {
        const {tourneyId, status} = req.body;
        await tournaments.update({status}, {where: {id: tourneyId}});
        return successResponse(req, res, {message: "updated successfully"})
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
module.exports.updateDate_tournament = async (req, res) => {
    try {
        const {tourneyId, gameTypeId, playerSize, winningAmount, entryFee, scheduledDate, title, playerType} = req.body;
        const startTimestamp = new Date().getTime(); //your starting time
        const timeExtent = 5 * 60 * 1000

        const endTime = new Date(startTimestamp + timeExtent)
        let times = Math.floor(endTime / 1000);
        console.log(times);


        var now = new Date(scheduledDate).getTime()
        let time = Math.floor(now / 1000);
        console.log(time);
        if (time <= times) {
            return errorResponse(req, res, {message: 'Please choose tournament time after 5 mins of current time...'});
        }
        await tournaments.update({
            gameTypeId,
            playerSize,
            winningAmount,
            entryFee,
            scheduledDate,
            title,
            playerType
        }, {where: {id: tourneyId}});
        return successResponse(req, res, {message: "updated successfully"})
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.bonusUpdate = async (req, res) => {
    try {
        const {welcome_bonus, referral_bonus, registration_bonus, deposit_bonus, bet_bonus_amount} = req.body;
        let bonus = {welcome_bonus, referral_bonus, registration_bonus, deposit_bonus, bet_bonus_amount};
        const checkBonus = await bonus_setting.findOne();
        if (!checkBonus) {
            bonus.added_by = req.user.userId
            await bonus_setting.create(bonus);
        } else {
            bonus.updated_by = req.user.userId
            await bonus_setting.update(bonus, {where: {id: checkBonus.id}});
        }

        return successResponse(req, res, {message: "updated successfully"})
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}


module.exports.getBonusData = async (req, res) => {
    try {
        const data = await bonus_setting.findOne();
        successResponse(req, res, data);
    } catch (error) {
        errorResponse(req, res, error.message);
    }
}

module.exports.getWithdrawHistory = async (req, res) => {
    try {
        const {page, search_key, from_date, end_date,user_id,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let query = `users.isAdmin=0`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(redemptions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.email like '%${search_key}%' OR users.name like '%${search_key}%' OR game_history.tableId like '%${search_key}%')`;
        }
        if(user_id){
            query += ` AND redemptions.userId='${user_id}'`;
        }
        query += ` order by redemptions.id DESC`;
        let response = await sequelize.query(`Select redemptions.*, users.username,users.mobile from redemptions join users on redemptions.userId = users.id where ${query} LIMIT ${offset}, ${limit} `, {type: sequelize.QueryTypes.SELECT});

        let responseTotalCount = await sequelize.query(`Select redemptions.*  from redemptions join users on redemptions.userId = users.id where ${query}`, {type: sequelize.QueryTypes.SELECT});

        return res.send({
            code:200,
            success: true,
            count: responseTotalCount.length,
            data:response,
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

// module.exports.acceptWithdrawRequest = async (req, res) => {
//     try {
//         let {id, status} = req.body;
//         let result = await redemption.findOne({where: {id: id},raw:true});
//     //    console.log(result);
//         if (result) {
//             if(status == 'Withdraw'){
               
//                 let withdrawAmt = parseFloat(result.amount)

//                 // let userWallet = await user_wallet.findOne({where: {userId: result.userId}});
//                 // let winningBalance = parseFloat(userWallet.winningBalance);
//                 // let mainBalance = parseFloat(userWallet.mainBalance);
//                 // let totalBalance = winningBalance + mainBalance;
//                 // if (withdrawAmt > totalBalance) {
//                 //     return errorResponse(req, res, {message: 'Insufficient balance'});
//                 // }
            
                
//                 if (winningBalance >= withdrawAmt) {
//                     winningBalance -= withdrawAmt;
//                 } else {
//                     let remainingAmt = withdrawAmt - winningBalance;
//                     winningBalance = 0;
//                     mainBalance -= remainingAmt;
//                 }

//                 await user_wallet.update(
//                     {winningBalance: winningBalance, mainBalance: mainBalance},
//                     {where: {userId: result.userId}}
//                 );
//                 status = 'Withdraw';
//             }
           
//             let reqJson = {status: status}
//             await redemption.update(reqJson, {where: {id: result.id}});
//             return successResponse(req, res, 'Redeem request has been ' + status);
//         }
//         return errorResponse(req, res, {message: 'Not found Redeem Request'});
//     } catch (error) {
//         return errorResponse(req, res, error.message)
//     }
// }

module.exports.acceptWithdrawRequest = async (req, res) => {
    try {
        let { id, status } = req.body;
        let result = await redemption.findOne({ where: { id: id }, raw: true });

        if (result) {
            let userWallet = await user_wallet.findOne({ where: { userId: result.userId } });
            let winningBalance = parseFloat(userWallet.winningBalance);
            let mainBalance = parseFloat(userWallet.mainBalance);

            let winningBalanceDeduct = parseFloat(result.winningBalanceDeduct);
            let mainBalanceDeduct = parseFloat(result.mainBalanceDeduct);

            if (status === 'Withdraw') {
                // If admin accepts the request
                await redemption.update(
                    {
                        status: 'Withdraw',
                        winningBalanceDeduct: '0',
                        mainBalanceDeduct: '0'
                    },
                    { where: { id: result.id } }
                );
            } else if (status === 'Cancelled') {
                // If admin cancels the request, return the amounts to the user's wallet
                winningBalance += winningBalanceDeduct;
                mainBalance += mainBalanceDeduct;

                await user_wallet.update(
                    { winningBalance: winningBalance, mainBalance: mainBalance },
                    { where: { userId: result.userId } }
                );

                await redemption.update(
                    {
                        status: 'Cancelled',
                        winningBalanceDeduct: '0',
                        mainBalanceDeduct: '0'
                    },
                    { where: { id: result.id } }
                );
            } else {
                return errorResponse(req, res, { message: 'Invalid status' });
            }

            return successResponse(req, res, 'Redeem request has been ' + status);
        }
        return errorResponse(req, res, { message: 'Not found Redeem Request' });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
       



module.exports.getTransactions = async (req, res) => {
    try {
        const {page, search_key, from_date, end_date,user_id,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let query = `users.isAdmin=0`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(transaction.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.email like '%${search_key}%' OR users.name like '%${search_key}%' OR game_history.tableId like '%${search_key}%')`;
        }
        if(user_id){
            query += ` AND transaction.userId='${user_id}'`;
        }
        query += ` order by transaction.id DESC`;
        let response = await sequelize.query(`Select transaction.*, users.username,users.mobile from transaction join users on transaction.userId = users.id where ${query} LIMIT ${offset}, ${limit} `, {type: sequelize.QueryTypes.SELECT});

        let responseTotalCount = await sequelize.query(`Select transaction.*  from transaction join users on transaction.userId = users.id where ${query}`, {type: sequelize.QueryTypes.SELECT});

        return res.send({
            code:200,
            success: true,
            count: responseTotalCount.length,
            data:response,
        });

    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getKycdetails = async (req, res) => {
    try {
        let result = await user_kyc.findOne({where: {userId: req.params.user_id}});
        if (result) {
            return successResponse(req, res, result);
        }
        return successResponse(req, res, 'Not found kyc details');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.updateStatusKycDetails = async (req, res) => {
    try {
        let {status, user_id} = req.query;
        let statusS;
        if(status==1){
            statusS = 'Yes';
        }else{
            statusS = 'No';
        }
        let result = await user_kyc.findOne({where: {userId: user_id}});
        if (result) {
            await user_kyc.update({status:status},{where: {userId: user_id}});
            await user.update({kyc:statusS},{where: {id: user_id}});
            return successResponse(req, res, 'Status changed done');
        }
        return successResponse(req, res, 'Not found kyc details');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getBankdetails = async (req, res) => {
    try {
        let result = await bank_account.findOne({where: {userId: req.params.user_id}});
        if (result) {
            return successResponse(req, res, result);
        }
        return successResponse(req, res, 'Not bank details');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.pendingWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        let query = {status: {[Op.or]: ['Pending','Processing']}};
        let getUserData = await redemption.findAll({where: query});
        if (getUserData.length == 0) {
            return successResponse(req, res, {message: 'Data not found'})
        }
        getUserData = getUserData.map(async (element, i) => {
            console.log(element.userId);
            let getUserD = await user.findOne({where: {id: element.userId}});
            element.dataValues.userId = (getUserD && getUserD.username != null) ? getUserD.username : '';
            return element;
        })
        getUserData = await Promise.all(getUserData);
        return successResponse(req, res, getUserData);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.todayWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        let date = new Date().toISOString().split('T')[0]
        let query = {status: 'Withdraw'};
        let getUserData = await redemption.findAll({where: query});
        if (getUserData.length == 0) {
            return successResponse(req, res, {message: 'Data not found'})
        }
        getUserData = getUserData.map(async (element, i) => {
            console.log(element.userId);
            let getUserD = await user.findOne({where: {id: element.userId}});
            element.dataValues.userId = (getUserD && getUserD.username != null) ? getUserD.username : '';
            return element;
        })
        getUserData = await Promise.all(getUserData);
        return successResponse(req, res, getUserData);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.todayDeposit = async (req, res) => {
    let responseData = {};
    try {
        const {page, search_key, from_date, end_date,user_id,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let query = `users.isAdmin=0`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(transaction.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.email like '%${search_key}%' OR users.name like '%${search_key}%' OR game_history.tableId like '%${search_key}%')`;
        }

        query += ` AND transaction.reference='Deposit' AND transaction.type='DEPOSIT' AND payment_status='SUCCESS' order by transaction.id DESC`;
        let response = await sequelize.query(`Select transaction.*, users.username,users.mobile from transaction join users on transaction.userId = users.id where ${query} LIMIT ${offset}, ${limit} `, {type: sequelize.QueryTypes.SELECT});

        let responseTotalCount = await sequelize.query(`Select transaction.*  from transaction join users on transaction.userId = users.id where ${query}`, {type: sequelize.QueryTypes.SELECT});
      
        




        // let date = new Date().toISOString().split('T')[0]
        // let query = {reference: 'Deposit',payment_status:'SUCCESS'};
        // let getUserData = await transaction.findAll({where: query});
        if (responseTotalCount == 0) {
            return successResponse(req, res, {message: 'Data not found'})
        }

        return res.send({
            code:200,
            success: true,
            count: responseTotalCount.length,
            data:response,
        });

    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getTournamentHistory = async (req, res) => {
    let responseData = {};
    try {
        const {game_type, page, search_key, from_date, end_date,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let query = 'status = 2';
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(scheduledDate) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            //let gameType = await adminService.getGameTypeByQuery({name:search_key});
            let gameType = await sequelize.query(`Select *  from game_type where name like '%${search_key}%'`, {type: sequelize.QueryTypes.SELECT});
            if (gameType.length > 0) {
                query += ` AND gameTypeId like '%${gameType[0].game_type_id}%'`;
            } else {
                query += ` AND title like '%${search_key}%'`;
            }

        }
        query += ` order by updatedAt DESC`;
        let response = await sequelize.query(`Select *  from tournaments where ${query} LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select *  from tournaments where ${query}`, {type: sequelize.QueryTypes.SELECT});

        if (responseTotalCount.length == 0) {
          return errorResponse(req, res, {message:'Tournament history not found'})
        }
        response = response.map(async (element) => {
            let getUserDetail = await user.findOne({where:{id: element.winnerId},raw: true})
            let getParticipantLists = await sequelize.query(`Select users.username  from registered_user join users on registered_user.userId = users.id where tourneyId='${element.id}'`, {type: sequelize.QueryTypes.SELECT});
            element.username = (getUserDetail) ? getUserDetail.username : '';
            element.participants = getParticipantLists;
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Game history Data',
            statusCode: 200,
            status: true,
            count: responseTotalCount.length,
            data: response
        });
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}


module.exports.create_shop = async (req, res) => {
    try {
        const { shop_name } = req.body;
        const existingShop = await db.ludo_shop.findOne({ where: { shopName: shop_name } });
        if (existingShop) {
            return res.status(400).json({ error: "Shop with the same name already exists" });
        }  
        if (!req.file) {
            return errorResponse(req, res, "file is required");
        }
        console.log(req.file.location); 

        const newShop = await db.ludo_shop.create({ shopName: shop_name, added_by: req.user.id, url:req.file.location});


        return res.status(200).json({ message: "New shop created successfully", shop: newShop });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports.get_shop_by_id = async (req, res) => {
    try {
        const { id } = req.query; 
        const foundShop = await db.ludo_shop.findByPk(id); 

        if (!foundShop) {
            return res.status(404).json({ error: "Shop not found" });
        }

        return res.status(200).json({ shop: foundShop });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports.update_shop = async (req, res) => {
    try {
        const { id, shop_name } = req.body; // Assuming you receive the shop ID and updated shop name
        const existingShop = await db.ludo_shop.findByPk(id); // Assuming shop model has primaryKey 'id'
        if (!existingShop) {
            return res.status(404).json({ error: "Shop not found" });
        }  

        // Check if the updated shop name conflicts with existing shops
        if (shop_name !== existingShop.shopName) {
            const shopWithNameExists = await db.ludo_shop.findOne({ where: { shopName: shop_name } });
            if (shopWithNameExists) {
                return res.status(400).json({ error: "Shop with the same name already exists" });
            }
        }

        // Check if a file is uploaded
        // if (!req.file) {
        //     // If no file is uploaded, only update the shop name
        //     existingShop.shopName = shop_name;
        //     await existingShop.save();
        //     return res.status(200).json({ message: "Shop name updated successfully", shop: existingShop });
        // }

        // If a file is uploaded, update both shop name and URL
        existingShop.shopName = shop_name;
        existingShop.url = req.file.location; // Assuming you're using a file upload middleware that adds 'file' property to the request object
        await existingShop.save();

        return res.status(200).json({ message: "Shop updated successfully", shop: existingShop });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports.delete_shop_by_id = async (req, res) => {
    try {
        const { id } = req.query;
        const foundShop = await db.ludo_shop.findByPk(id);
        if (!foundShop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        const foundGoods = await db.ludo_shop_goods.findAll({ where: { category: foundShop.id } });
        if (foundGoods.length > 0) {
            await Promise.all(foundGoods.map(async (good) => {
                await good.destroy();
            }));
        }
        await foundShop.destroy();
        return res.status(200).json({ message: "Shop and associated goods deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports.change_shop_status = async (req, res) => {
    try {
        const { id, status } = req.body;
        const foundShop = await db.ludo_shop.findByPk(id);
        if (!foundShop) {
            return res.status(404).json({ error: "Shop not found" });
        }
        foundShop.status = status;
        await foundShop.save();
        return res.status(200).json({ message: "Shop status updated successfully", shop: foundShop });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports.goods=async(req,res)=>{
    try {
        const { category, goods_title, price } = req.body;
        const existingGoods = await db.ludo_shop_goods.findOne({ where: { goods_title } });
        if (existingGoods) {
            return res.status(400).json({ error: "Goods with the same title already exists" });
        }

        if (!req.file) {
            return errorResponse(req, res, "file is required");
        }
        const newGoods = await db.ludo_shop_goods.create({
            category,
            goods_title,
            price,
            url:req.file.location
        });

        return res.status(201).json({ message: "New goods added successfully", goods: newGoods });
    }catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
module.exports.get_all_goods = async (req, res) => {
    try {
        // Assuming 'shop_goods' is your Sequelize model for goods
        const foundGoods = await db.ludo_shop_goods.findAll();

        if (foundGoods.length === 0) {
            return res.status(404).json({ error: "Goods not found" });
        }
        
        return res.status(200).json({ goods: foundGoods });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports.get_goods_by_id = async (req, res) => {
    try {
        const { id } = req.query;
        const foundGoods = await db.ludo_shop_goods.findByPk(id);

        if (!foundGoods) {
            return res.status(404).json({ error: "Goods not found" });
        }
        return res.status(200).json({ goods: foundGoods });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports.update_goods = async (req, res) => {
    try {
        const { id, category, goods_title, price } = req.body;
        const existingGoods = await db.ludo_shop_goods.findByPk(id);
        
        if (!existingGoods) {
            return res.status(404).json({ error: "Goods not found" });
        }

        // Check if the updated goods title conflicts with existing goods
        if (goods_title !== existingGoods.goods_title) {
            const goodsWithTitleExists = await db.ludo_shop_goods.findOne({ where: { goods_title } });
            if (goodsWithTitleExists) {
                return res.status(400).json({ error: "Goods with the same title already exists" });
            }
        }

        // Update goods data
        existingGoods.category = category;
        existingGoods.goods_title = goods_title;
        existingGoods.price = price;

        // Update URL if file is uploaded
        if (req.file) {
            existingGoods.url = req.file.location;
        }

        await existingGoods.save();

        return res.status(200).json({ message: "Goods updated successfully", goods: existingGoods });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
module.exports.delete_goods_by_id = async (req, res) => {
    try {
        const { id } = req.query;
        const foundGood = await db.ludo_shop_goods.findByPk(id);
        if (!foundGood) {
            return res.status(404).json({ error: "goods not found" });
        }
        await foundGood.destroy();
        return res.status(200).json({ message: "Goods deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports.sendNotification = async (req, res) => {
    let responseData = {};
    try {
        let reqData = req.body;
        // console.log(reqData);

        // Check if reqData has the necessary fields
        if (!reqData || !reqData.user_id || !reqData.title || !reqData.message) {
            responseData.msg = 'Invalid request data';
            return res.status(400).json(responseData);
        }

        let userId = reqData.user_id.split(',');
        for (let i = 0; i < userId.length; i++) {
            let userIDS = userId[i].trim();
            console.log(`Processing user ID: ${userIDS}`);

            let checkUser = await user.findOne({ where: {id:userIDS } });
            console.log(`User details: ${checkUser}`);
            // console.log(checkUser);

            if (!checkUser) {
                responseData.msg = `User with ID ${userIDS} not found`;
                return res.status(404).json(responseData);
            }

            let data = {
                sender_user_id: req.user.id,
                receiver_user_id: userIDS,
                title: reqData.title,
                message: reqData.message
            };
            // console.log(data);

            await notifications.create(data);

            if (checkUser.device_token) {
                let pushData = {
                    title: reqData.title,
                    message: reqData.message,
                    device_token: checkUser.device_token
                };
                console.log("pushdata",pushData);
                let result = await sendPushNotification(pushData);
                console.log("result",result);
                console.log(`Push notification result for user ID ${userIDS}: ${result}`);
            }
        }

        responseData.msg = 'Notification sent successfully!!!';
        responseData.data = {};
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(`Error sending notification: ${error.message}`);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};

module.exports.add_avatar=async(req,res)=>{
    let responseData = {};
    try {
        if (!req.file) {
            return errorResponse(req, res, "file is required");
        }
        const existingAvatar = await db.avatar.findOne({ where: { url: req.file.location } });
        if (existingAvatar) {
            return res.status(400).json({ error: "This URL has already been added." });
        }
        const newAvatar = await db.avatar.create({
           url:req.file.location,
        });
     responseData.msg="New avatar added successfully";
     responseData.data=newAvatar;
     return res.status(200).json(responseData);
        
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
}
module.exports.get_all_avatars = async (req, res) => {
    let responseData = {};
    try {
        const avatars = await db.avatar.findAll();
        return res.status(200).json({ avatars: avatars });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};



module.exports.delete_avatar = async (req, res) => {
   
    try {
        const {id} = req.query;
        
        // Check if the avatar exists in the database
        const existingAvatar = await db.avatar.findByPk(id);
        if (!existingAvatar) {
            return res.status(404).json({ error: "Avatar not found" });
        }

        // Delete the avatar
        await existingAvatar.destroy();

        return res.status(200).json({ message: "Avatar deleted successfully" });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports.add_web_url = async (req, res) => {
    try {
        const { name, web_url, is_payment_url } = req.body;

        // Check if the URL already exists
        const existingUrl = await setting.findOne({ where: { url: web_url } });
        if (existingUrl) {
            return res.status(400).json({ message: "URL already exists" });
        }

        // Add the new URL
        const data = await setting.create({ name: name, url: web_url, is_payment_url: is_payment_url });
        return res.status(200).json({ message: "URL added successfully" });

    } catch (error) {
        console.error(`Error adding URL: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};

module.exports.get_web_url=async(req,res)=>{
    try {
        
        const web_url=await setting.findAll();
        if(!web_url){
            return res.status(404).json({ message: "Url not found" });
        }
       
        return res.status(200).json({ data: web_url });
        
    } catch (error) {
        return res.status(500).json({error:error.message})
    }
}
module.exports.get_web_url_by_id=async(req,res)=>{
    try {
        const id=req.params.id;
        const web_url=await setting.findOne({where:{id:id}});
        if(!web_url){
            return res.status(404).json({ message: "Url not found" });
        }
       
        return res.status(200).json({ data: web_url });
        
    } catch (error) {
        return res.status(500).json({error:error.message})
    }
}
module.exports.update_web_url = async (req, res) => {
    try {
        const { id, new_web_url } = req.body;
        
        // const existing_new_url = await setting.findOne({ where: { url: new_web_url } });
        // console.log(existing_new_url);
        // if (existing_new_url) {
        //     return res.status(400).json({ msg: "New web URL already added" });
        // }
        const web_url_to_update = await setting.findOne({ where: { id: id } });
        if (!web_url_to_update) {
            return res.status(404).json({ message: "Web URL not found" });
        }
        
        web_url_to_update.url = new_web_url;
        await web_url_to_update.save();

        return res.status(200).json({ message: "URL updated successfully" });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


module.exports.addPrizeStructure = async (req, res) => {
    let responseData = {};
    try {
        console.log(req.user);
        const { name, prize_structure_json_data } = req.body;

        // Validate input data
        if (!name || !prize_structure_json_data) {
            responseData.msg = 'Name and prize structure data are required';
            return res.status(400).json(responseData);
        }

        const data = {
            prize_structure_name: name,
            prize_structure_json_data: JSON.stringify(prize_structure_json_data),
            added_by: req.user.id
        };

        const save = await db.ludo_prize_structure.create(data);
        responseData.msg = 'Added Done';
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};
module.exports.prizeStructureList = async (req, res) => {
    let responseData = {};
    try {
        let getData = await db.ludo_prize_structure.findAll();
        if (!getData) {
            responseData.msg = 'Prize List not found';
            return res.status(400).json(responseData);
        }
        getData = getData.map(async (element, i) => {
            element.dataValues.prize_structure_json_data = JSON.parse(element.prize_structure_json_data, true);
            return element;
        })
        getData = await Promise.all(getData);
        responseData.msg = 'Price List';
        responseData.data = getData;
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
}
module.exports.prizeStructureById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let getData = await db.ludo_prize_structure.findOne({where:{prize_id: id}});
        if (!getData) {
            responseData.msg = 'Price Data not found';
            return res.status(400).json(responseData);
        }
        getData.prize_structure_json_data = JSON.parse(getData.prize_structure_json_data, true),
            responseData.msg = 'Price Detail';
        responseData.data = getData;
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
}
module.exports.updatePrizeStructureById = async (req, res) => {
    let responseData = {};
    try {
        const { id, prize_structure_json_data, name } = req.body;
        const updated_by = req.user.id; // Assuming `req.user.admin_id` is available and valid

        // Validate input data
        if (!id || !prize_structure_json_data || !name) {
            responseData.msg = 'ID, name, and prize structure data are required';
            return res.status(400).json(responseData);
        }

        // Find the existing price structure by ID
        let getData = await db.ludo_prize_structure.findOne({ where: { prize_id: id } });
        if (!getData) {
            responseData.msg = 'Prize Data not found';
            return res.status(400).json(responseData);
        }

        // Prepare the update data
        const data = {
            prize_structure_name: name,
            prize_structure_json_data: JSON.stringify(prize_structure_json_data),
            updated_by: updated_by
        };

        // Update the price structure
        await prize_structure.update(data, { where: { prize_id: id } });

        responseData.msg = 'Prize Updated Successfully';
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};
module.exports.deletePrizeStructure = async (req, res) => {
    let responseData = {};
    try {
        const { id } = req.query;

        if (!id) {
            responseData.msg = 'ID is required';
            return res.status(400).json(responseData);
        }

        let associatedGame = await db.ludo_game.findOne({ where: { game_prize_id: id } });
        if (associatedGame) {
            responseData.msg = 'This prize is added in a game';
            return res.status(400).json(responseData);
        }

        // Delete the price structure
        await prize_structure.destroy({ where: { prize_id: id } });

        responseData.msg = 'Price deleted successfully';
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(error);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};

module.exports.create_reward = async (req, res) => {
    let responseData = {};
    try {
      const { rewardName, rewardCoins, day } = req.body;
  
      // Validate the input
      if (!rewardName || !rewardCoins || !day) {
        responseData.msg = "All fields are required";
        return res.status(400).json(responseData);
      }
     // Check if a reward with the same name or day already exists
     const existingReward = await reward.findOne({
        where: {
          [Op.or]: [
            { rewardName: rewardName },
            { day: day }
          ]
        }
      });
  
      if (existingReward) {
        responseData.msg = "A reward with the same name or day already exists";
        return res.status(400).json(responseData);
      }
  
      // Create a new reward
      const newReward = await reward.create({
        rewardName: rewardName,
        reward: rewardCoins,
        day: day,
        added_by: req.user.id,
      });
  
      responseData.msg = "Reward created successfully";
      responseData.data = newReward;
      return res.status(200).json(responseData);
    } catch (error) {
      responseData.msg = error.message;
      return res.status(500).json(responseData);
    }
  };

module.exports.update_reward = async (req, res) => {
  let responseData = {};
  try {
   
    const { id,rewardName, rewardCoins, day } = req.body;


    // Find the reward by ID
    const existingReward = await reward.findOne({
      where: { id: id }
    });

    if (!existingReward) {
      responseData.msg = "Reward not found";
      return res.status(404).json(responseData);
    }

    // Update the reward
    await existingReward.update({
      rewardName: rewardName,
      reward: rewardCoins,
      day: day,
      added_by: req.user.id,
    });

    responseData.msg = "Reward updated successfully";
    responseData.data = existingReward;
    return res.status(200).json(responseData);
  } catch (error) {
    responseData.msg = error.message;
    return res.status(500).json(responseData);
  }
};

module.exports.all_reward = async (req, res) => {
    let responseData = {};
    try {
        let data = await reward.findAll();

        if (data.length === 0) {
            responseData.msg = "No rewards found";
            return res.status(404).json(responseData);
        }

        responseData.msg = "All rewards fetched successfully";
        responseData.data = data;
        return res.status(200).json(responseData);
    } catch (error) {
        responseData.msg = error.message;
        responseData.success = false;
        return res.status(500).json(responseData);
    }
};

module.exports.delete_reward = async (req, res) => {
    let responseData = {};
    try {
        const rewardId = req.params.id;

      
        const existingReward = await reward.findOne({
            where: { id: rewardId }
        });

        if (!existingReward) {
            responseData.msg = "Reward not found";
            return res.status(404).json(responseData);
        }

        // Delete the reward
        await existingReward.destroy();

        responseData.msg = "Reward deleted successfully";
        return res.status(200).json(responseData);
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};
module.exports.get_reward_by_id = async (req, res) => {
    let responseData = {};
    try {
        const rewardId = req.params.id;

        // Find the reward by ID
        const foundReward = await reward.findByPk(rewardId);

        if (!foundReward) {
            responseData.msg = "Reward not found";
            return res.status(404).json(responseData);
        }

        responseData.msg = "Reward found";
        responseData.data = foundReward;
        return res.status(200).json(responseData);
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};

module.exports.addBankDetails = async (req, res) => {
    try {
      const { bankName, bankAccountNumber, fullName } = req.body;
  
      // Create a new bank detail entry
      const data = await admin_bank_Details.create({
        bankName,
        bankAccountNumber,
        fullName
      });
  
      return res.status(200).json({ message: "Bank details added successfully", data });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  module.exports.getBankDetails = async (req, res) => {
    try {
      const data = await admin_bank_Details.findAll();
  
      return res.status(200).json({ message: " all Bank details fetch successfully", data });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  module.exports.getBankDetailsById = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Find the bank detail entry by ID
      const bankDetail = await admin_bank_Details.findByPk(id);
      if (!bankDetail) {
        return res.status(404).json({ message: "Bank details not found" });
      }
  
      return res.status(200).json({ data: bankDetail });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  module.exports.updateBankDetails = async (req, res) => {
    try {
     
      const { id,bankName, bankAccountNumber, fullName } = req.body;
  
      // Find the bank detail entry by ID
      const bankDetail = await admin_bank_Details.findByPk(id);
      if (!bankDetail) {
        return res.status(404).json({ message: "Bank details not found" });
      }
  
     // Update the bank detail entry
await admin_bank_Details.update({
    bankName,
    bankAccountNumber,
    fullName
  }, {
    where: { id: id }
  });
  
      return res.status(200).json({ message: "Bank details updated successfully", data: bankDetail });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  // Create a new withdrawls_fee
  module.exports.add_withdrawls_fee = async (req, res) => {
    try {
        const { withdrawl_rate, min_withdrawl, max_withdrawl } = req.body;

        // Add the new withdrawls_fee
        const data = await withdrawls_fee.create({ withdrawl_rate, min_withdrawl, max_withdrawl });
        return res.status(200).json({ message: "withdrawls_fee added successfully", data });

    } catch (error) {
        console.error(`Error adding withdrawls_fee: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};
module.exports.getAllWithdrawlsFees = async (req, res) => {
    try {
        const data = await withdrawls_fee.findAll();
        return res.status(200).json({ message: "withdrawls_fees retrieved successfully", data });

    } catch (error) {
        console.error(`Error retrieving withdrawls_fees: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};

module.exports.getWithdrawlsFeeById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await withdrawls_fee.findByPk(id);

        if (!data) {
            return res.status(404).json({ message: "withdrawls_fee not found" });
        }

        return res.status(200).json({ message: "withdrawls_fee retrieved successfully", data });

    } catch (error) {
        console.error(`Error retrieving withdrawls_fee: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};

module.exports.updateWithdrawlsFee = async (req, res) => {
    try {
        
        const { id,withdrawl_rate, min_withdrawl, max_withdrawl } = req.body;
        const data = await withdrawls_fee.findByPk(id);

        if (!data) {
            return res.status(404).json({ message: "withdrawls_fee not found" });
        }

        data.withdrawl_rate = withdrawl_rate;
        data.min_withdrawl = min_withdrawl;
        data.max_withdrawl = max_withdrawl;
        await data.save();

        return res.status(200).json({ message: "withdrawls_fee updated successfully", data });

    } catch (error) {
        console.error(`Error updating withdrawls_fee: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};




 























