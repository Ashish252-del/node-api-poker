const routes = require('express').Router();
const tournamentController = require('../../../controllers/pool_controller/tournamentController');
const authenticate = require('../../../middleware/auth');


module.exports = () => {


    routes.get('/get-tournament-list', tournamentController.getAllTournamentList);
    routes.get('/get-tournament-details/:id', tournamentController.getTournamentDetailsById);
    routes.post('/add-tournament', tournamentController.addTournament);
    routes.post('/update-tournament/:id', tournamentController.updateTournament);
    routes.delete('/delete-tournament/:id', tournamentController.deleteTournament);
    routes.post('/end-tournament/:id', tournamentController.endTournament);

    return routes;
}


