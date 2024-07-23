const cron = require('node-cron');
const pokerService = require("../services/pokerService");
const userService = require("../services/userService");
const clubService = require("../services/clubService");

module.exports = cron.schedule("0 * * * *", async () => {
    try {
        let locked_balance_histories = await userService.getLockedBalanceHistory({
            status: "settled",
            is_balance_unlocked: false,
        });
        console.log("locked_balance_histories in cron", locked_balance_histories);
        for (const history of locked_balance_histories) {
            const dbDate = new Date(history.updatedAt + "");
            const currentDate = new Date();
            // Calculate the difference in milliseconds
            const diffInMs = currentDate - dbDate;
            // Calculate the difference in hours
            const diffInHours = diffInMs / (1000 * 60 * 60);
            let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
                game_table_id: history.table_id,
            });
            let gameModalData = await pokerService.getGameModalDataByQuery({
                game_id: pokerTable.game_id,
            });
            let roomAttributes = gameModalData.game_json_data;
            let roomAttributesObj = JSON.parse(roomAttributes);
            if (diffInHours >= roomAttributesObj.game_timmer) {
                if(gameModalData.club_id!=0){
                    let lockedAmount = parseFloat(history.locked_club_amount);
                    let userWallet = await clubService.getJoinClubByClubId({where: {user_id: history.user_id, clubId: gameModalData.club_id}, raw: true});

                    if (!userWallet) {
                        throw Error("Wallet does not exist");
                    }
                    let lockBalance = parseFloat(userWallet.locked_amount);
                    if (lockedAmount > lockBalance) {
                        throw Error("Locked amount is greater than balance");
                    }

                    let newLockBalance = lockBalance - lockedAmount;
                    let profitLoss = lockedAmount - parseFloat(history.buy_in_club_amount);
                    let oldWinAmount = userWallet.win_amount;
                    if (!oldWinAmount) {
                        oldWinAmount = 0;
                    }

                    await clubService.updateJoinClub({
                        chips: parseFloat(userWallet.chips) + parseFloat(profitLoss) + parseFloat(history.buy_in_club_amount),
                        locked_amount: newLockBalance
                    }, {where:{registeration_Id: userWallet.registeration_Id}});

                    await userService.updateLockedBalanceHistory(
                        {is_balance_unlocked: true},
                        {locked_balance_history_id: history.locked_balance_history_id}
                    );
                }else{
                    let lockedAmount = parseFloat(history.locked_amount);
                    let userWallet = await userService.getUserWalletDetailsByQuery({
                        user_id: history.user_id,
                    });
                    if (!userWallet) {
                        throw Error("Wallet does not exist");
                    }
                    let lockBalance = parseFloat(userWallet.locked_amount);
                    if (lockedAmount > lockBalance) {
                        throw Error("Locked amount is greater than balance");
                    }

                    let newLockBalance = lockBalance - lockedAmount;
                    let profitLoss = lockedAmount - parseFloat(history.buy_in_amount);
                    let oldWinAmount = userWallet.win_amount;
                    if (!oldWinAmount) {
                        oldWinAmount = 0;
                    }
                    await userService.updateUserWallet(
                        {
                            win_amount: oldWinAmount + parseFloat("" + profitLoss),
                            real_amount:
                                parseFloat(userWallet.real_amount) +
                                parseFloat(history.buy_in_amount),
                            locked_amount: newLockBalance,
                        },
                        {user_wallet_id: userWallet.user_wallet_id}
                    );
                    await userService.updateLockedBalanceHistory(
                        {is_balance_unlocked: true},
                        {locked_balance_history_id: history.locked_balance_history_id}
                    );
                }

            }

        }
    } catch (error) {
        console.log(error);
    }
});

