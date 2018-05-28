'use strict';

const Router = require('express');
const personRepo = require('../repo/personRepository');

const getPersonRoutes = (app) => {
    const router = new Router();

    router
        .get('/', (req, res) => {
            console.log("Got call on top level", req);
            res.send("OK!");
        });

    app.use('/', router);
};

module.exports = getPersonRoutes;