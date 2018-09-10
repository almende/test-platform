'use strict';

const Router = require('express');

const getDeploymentRoutes = (app) => {
    const router = new Router();

    router
        .get('/', (req, res) => {

        });

    app.use('/deploy', router);
};

module.exports = getDeploymentRoutes;
