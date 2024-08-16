const routes = require('express').Router();
const gameController = require('../../../controllers/pool_controller/gameController');
const authenticate = require('../../../middleware/auth');
const { upload } = require('../../../utils/multer');

module.exports = () => {

    routes.get('/get-game-list', gameController.getAllGameList);
    routes.get('/get-game-details/:id', gameController.getGameDetailsById);
    routes.post('/add-game', gameController.addGame);
    routes.post('/update-game/:id', gameController.updateGame);
    routes.delete('/delete-game/:id', gameController.deleteGame);
    return routes;
}


