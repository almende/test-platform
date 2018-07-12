'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const server = new express();

// register JSON parser middlewear
server.use(bodyParser.json());

require('./routes/assetRoutes')(server);


global.statsHistory = {
    "keepInterval": 60000
};


server.listen(9000, () => {

    /* eslint-disable */
    console.log('Server is up!');
});
