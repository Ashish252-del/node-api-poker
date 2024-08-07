const db = require("../helpers/db");
const { sequelize } = require('../models')

get_all_Rimmy_Games = async (query) => {
    try {
        let Id = await db.game_category.findOne({ attributes: ['game_category_id'], where: { type: 'rummy' }, raw: true })
        let gameJsonData = await db.games.findAll({ attributes: ['game_json_data', 'game_id'], where: { game_category_id: Id.game_category_id, game_status: '1' }, raw: true })
        //   console.log(gameJsonData);
        return (gameJsonData);
        // return sequelize.query('Select rummy_games.id as gameId, rummy_code , Name , Max_Player , Min_Chips , noOfDecks , Comission , Points from rummy_games rummy_games join rummies on rummy_Id = rummies.id'
        // ,{type: sequelize.QueryTypes.SELECT})

        // return db.rummy_game.findAll({
        //     attributes:[['id','gameId'],'rummy_code'],
        //     include:[{
        //     model:db.rummy,
        //     attributes:['Name','Max_Player','Min_Chips','Points','noOfDecks','Comission']
        // }]});  
    } catch (error) {
        console.log('error is in get_all_Rimmy_Games service ', error);
    }

}
json_data = async (query) => {
    try {
        let Id = await db.game_category.findOne({ attributes: ['game_category_id'], where: { type: 'rummy' }, raw: true })
        let gameJsonData = await db.games.findAll({ attributes: ['game_json_data'], where: { game_category_id: Id.game_category_id, game_status: '1' }, raw: true })
        console.log('json game is ', gameJsonData);
        return (gameJsonData);
    } catch (error) {
        console.log('erro in json_data service', error);
    }
}

save_rummy_history = async (arr) => {
    try {
        await db.game_history.bulkCreate(arr);
    } catch (error) {
        console.log('error in save_rummy_history service', error);
    }
}

get_game_type = async (query) => {
    let type_id = await db.games.findOne({ attributes: ['game_type_id'], where: { game_id: query.type }, raw: true })
    return type_id;
}

get_gameBygameId = async (query) => {
    let gameJsonData = await db.games.findOne(query);
    return gameJsonData;
}

getUserWalletById = (query) => {
    return db.user_wallet.findOne({ where: query });
}

getTourny = async (query) => {
    let tourneyData = await db.tournaments.findAll(query);
    return tourneyData;
}

registerPlayerForTournament = async (query) => {
    try {
        let tourneyData = await db.tourney_registered_users.create(query);
        return tourneyData;
    } catch (error) {
        console.log('error in registerPlayerForTournament service', error);
    }
}

getRegisteredPlayersForTournament = async (query) => {
    try {
        let tourneyData = await db.tourney_registered_users.findAll(query);
        return tourneyData;
    } catch (error) {
        console.log('error in getRegisteredPlayersForTournament service', error);
    }
}



updateRegisteredPlayersForTournament = async (data, query) => {
    try {
        let tourneyData = await db.tourney_registered_users.update(data, {
            where: query
        });
        return tourneyData;
    } catch (error) {
        console.log('error in updateRegisteredPlayersForTournament service', error);
    }
}

module.exports = {
    updateRegisteredPlayersForTournament,
    getRegisteredPlayersForTournament,
    registerPlayerForTournament,
    get_all_Rimmy_Games,
    json_data,
    save_rummy_history,
    get_game_type,
    get_gameBygameId,
    getUserWalletById,
    getTourny
}
