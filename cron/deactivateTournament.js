const cron = require('node-cron');
const  adminService = require("../services/adminService");
const  pokerService = require("../services/pokerService");
const {Op, fn, col} = require("sequelize");
const moment = require('moment');
module.exports =  cron.schedule('* * * * *', async () => {
    try{
        let currentDate = new Date();
        currentDate = moment(currentDate).format('YYYY-MM-DD')
        let game = await adminService.getAllGameList({is_tournament: true, game_status:{[Op.or]: ['0','1']}});
        if (!game) {
            console.log('Game not found');
        }
        let updateData = [];
        game.map(async (element, i) => {
            let roomAttributes = element.game_json_data;
            let roomAttributesObj = JSON.parse(roomAttributes);
            let tournament_start_date = new Date(roomAttributesObj.start_date);
            tournament_start_date = moment(tournament_start_date).format('YYYY-MM-DD')
            //console.log(tournament_start_date);
            if (currentDate > tournament_start_date) {
                let gameStatus = {
                    game_id: element.game_id,
                    game_status: "2"
                }
                updateData.push(gameStatus)
            }
        })

        await pokerService.bulkUpdate(updateData, {
            updateOnDuplicate: ["game_status"],
        });
    }catch (error) {
        console.log(error);
    }
});

