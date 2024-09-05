const db = require('../helpers/db');

const addTournament = (tournamentObj) => {
    return db.pool_tournaments.create(tournamentObj);
}

const getTournamentDetailsById = (query) => {
    return db.pool_tournaments.findOne(query);
}

const getAllTournamentList = (query) => {
    return db.pool_tournaments.findAll({
        where: query
    });
}

const updateTournament = (data, query) => {
    return db.pool_tournaments.update(
        data,
         query 
    );
}

const deleteTournament = (query) => {
    return db.pool_tournaments.destroy(
        { where: query }
    );
}

const endTournament = (tournamentId, tournamentObj) => {
    return db.pool_tournaments.update(
        tournamentObj,
        { where: { tournament_id: tournamentId } }
    );
}

const createTournamentTable = (tournamentTableObj) => {
    return db.pool_tournament_tables.create(tournamentTableObj);
}

const getTournamentTableDetailsById = (query) => {
    return db.pool_tournament_tables.findOne({
        where: {
            table_id: query,
        }
    });
}

const deleteTournamentTable = (tableId) => {
    return db.pool_tournament_tables.destroy(
        {
            where: {
                tournament_table_id: tableId,
            }
        }
    );
}

const getTournamentTableByStatus = (tournamentTableId, query) => {
    return db.pool_tournament_tables.findOne({
        where: {
            tournament_table_status: query,
            tournament_table_id: tournamentTableId
        }
    });
}

const getTournamentTableByStatusAndNumber = (tournamentTableId, tournamenTableNumber, query) => {
    return db.pool_tournament_tables.findOne({
        where: {
            tournament_table_status: query,
            tournament_table_id: tournamentTableId,
            tournament_table_number: tournamenTableNumber
        }
    });
}

const findTournamentTableByStatusAndId = (tournamentId, query) => {
    return db.pool_tournament_tables.findOne({
        where: {
            tournament_table_status: query,
            tournament_table_id: tournamentId
        }
    });
}

const getTournamentTableById = (tableId) => {
    return db.pool_tournament_tables.findOne({
        where: {
            table_id: tableId,
        }
    });
}

const updatePlayerToTournamentTableAndUpdateStatus = (tableId, playerIds, status) => {
    return db.pool_tournament_tables.update(
        {
            players: `${playerIds}`,
            tournament_table_status: status
        },
        {
            where: {
                table_id: tableId,
            }
        }
    );
}

const getTournamentByTableIdAndTournamentTableId = (tableId, tournamentTableId) => {
    return db.pool_tournament_tables.findOne({
        where: {
            table_id: tableId,
            tournament_table_id: tournamentTableId
        }
    });
}

const updateTournamentTableNumber = (tableId, tournamentTableNumber) => {
    return db.pool_tournament_tables.update(
        {
            tournament_table_number: tournamentTableNumber
        },
        {
            where: {
                table_id: tableId
            }
        }
    );
}

const updateDisconnectedPlayerCount = (tableId, playerDisconnectedCount) => {
    return db.pool_tournament_tables.update(
        {
            player_disconnected_count: playerDisconnectedCount
        },
        {
            where: {
                table_id: tableId
            }
        }
    );
}

const updateWinnerDetailsInTable = (tableId, winnerDetails) => { 
    return db.pool_tournament_tables.update(
        {
            winner: winnerDetails
        },
        {
            where: {
                table_id: tableId
            }
        }
    );
}   

const getAllRecordsByTournamentTableId = (tournamentTableId) => {
    return db.pool_tournament_tables.findAll({
        where: {
            tournament_table_id: tournamentTableId
        }
    });
}

const getTournamentByTournamentTableId = (tournamentTableId) => {
    return db.pool_tournament_tables.findOne({
        where: {
            tournament_table_id: tournamentTableId
        }
    });
}

module.exports = {
    addTournament,
    findTournamentTableByStatusAndId,
    endTournament,
    updateWinnerDetailsInTable,
    getTournamentTableByStatus,
    getTournamentDetailsById,
    getAllTournamentList,
    updateTournamentTableNumber,
    updateTournament,
    getTournamentTableByStatusAndNumber,
    deleteTournament,
    createTournamentTable,
    getTournamentByTournamentTableId,
    getAllRecordsByTournamentTableId,
    getTournamentTableDetailsById,
    deleteTournamentTable,
    getTournamentByTableIdAndTournamentTableId,
    getTournamentTableById,
    updatePlayerToTournamentTableAndUpdateStatus,
    updateDisconnectedPlayerCount
}
