const db = require("../helpers/db");
const { Op, Sequelize } = require("sequelize");

const getAllGameList = () => {
    return db.pool_games.findAll({
        where: {
            game_status: "1"
        }
    });
}

const getGameDetailsById = (query) => {
    console.log("query",query);
    return db.pool_games.findOne(query);
}

const addGame = (gameObj) => {
    return db.pool_games.create(gameObj);
}

const updateGame = (data, query) => {
    return db.pool_games.update(
        data,
        query
    );
}

const deleteGame = (query) => {
    return db.pool_games.destroy(query);
}

const createGameTable = (gameTableObj) => {
    return db.pool_game_tables.create(gameTableObj);
}

const getGameTableDetailsById = (query) => {
    return db.pool_game_tables.findOne({
        where: {
            game_table_id: query,
        }
    });
}

const deleteGameTable = (tableId) => {
    return db.pool_game_tables.destroy(
        {
            where: {
                game_table_id: tableId,
            }
        }
    );
}

const updateGameTable = (data, query) => {
    return db.pool_game_tables.update(
        data,
        { where: query }
    );
}

const getTableByGameId = (query) => {
    return db.pool_game_tables.findAll({
        where: { query }
    });
}

const createTableRound = (data) => {
    return db.pool_table_round.create(data);
}


const getTablebyStatus = (query, gameId) => {
    return db.pool_game_tables.findOne({
        where: {
            game_table_status: query,
            game_id: gameId
        }
    });
}


const updatePlayerToGameTableAndUpdateStatus = (tableId, playerIds, status) => {
    return db.pool_game_tables.update(
        {
            players: `${playerIds}`,
            game_table_status: status
        },
        {
            where: {
                game_table_id: tableId,
            }
        }
    );
}

const findPlayerInGameTable = (tableId, playerId) => {
    return db.pool_game_tables.findOne({
        where: {
            game_table_id: tableId,
            player_id: playerId
        }
    });
}

const removePlayerFromTable = (tableId, playerId) => {
    return db.pool_game_tables.update(
        { player_id: null },
        {
            where: {
                game_table_id: tableId,
                player_id: playerId
            }
        }
    );
}

const getTableById = (tableId) => {
    return db.pool_game_tables.findOne({
        where: {
            game_table_id: tableId,
        }
    });
}

const setTableStatusAsLeave = (tableId) => {
    return db.pool_game_tables.update(
        { game_table_status: "Leave" },
        {
            where: {
                game_table_id: tableId,
            }
        }
    );
}


module.exports = {
    getAllGameList,
    getGameDetailsById,
    addGame,
    updateGame,
    deleteGame,
    createGameTable,
    getGameTableDetailsById,
    deleteGameTable,
    updateGameTable,
    getTableByGameId,
    findPlayerInGameTable,
    createTableRound,
    getTableById,
    getTablebyStatus,
    updatePlayerToGameTableAndUpdateStatus,
    removePlayerFromTable,
    setTableStatusAsLeave
}
