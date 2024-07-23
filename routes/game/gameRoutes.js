const routes = require("express").Router();
const authenticate = require("../../middleware/auth")
module.exports = () => {
    return routes;
}

