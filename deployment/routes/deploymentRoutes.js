'use strict';

const Router = require('express');

const getDeploymentRoutes = (app) => {
    const router = new Router();


    app.use('/deploy', router);
};

module.exports = getDeploymentRoutes;
