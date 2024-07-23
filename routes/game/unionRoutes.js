const routes = require("express").Router();
const authenticate = require("../../middleware/auth")
const {postUnion, validate} = require("../auth/validator");
const unionController = require("../../controllers/unionController");
const clubController = require("../../controllers/clubController");
module.exports = () => {
    routes.post("/create", authenticate,postUnion(), validate, unionController.createUnion );
    routes.post("/update", authenticate,postUnion(), validate, unionController.updateUnion);
    routes.get("/detail", authenticate, unionController.getUnionById);
    return routes;
}