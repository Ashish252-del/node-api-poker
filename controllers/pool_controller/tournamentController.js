const poolTournamentServices = require('../../services/poolTournamentServices');

const addTournament = async (req, res) => {
    try {
        const tournamentObj = req.body;
        console.log("tournamentObj",tournamentObj);
        const tournamentDetails = await poolTournamentServices.addTournament(tournamentObj);
        return res.status(200).json({
            status: true,
            data: tournamentDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const getTournamentDetailsById = async (req, res) => {
    try {
        const query = {
            where: {
                tournament_id: req.params.id
            }
        }
        const tournamentDetails = await poolTournamentServices.getTournamentDetailsById(query);
        if (!tournamentDetails) {
            return res.status(404).json({
                status: false,
                msg: 'Tournament not found'
            });
        }
        return res.status(200).json({
            status: true,
            data: tournamentDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const getAllTournamentList = async (req, res) => {
    try {
        const query = {}
        const tournamentList = await poolTournamentServices.getAllTournamentList(query);
        return res.status(200).json({
            status: true,
            data: tournamentList
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const updateTournament = async (req, res) => {
    try {
        const tournamentObj = req.body.tournamentObj;
        const query = {
            where: {
                tournament_id: req.params.id
            }
        }
        const tournamentDetails = await poolTournamentServices.updateTournament(tournamentObj, query);
        return res.status(200).json({
            status: true,
            data: tournamentDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const deleteTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id
        const tournamentDetails = await poolTournamentServices.deleteTournament({ tournament_id: tournamentId });
        return res.status(200).json({
            status: true,
            data: tournamentDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const endTournament = async (req, res) => {
    try {
        let tournamentId=req.params.id
        const tournamentObj = await poolTournamentServices.getTournamentDetailsById({ where: {tournament_id:tournamentId } });
        if (!tournamentObj) {
            return res.status(404).json({
                status: false,
                msg: 'Tournament not found'
            });
        }
        const tournament = poolTournamentServices.endTournament(tournamentId, { ending_time: new Date() });
        return res.status(200).json({
            status: true,
            data: tournament
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

module.exports = {
    addTournament,
    endTournament,
    getTournamentDetailsById,
    getAllTournamentList,
    updateTournament,
    deleteTournament
}
