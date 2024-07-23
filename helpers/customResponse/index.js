module.exports = {
    /**
     * Helper Method to handle API success Response
     */
    success: (res, body) => {
        return res.status(200).send({
            message: body.msg,
            statusCode: 200,
            status: true,
            allModules: body.modules, 
            data: body.data
        });
    },

    successResponse: ( res, data) => {
        return res.send({
            code:200,
            success: true,
            data

        });
    },

    successWithType: (res, body) => {
        return res.status(200).send({
            message: body.msg,
            statusCode: 200,
            status: true,
            type: body.type,
            data: body.data
        });
    },
    /**
     * Helper Method to handle API error Response
     */
    error: (res, body, statusCode) => {
        return res.status(statusCode).send({
            message: body.msg,
            statusCode: statusCode,
            status: false,
            data: body.data
        });
    },

    errorType: (res, body, statusCode) => {
        return res.status(statusCode).send({
            message: body.msg,
            statusCode: statusCode,
            status: false,
            type: body.type,
            data: body.data
        });
    },
    /**
     * Helper Method to handle API unauthorize Response
     */
    unAuthorize: (res, body) => {
        return res.status(401).send({
            statusCode: 401,
            success: false,
            message: body.msg
        });
    },

    errorResponse: (
        req,
        res,
        errorMessage,
        code,
        error = {}
    ) =>{
        res.status(code).json({
            code: code,
            errorMessage:errorMessage,
            error,
            data: null,
            success: false,
        });
    }
};
