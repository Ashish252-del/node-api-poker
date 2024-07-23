const cron = require('node-cron');
const userService = require("../services/userService");

module.exports = cron.schedule("0 */1 * * *", async () => {
  try {
    const activeTableIDs = await userService.getDocumentsByRawQuery(`SELECT game_table_id FROM game_tables gt WHERE game_table_status IN ('Full', 'Active')`);

    const tableHistories = await userService.getDocumentsByRawQuery(`SELECT CONCAT('[', GROUP_CONCAT(JSON_OBJECT("hand_histories", tr.hand_histories)),']') as TableHistory FROM table_rounds tr WHERE tr.game_table_id IN (${activeTableIDs.map(at => at.game_table_id).join(',')}) AND tr.table_round_status ='Completed' AND tr.createdAt >= now()-interval 3 month GROUP by tr.game_table_id ORDER BY tr.createdAt ASC`);

    if (tableHistories.length) {
      let userStats = {}
      for (let index = 0; index < tableHistories.length; index++) {
        const { TableHistory } = tableHistories[index];

        if (!TableHistory) {
          continue;
        }
        userStats = evaluateUserStats(JSON.parse(TableHistory), userStats);
      }

      // Calculate percentages
      for (const userId in userStats) {
        const stats = userStats[userId];
        userStats[userId].VPIP = (stats.VPIP / stats.handsPlayed) * 100;
        userStats[userId].PFR = (stats.PFR / stats.handsPlayed) * 100;
        userStats[userId].threeBet = (stats.threeBet / stats.handsPlayed) * 100;
        userStats[userId].foldToThreeBet = (stats.foldToThreeBet / stats.handsPlayed) * 100;
        userStats[userId].cBet = (stats.cBet / stats.handsPlayed) * 100;
        userStats[userId].foldToCBet = (stats.foldToCBet / stats.handsPlayed) * 100;
        userStats[userId].steal = (stats.steal / stats.handsPlayed) * 100;
        userStats[userId].checkRaise = (stats.checkRaise / stats.handsPlayed) * 100;

        delete userStats[userId].totalPreFlopCalls;
      }

      // save profile levels to database
      for (const [id, stats] of Object.entries(userStats)) {
        await userService.updateUserByQuery({ user_level: JSON.stringify(stats) }, { user_id: id });
      }
    }
  } catch (error) {
    console.log(error);
  }
});


// Calculate statistics for each user
function evaluateUserStats(table_history, userStats) {
  table_history.forEach(record => {
    const hand_history = JSON.parse(record.hand_histories);
    for (const round of hand_history) {
      const playerActions = {};
      let preFlopRaise = false;
      let preFlopAggressor = false;
      let preFlop3Bet = false;

      for (const bet of round.userBetRecords) {
        const { userId, action } = bet;
        if (!userStats[userId]) {
          userStats[userId] = {
            VPIP: 0, PFR: 0, threeBet: 0, foldToThreeBet: 0, cBet: 0, foldToCBet: 0, steal: 0, checkRaise: 0,
            handsPlayed: 0, totalPreFlopCalls: 0
          };
        }

        if (!playerActions[userId]) {
          playerActions[userId] = [];
        }

        playerActions[userId].push(action);

        if (round.bettingRound === 'pre-flop') {
          userStats[userId].handsPlayed++;

          if (action === 'call' || action === 'raise') {
            userStats[userId].VPIP++;
          }

          if (action === 'call') {
            userStats[userId].totalPreFlopCalls++;
          }

          if (preFlop3Bet && bet.action === 'fold') {
            userStats[userId].foldToThreeBet++;
          }

          if (action === 'raise') {
            userStats[userId].PFR++;

            if (userStats[userId].PFR > 1) {
              preFlopAggressor = true;
            }

            if (preFlopRaise) {
              userStats[userId].threeBet++;
              preFlop3Bet = true;
            }

            preFlopRaise = true;
          }

          if (action === 'raise' && !playerActions[userId].includes('bb') && !playerActions[userId].includes('sb')) {
            // Check if the raise is a steal attempt
            const previousActions = userBetRecords.slice(0, userBetRecords.indexOf(record));
            const allFoldsExceptBlinds = previousActions.every(prevRecord =>
              prevRecord.action === 'fold' || prevRecord.action === 'bb' || prevRecord.action === 'sb'
            );

            if (allFoldsExceptBlinds) {
              userStats[userId].steal++;
            }
          }
        }

        if (round.bettingRound !== 'pre-flop') {
          if (action === 'raise' && preFlopAggressor) {
            userStats[userId].cBet++;
          }

          if (action === 'fold' && preFlopAggressor) {
            userStats[userId].foldToCBet++;
          }

          // Check/Raise: Player checks and then raises
          if (action === 'raise' && actionAfterCheck) {
            userStats[userId].checkRaise++;
          }
        }


        // Track if the player checked in the current round
        if (action === 'check') {
          actionAfterCheck = true;
        } else {
          actionAfterCheck = false;
        }
      }
    }
  });

  return userStats;
};


