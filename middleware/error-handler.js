const responseHelper = require('../helpers/customResponse');
module.exports = errorHandler;
function errorHandler(err, req, res, next) {
    let responseData = {}
    switch (true) {
        case typeof err === 'string':
            // custom application error
            const is404 = err.toLowerCase().endsWith('not found');
            const statusCode = is404 ? 404 : 400;
            responseData.msg = err;
            return responseHelper.error(res,responseData,statusCode);
        case err.name === 'UnauthorizedError':
            // jwt authentication error
            responseData.msg = 'Unauthorized';
            return responseHelper.unAuthorize(res,responseData);
        default:
            responseData.msg = err.message;
            return responseHelper.error(res,responseData,500);
    }
}
